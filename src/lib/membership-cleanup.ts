import { prisma } from "@/lib/prisma";

/**
 * When someone leaves or is removed from a group, drop their RSVP from any
 * match that hasn't STARTED yet — they're no longer part of that match's
 * future planning (headcount, estimates).
 *
 * Deliberately narrower than "not finalized yet": a match that has already
 * started but isn't finalized (ONGOING/AWAITING_FINALIZE) is exactly the
 * window where someone might have actually played and still owes money once
 * an admin finalizes. Deleting their Participation row there would erase the
 * only record that they were ever in that match — letting them dodge the
 * charge by leaving/getting removed right after playing, before finalize
 * runs (see the FinalizePanel member list in the match page, which merges in
 * exactly these people so admin can still select and charge them).
 *
 * FINALIZED/SETTLED matches are never touched — their Participation and
 * Payment rows are locked financial history once real money is involved.
 */
export async function clearFutureParticipation(groupId: string, userId: string) {
  await prisma.participation.deleteMany({
    where: {
      userId,
      match: { groupId, status: "UPCOMING", startTime: { gt: new Date() } },
    },
  });
}
