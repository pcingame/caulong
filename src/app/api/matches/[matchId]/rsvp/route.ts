import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AuthzError, requireMember } from "@/lib/authz";
import { zodFirstError } from "@/lib/api-error";
import { getEffectiveStatus } from "@/lib/match-status";
import { recomputeEstimatedPerPerson } from "@/lib/estimate";

const rsvpSchema = z.object({
  rsvpStatus: z.enum(["GOING", "MAYBE", "NOT_GOING"]),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = rsvpSchema.safeParse(await request.json());
  if (!body.success) return NextResponse.json({ error: zodFirstError(body.error) }, { status: 400 });

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) return NextResponse.json({ error: "Không tìm thấy trận đấu" }, { status: 404 });

  try {
    await requireMember(match.groupId, session.user.id);
  } catch (e) {
    if (e instanceof AuthzError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }

  if (getEffectiveStatus(match) !== "UPCOMING") {
    return NextResponse.json(
      { error: "Trận đã bắt đầu hoặc đã chốt sổ, không thể đổi RSVP nữa" },
      { status: 409 }
    );
  }

  const participation = await prisma.participation.upsert({
    where: { matchId_userId: { matchId, userId: session.user.id } },
    create: { matchId, userId: session.user.id, rsvpStatus: body.data.rsvpStatus },
    update: { rsvpStatus: body.data.rsvpStatus },
  });

  await recomputeEstimatedPerPerson(matchId);

  return NextResponse.json({ participation });
}
