import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AuthzError, requireMember } from "@/lib/authz";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      group: true,
      participations: { include: { user: true } },
      payments: { include: { user: true } },
    },
  });
  if (!match) return NextResponse.json({ error: "Không tìm thấy trận đấu" }, { status: 404 });

  try {
    await requireMember(match.groupId, session.user.id);
  } catch (e) {
    if (e instanceof AuthzError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }

  return NextResponse.json({ match });
}
