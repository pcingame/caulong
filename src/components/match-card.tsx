import Link from "next/link";
import type { Match } from "@prisma/client";
import { getEffectiveStatus } from "@/lib/match-status";
import { MatchStatusBadge } from "@/components/status-badge";

function formatVnd(amount: number) {
  return amount.toLocaleString("vi-VN") + "đ";
}

export function MatchCard({ match }: { match: Match & { participations: { rsvpStatus: string }[] } }) {
  const effectiveStatus = getEffectiveStatus(match);
  const goingCount = match.participations.filter((p) => p.rsvpStatus === "GOING").length;

  const perPerson =
    effectiveStatus === "FINALIZED" || effectiveStatus === "SETTLED"
      ? null // shown from payments, not estimate, on the detail page
      : match.estimatedPerPerson;

  return (
    <Link
      href={`/matches/${match.id}`}
      className="flex flex-col gap-2 rounded-lg border border-border bg-surface px-4 py-3 transition hover:bg-surface-hover"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          {match.date.toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit" })}
        </span>
        <MatchStatusBadge status={effectiveStatus} />
      </div>
      <div className="flex items-center justify-between text-xs text-muted">
        <span>{match.courtLocation}</span>
        <span>{goingCount} người tham gia</span>
      </div>
      {perPerson != null && (
        <span className="text-xs text-muted">Dự kiến ~{formatVnd(perPerson)}/người</span>
      )}
    </Link>
  );
}
