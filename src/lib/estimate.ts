import { prisma } from "@/lib/prisma";

const LOOKBACK_MATCHES = 5;

/**
 * Estimated cost is display-only — it never drives what a member owes.
 * Real debt only exists once an admin finalizes a match (see finalizeMatch).
 */
export async function estimateMatchCost(groupId: string, expectedParticipants: number) {
  const recentFinalized = await prisma.match.findMany({
    where: {
      groupId,
      status: { in: ["FINALIZED", "SETTLED"] },
      actualCourtFee: { not: null },
    },
    orderBy: { date: "desc" },
    take: LOOKBACK_MATCHES,
    select: { actualCourtFee: true, actualWaterFee: true, actualOtherFee: true },
  });

  if (recentFinalized.length === 0) {
    // No finalized match yet to average from. Admin can still set a number
    // manually per match via the "Sửa chi phí dự kiến" editor on the match page.
    return { estimatedCourtFee: null, estimatedWaterFee: null, estimatedPerPerson: null };
  }

  const avg = (values: number[]) =>
    values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;

  const estimatedCourtFee = avg(recentFinalized.map((m) => m.actualCourtFee ?? 0));
  const estimatedWaterFee = avg(
    recentFinalized.map((m) => (m.actualWaterFee ?? 0) + (m.actualOtherFee ?? 0))
  );

  const participants = Math.max(expectedParticipants, 1);
  const estimatedPerPerson = Math.ceil((estimatedCourtFee + estimatedWaterFee) / participants);

  return { estimatedCourtFee, estimatedWaterFee, estimatedPerPerson };
}

/**
 * estimatedPerPerson is a snapshot taken at match-creation time (or last
 * manual edit) — it doesn't move on its own as people RSVP. Call this after
 * every RSVP change so the displayed "dự kiến" figure reflects who's
 * actually currently marked GOING, not the headcount from whenever the
 * match was first created. No-op if there's no court/water estimate yet
 * (nothing to split).
 */
export async function recomputeEstimatedPerPerson(matchId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      estimatedCourtFee: true,
      estimatedWaterFee: true,
      participations: { where: { rsvpStatus: "GOING" }, select: { id: true } },
    },
  });
  if (!match) return;
  if (match.estimatedCourtFee == null && match.estimatedWaterFee == null) return;

  const goingCount = Math.max(match.participations.length, 1);
  const estimatedPerPerson = Math.ceil(
    ((match.estimatedCourtFee ?? 0) + (match.estimatedWaterFee ?? 0)) / goingCount
  );

  await prisma.match.update({ where: { id: matchId }, data: { estimatedPerPerson } });
}
