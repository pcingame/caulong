"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toErrorMessage } from "@/lib/to-error-message";

function formatVnd(amount: number) {
  return amount.toLocaleString("vi-VN") + "đ";
}

export function EstimateEditor({
  matchId,
  estimatedCourtFee,
  estimatedWaterFee,
}: {
  matchId: string;
  estimatedCourtFee: number | null;
  estimatedWaterFee: number | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [courtFee, setCourtFee] = useState((estimatedCourtFee ?? 0).toString());
  const [waterFee, setWaterFee] = useState((estimatedWaterFee ?? 0).toString());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="w-fit text-xs text-primary hover:opacity-80"
      >
        Sửa chi phí dự kiến
      </button>
    );
  }

  async function handleSave() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/matches/${matchId}/estimate`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        estimatedCourtFee: Number(courtFee) || 0,
        estimatedWaterFee: Number(waterFee) || 0,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(toErrorMessage(data?.error, "Không lưu được"));
      return;
    }
    setEditing(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3">
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-xs text-muted">
          Tiền sân dự kiến
          <input
            type="number"
            min={0}
            value={courtFee}
            onChange={(e) => setCourtFee(e.target.value)}
            className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-primary"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Tiền nước dự kiến
          <input
            type="number"
            min={0}
            value={waterFee}
            onChange={(e) => setWaterFee(e.target.value)}
            className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-primary"
          />
        </label>
      </div>
      <p className="text-xs text-muted">
        Tổng dự kiến: {formatVnd((Number(courtFee) || 0) + (Number(waterFee) || 0))}
      </p>
      {error && <p className="text-xs text-danger">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={loading}
          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          Lưu
        </button>
        <button
          onClick={() => setEditing(false)}
          className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:text-foreground"
        >
          Huỷ
        </button>
      </div>
    </div>
  );
}
