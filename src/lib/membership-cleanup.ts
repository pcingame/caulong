import { prisma } from "@/lib/prisma";

/**
 * When someone leaves or is removed from a group, drop their RSVP from any
 * match that hasn't been finalized yet — they're no longer part of that
 * match's roster (headcount, estimates, and crucially the finalize/split
 * step, since no Payment rows exist until an admin finalizes). This covers
 * UPCOMING, ONGOING and AWAITING_FINALIZE alike (all stored as Match.status
 * "UPCOMING" — see lib/match-status.ts). Self-leave already refuses to
 * proceed while a started-but-unfinalized match has this person RSVP'd
 * GOING (see getLeaveBlockers), so this mainly matters for admin
 * force-remove, which bypasses that check.
 *
 * FINALIZED/SETTLED matches are never touched — their Participation and
 * Payment rows are locked financial history once real money is involved.
 */
export async function clearFutureParticipation(groupId: string, userId: string) {
  await prisma.participation.deleteMany({
    where: {
      userId,
      match: { groupId, status: "UPCOMING" },
    },
  });
}
