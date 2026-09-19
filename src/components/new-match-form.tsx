"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ImageUpload } from "@/components/image-upload";
import { toErrorMessage } from "@/lib/to-error-message";

export function NewMatchForm({ groupId }: { groupId: string }) {
  const router = useRouter();
  const [proofImageUrl, setProofImageUrl] = useState<string | null>(null);
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [courtLocation, setCourtLocation] = useState("");
  const [expectedParticipants, setExpectedParticipants] = useState(8);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!date || !startTime || !endTime || !courtLocation) return;

    setLoading(true);
    setError(null);
    const res = await fetch(`/api/groups/${groupId}/matches`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: new Date(date).toISOString(),
        startTime: new Date(`${date}T${startTime}`).toISOString(),
        endTime: new Date(`${date}T${endTime}`).toISOString(),
        courtLocation,
        proofImageUrl: proofImageUrl ?? undefined,
        expectedParticipants,
      }),
    });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(toErrorMessage(data?.error, "Không tạo được trận đấu"));
      return;
    }
    const { match } = await res.json();
    router.push(`/matches/${match.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <ImageUpload
        kind="proof"
        label="Ảnh chụp màn hình đặt lịch (từ alobo.vn)"
        onUploaded={setProofImageUrl}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm">
          Ngày
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Giờ bắt đầu
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Giờ kết thúc
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        Sân
        <input
          value={courtLocation}
          onChange={(e) => setCourtLocation(e.target.value)}
          placeholder="VD: Sân cầu lông ABC, số 3"
          required
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Số người dự kiến tham gia
        <input
          type="number"
          min={1}
          max={100}
          value={expectedParticipants}
          onChange={(e) => setExpectedParticipants(Number(e.target.value))}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </label>

      {error && <p className="text-xs text-danger">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
      >
        Tạo trận đấu
      </button>
    </form>
  );
}
