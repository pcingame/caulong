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
