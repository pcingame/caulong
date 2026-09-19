import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AuthzError, getLeaveBlockers, requireAdmin, requireSuperAdmin } from "@/lib/authz";
import { clearFutureParticipation } from "@/lib/membership-cleanup";
import { zodFirstError } from "@/lib/api-error";

/** Admin force-remove — allowed even with outstanding debt, but audited loudly. */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ groupId: string; userId: string }> }
) {
  const { groupId, userId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await requireAdmin(groupId, session.user.id);
  } catch (e) {
    if (e instanceof AuthzError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }

  const blockers = await getLeaveBlockers(groupId, userId);

  await prisma.membership.update({
    where: { groupId_userId: { groupId, userId } },
    data: { status: "REMOVED", leftAt: new Date() },
  });

  await clearFutureParticipation(groupId, userId);

  await prisma.auditLog.create({
    data: {
      entity: "Membership",
      entityId: `${groupId}:${userId}`,
      action: blockers.blocked ? "FORCE_REMOVE_WITH_DEBT" : "REMOVE_MEMBER",
      actorId: session.user.id,
      diff: blockers.blocked
        ? {
            unfinalizedMatches: blockers.unfinalizedMatches,
            unpaidPayments: blockers.unpaidPayments,
          }
        : undefined,
    },
  });

  return NextResponse.json({ ok: true, hadOutstandingDebt: blockers.blocked });
}

const updateRoleSchema = z.object({
  role: z.enum(["ADMIN", "MEMBER"]),
});

/** Only the group creator can promote/demote — needed so a SUPER_ADMIN can
 * hand off admin duties to someone else before leaving the group. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ groupId: string; userId: string }> }
) {
  const { groupId, userId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = updateRoleSchema.safeParse(await request.json());
  if (!body.success) return NextResponse.json({ error: zodFirstError(body.error) }, { status: 400 });

  try {
    await requireSuperAdmin(groupId, session.user.id);
  } catch (e) {
    if (e instanceof AuthzError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }

  if (userId === session.user.id) {
    return NextResponse.json({ error: "Không thể tự đổi vai trò của chính mình" }, { status: 400 });
  }

  const target = await prisma.membership.findUnique({ where: { groupId_userId: { groupId, userId } } });
  if (!target || target.status !== "ACTIVE") {
    return NextResponse.json({ error: "Không tìm thấy thành viên" }, { status: 404 });
  }
  if (target.role === "SUPER_ADMIN") {
    return NextResponse.json({ error: "Không thể đổi vai trò của người tạo nhóm" }, { status: 400 });
  }

  const membership = await prisma.membership.update({
    where: { groupId_userId: { groupId, userId } },
    data: { role: body.data.role },
  });

  await prisma.auditLog.create({
    data: {
      entity: "Membership",
      entityId: membership.id,
      action: "UPDATE_ROLE",
      actorId: session.user.id,
      diff: { role: body.data.role },
    },
  });

  return NextResponse.json({ membership });
}
