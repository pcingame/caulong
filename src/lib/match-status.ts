import type { Match, MatchStatus } from "@prisma/client";

/**
 * UPCOMING/ONGOING/AWAITING_FINALIZE are derived purely from the clock —
 * no cron job flips them. FINALIZED/SETTLED are terminal states set only
 * by an explicit admin action (finalizeMatch) and are never recomputed.
 */
export function getEffectiveStatus(match: Pick<Match, "status" | "startTime" | "endTime">): MatchStatus {
  if (match.status === "FINALIZED" || match.status === "SETTLED") {
    return match.status;
  }
  const now = new Date();
  if (now < match.startTime) return "UPCOMING";
  if (now <= match.endTime) return "ONGOING";
  return "AWAITING_FINALIZE";
}

export function canFinalize(match: Pick<Match, "status" | "startTime" | "endTime">): boolean {
  return getEffectiveStatus(match) === "AWAITING_FINALIZE";
}

export function canAcceptPayment(match: Pick<Match, "status" | "startTime" | "endTime">): boolean {
  const status = getEffectiveStatus(match);
  return status === "FINALIZED" || status === "SETTLED";
}
