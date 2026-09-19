"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const OPTIONS: { value: "GOING" | "MAYBE" | "NOT_GOING"; label: string }[] = [
  { value: "GOING", label: "Tham gia" },
  { value: "MAYBE", label: "Chưa chắc" },
  { value: "NOT_GOING", label: "Vắng" },
];

export function RsvpButtons({
  matchId,
  currentStatus,
  disabled,
}: {
  matchId: string;
  currentStatus: string | null;
  disabled: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleClick(rsvpStatus: string) {
    setPending(true);
    await fetch(`/api/matches/${matchId}/rsvp`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rsvpStatus }),
    });
    setPending(false);
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          disabled={disabled || pending}
          onClick={() => handleClick(opt.value)}
          className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition disabled:opacity-40 ${
            currentStatus === opt.value
              ? "border-primary bg-primary/15 text-primary"
              : "border-border bg-surface text-muted hover:text-foreground"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
