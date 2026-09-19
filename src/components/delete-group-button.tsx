"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toErrorMessage } from "@/lib/to-error-message";

export function DeleteGroupButton({ groupId, groupName }: { groupId: string; groupName: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    const confirmed = confirm(
      `Xoá vĩnh viễn nhóm "${groupName}"? Toàn bộ trận đấu, thành viên và lịch sử thanh toán sẽ mất, không thể khôi phục.`
    );
    if (!confirmed) return;

    setLoading(true);
    setError(null);
    const res = await fetch(`/api/groups/${groupId}`, { method: "DELETE" });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(toErrorMessage(data?.error, "Không xoá được nhóm"));
      return;
    }
    router.push("/");
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-danger/30 bg-danger/5 p-4">
      <h3 className="text-sm font-medium text-danger">Vùng nguy hiểm</h3>
      <p className="text-xs text-muted">
        Xoá nhóm sẽ xoá vĩnh viễn toàn bộ trận đấu, thành viên và lịch sử thanh toán. Chỉ người tạo
        nhóm mới thực hiện được.
      </p>
      <button
        onClick={handleClick}
        disabled={loading}
        className="w-fit rounded-lg border border-danger px-4 py-2 text-sm font-medium text-danger transition hover:bg-danger/10 disabled:opacity-50"
      >
        Xoá nhóm vĩnh viễn
      </button>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
