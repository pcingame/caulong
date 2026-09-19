import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AuthzError, requireAdmin } from "@/lib/authz";
import { zodFirstError } from "@/lib/api-error";
import { getEffectiveStatus } from "@/lib/match-status";
import { moneyAmountSchema } from "@/lib/money";

const estimateSchema = z.object({
  estimatedCourtFee: moneyAmountSchema,
  estimatedWaterFee: moneyAmountSchema,
});

/** Manual override for one specific match's forecast — the auto-computed
 * average (see lib/estimate.ts) is just a starting point; admin may know
 * this week's court price differs. Only allowed before the match is
 * finalized, since after that the actual cost fields are authoritative. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = estimateSchema.safeParse(await request.json());
  if (!body.success) return NextResponse.json({ error: zodFirstError(body.error) }, { status: 400 });

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { participations: true },
  });
  if (!match) return NextResponse.json({ error: "Không tìm thấy trận đấu" }, { status: 404 });

  try {
    await requireAdmin(match.groupId, session.user.id);
  } catch (e) {
    if (e instanceof AuthzError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }

  const status = getEffectiveStatus(match);
  if (status === "FINALIZED" || status === "SETTLED") {
    return NextResponse.json(
      { error: "Trận đã chốt sổ, không thể sửa chi phí dự kiến nữa" },
      { status: 409 }
    );
  }

  const goingCount = Math.max(
    match.participations.filter((p) => p.rsvpStatus === "GOING").length,
    1
  );
  const { estimatedCourtFee, estimatedWaterFee } = body.data;
  const estimatedPerPerson = Math.ceil((estimatedCourtFee + estimatedWaterFee) / goingCount);

  const updated = await prisma.match.update({
    where: { id: matchId },
    data: { estimatedCourtFee, estimatedWaterFee, estimatedPerPerson },
  });

  return NextResponse.json({ match: updated });
}
