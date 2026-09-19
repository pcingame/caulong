/**
 * Splits `total` evenly across `participantCount` people. Division remainder
 * (VND has no decimals) is handed to the first N participants, 1 extra đồng
 * each, so the amounts always sum back to exactly `total`.
 */
export function splitCost(total: number, participantCount: number): number[] {
  if (participantCount <= 0) throw new Error("participantCount must be > 0");

  const base = Math.floor(total / participantCount);
  const remainder = total - base * participantCount;

  return Array.from({ length: participantCount }, (_, idx) => base + (idx < remainder ? 1 : 0));
}
