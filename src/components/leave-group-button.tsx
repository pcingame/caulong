"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toErrorMessage } from "@/lib/to-error-message";

export function LeaveGroupButton({ groupId }: { groupId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (
      !confirm(
        "Rời khỏi nhóm này? Lịch sử trận đấu và thanh toán của nhóm vẫn được giữ nguyên, bạn chỉ mất quyền truy cập. RSVP của bạn ở các trận sắp tới (chưa diễn ra) sẽ bị gỡ."
      )
    )
      return;
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/groups/${groupId}/leave`, { method: "POST" });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      const message = toErrorMessage(data?.error, "Không rời được nhóm");
      setError(message);
      alert(message);
      return;
    }
    router.push("/");
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={handleClick}
        disabled={loading}
        className="w-fit text-xs text-danger hover:opacity-80 disabled:opacity-50"
      >
        Rời nhóm
      </button>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
