import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AuthzError, getLeaveBlockers, requireMember } from "@/lib/authz";
import { clearFutureParticipation } from "@/lib/membership-cleanup";

/** Self-leave (any role, including the creator) — blocked while any match
 * debt is outstanding (member cannot leave past match time until dues are
 * settled), and additionally blocked for SUPER_ADMIN if they're the only
 * admin left (the group would be left with no one able to manage it or
 * delete it). Leaving only ever changes this person's Membership row —
 * the Group and all its matches/payments/history are never touched. */
export async function POST(request: Request, { params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let membership;
  try {
    membership = await requireMember(groupId, session.user.id);
  } catch (e) {
    if (e instanceof AuthzError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }

  if (membership.role === "SUPER_ADMIN") {
    const otherAdmin = await prisma.membership.findFirst({
      where: {
        groupId,
        status: "ACTIVE",
        userId: { not: session.user.id },
        role: { in: ["ADMIN", "SUPER_ADMIN"] },
      },
    });
    if (!otherAdmin) {
      return NextResponse.json(
        {
          error:
            "Bạn là quản trị viên duy nhất của nhóm. Hãy cấp quyền Admin cho 1 thành viên khác (trong Cài đặt nhóm) trước khi rời nhóm.",
        },
        { status: 409 }
      );
    }
  }

  const blockers = await getLeaveBlockers(groupId, session.user.id);
  if (blockers.blocked) {
    return NextResponse.json(
      {
        error: "Bạn còn nghĩa vụ chưa hoàn tất, không thể rời nhóm",
        unfinalizedMatches: blockers.unfinalizedMatches,
        unpaidPayments: blockers.unpaidPayments,
      },
      { status: 409 }
    );
  }

  await prisma.membership.update({
    where: { groupId_userId: { groupId, userId: session.user.id } },
    data: { status: "LEFT", leftAt: new Date() },
  });

  await clearFutureParticipation(groupId, session.user.id);

  return NextResponse.json({ ok: true });
}
