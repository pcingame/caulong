"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toErrorMessage } from "@/lib/to-error-message";

type MemberOption = { userId: string; name: string | null; email: string | null; defaultChecked: boolean };

export function FinalizePanel({ matchId, members }: { matchId: string; members: MemberOption[] }) {
  const router = useRouter();
  const [courtFee, setCourtFee] = useState(0);
  const [waterFee, setWaterFee] = useState(0);
  const [otherFee, setOtherFee] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(
    new Set(members.filter((m) => m.defaultChecked).map((m) => m.userId))
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(userId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selected.size === 0) {
      setError("Chọn ít nhất 1 người tham gia");
      return;
    }
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/matches/${matchId}/finalize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        actualCourtFee: courtFee,
        actualWaterFee: waterFee,
        actualOtherFee: otherFee,
        participantUserIds: Array.from(selected),
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(toErrorMessage(data?.error, "Không chốt sổ được"));
      return;
    }
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-lg border border-warning/30 bg-warning/5 p-4"
    >
      <h3 className="text-sm font-medium text-warning">Chốt sổ trận đấu</h3>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm">
          Tiền sân
          <input
            type="number"
            min={0}
            value={courtFee}
            onChange={(e) => setCourtFee(Number(e.target.value))}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Tiền nước
          <input
            type="number"
            min={0}
            value={waterFee}
            onChange={(e) => setWaterFee(Number(e.target.value))}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Phát sinh khác
          <input
            type="number"
            min={0}
            value={otherFee}
            onChange={(e) => setOtherFee(Number(e.target.value))}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </label>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-sm text-muted">Người thực tế tham gia (chia tiền theo danh sách này)</span>
        <div className="flex flex-col gap-1">
          {members.map((m) => (
            <label key={m.userId} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selected.has(m.userId)}
                onChange={() => toggle(m.userId)}
              />
              {m.name ?? m.email}
            </label>
          ))}
        </div>
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-fit rounded-lg bg-warning px-4 py-2 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-50"
      >
        Chốt sổ & tính tiền
      </button>
    </form>
  );
}
