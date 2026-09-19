import { prisma } from "@/lib/prisma";

export class AuthzError extends Error {
  status: number;
  constructor(message: string, status = 403) {
    super(message);
    this.status = status;
  }
}

export async function getActiveMembership(groupId: string, userId: string) {
  return prisma.membership.findFirst({
    where: { groupId, userId, status: "ACTIVE" },
  });
}

export async function requireAdmin(groupId: string, userId: string) {
  const membership = await getActiveMembership(groupId, userId);
  if (!membership || (membership.role !== "ADMIN" && membership.role !== "SUPER_ADMIN")) {
    throw new AuthzError("Chỉ admin của nhóm mới thực hiện được thao tác này");
  }
  return membership;
}

export async function requireMember(groupId: string, userId: string) {
  const membership = await getActiveMembership(groupId, userId);
  if (!membership) {
    throw new AuthzError("Bạn không thuộc nhóm này");
  }
  return membership;
}

export async function requireSuperAdmin(groupId: string, userId: string) {
  const membership = await getActiveMembership(groupId, userId);
  if (!membership || membership.role !== "SUPER_ADMIN") {
    throw new AuthzError("Chỉ người tạo nhóm mới thực hiện được thao tác này");
  }
  return membership;
}

/**
 * Debt / in-progress rule for leaving a group:
 * - blocked if any match has already started (ongoing, or ended but not yet
 *   finalized) where the member RSVP'd GOING or MAYBE — covers both
 *   "mid-match" and "AWAITING_FINALIZE" (see lib/match-status.ts), since
 *   obligation isn't settled either way. MAYBE is included, not just GOING:
 *   admin's finalize step can select anyone regardless of RSVP, so someone
 *   who said "maybe" and actually showed up must still be blocked from
 *   slipping out before they can be charged.
 * - blocked if any finalized/settled match still has an unconfirmed
 *   payment for the member
 */
export async function getLeaveBlockers(groupId: string, userId: string) {
  // Match.status only ever persists UPCOMING/FINALIZED/SETTLED — ONGOING and
  // AWAITING_FINALIZE are derived. "Started but not finalized yet" therefore
  // means: still UPCOMING in the DB, but startTime has already passed.
  const [unfinalizedMatches, unpaidPayments] = await Promise.all([
    prisma.match.findMany({
      where: {
        groupId,
        status: "UPCOMING",
        startTime: { lte: new Date() },
        participations: { some: { userId, rsvpStatus: { in: ["GOING", "MAYBE"] } } },
      },
      select: { id: true, date: true, courtLocation: true },
    }),
    prisma.payment.findMany({
      where: {
        userId,
        status: { not: "CONFIRMED" },
        match: { groupId },
      },
      select: { id: true, matchId: true, amountOwed: true, status: true },
    }),
  ]);

  return {
    blocked: unfinalizedMatches.length > 0 || unpaidPayments.length > 0,
    unfinalizedMatches,
    unpaidPayments,
  };
}
