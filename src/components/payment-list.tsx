"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PaymentStatusBadge } from "@/components/status-badge";
import { Avatar } from "@/components/avatar";
import type { PaymentStatus } from "@prisma/client";

type PaymentRow = {
  userId: string;
  name: string | null;
  email: string | null;
  image: string | null;
  amountOwed: number;
  status: PaymentStatus;
};

function formatVnd(amount: number) {
  return amount.toLocaleString("vi-VN") + "đ";
}

export function PaymentList({
  matchId,
  payments,
  currentUserId,
  isAdmin,
}: {
  matchId: string;
  payments: PaymentRow[];
  currentUserId: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function markPaid(userId: string) {
    setPendingId(userId);
    await fetch(`/api/matches/${matchId}/payments/${userId}/mark-paid`, { method: "POST" });
    setPendingId(null);
    router.refresh();
  }

  async function confirm(userId: string) {
    setPendingId(userId);
    await fetch(`/api/matches/${matchId}/payments/${userId}/confirm`, { method: "POST" });
    setPendingId(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      {payments.map((p) => (
        <div
          key={p.userId}
          className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2"
        >
          <div className="flex items-center gap-2 text-sm">
            <Avatar name={p.name} email={p.email} image={p.image} size={28} />
            <div>
              <div>{p.name ?? p.email}</div>
              <div className="text-xs text-muted">{formatVnd(p.amountOwed)}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <PaymentStatusBadge status={p.status} />
            {p.userId === currentUserId && p.status === "PENDING" && (
              <button
                onClick={() => markPaid(p.userId)}
                disabled={pendingId === p.userId}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                Đã chuyển khoản
              </button>
            )}
            {isAdmin && p.status === "MARKED_PAID" && (
              <button
                onClick={() => confirm(p.userId)}
                disabled={pendingId === p.userId}
                className="rounded-lg bg-success px-3 py-1.5 text-xs font-medium text-background hover:opacity-90 disabled:opacity-50"
              >
                Xác nhận
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
