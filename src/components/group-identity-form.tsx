"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toErrorMessage } from "@/lib/to-error-message";

/** Group name is the one part of group settings any active member can
 * edit — everything else (payment info, Discord webhook) stays admin-only. */
export function GroupIdentityForm({
  groupId,
  initial,
}: {
  groupId: string;
  initial: { name: string };
}) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);
    const res = await fetch(`/api/groups/${groupId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(toErrorMessage(data?.error, "Không lưu được"));
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Tên nhóm
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </label>

      {error && <p className="text-xs text-danger">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="w-fit rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
      >
        Lưu
      </button>
      {saved && <span className="text-xs text-success">Đã lưu</span>}
    </form>
  );
}
