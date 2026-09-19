"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ImageUpload } from "@/components/image-upload";
import { toErrorMessage } from "@/lib/to-error-message";

/** Admin-only settings: payment info and Discord notifications. Group
 * name/avatar live in GroupIdentityForm, editable by any member. */
export function GroupSettingsForm({
  groupId,
  initial,
}: {
  groupId: string;
  initial: {
    defaultQrImageUrl: string | null;
    defaultBankName: string | null;
    defaultBankAccount: string | null;
    defaultBankHolder: string | null;
    discordWebhookUrl: string | null;
  };
}) {
  const router = useRouter();
  const [defaultQrImageUrl, setDefaultQrImageUrl] = useState(initial.defaultQrImageUrl);
  const [bankName, setBankName] = useState(initial.defaultBankName ?? "");
  const [bankAccount, setBankAccount] = useState(initial.defaultBankAccount ?? "");
  const [bankHolder, setBankHolder] = useState(initial.defaultBankHolder ?? "");
  const [webhookUrl, setWebhookUrl] = useState(initial.discordWebhookUrl ?? "");
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
      body: JSON.stringify({
        defaultQrImageUrl,
        defaultBankName: bankName || null,
        defaultBankAccount: bankAccount || null,
        defaultBankHolder: bankHolder || null,
        discordWebhookUrl: webhookUrl || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(toErrorMessage(data?.error, "Không lưu được cài đặt"));
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <ImageUpload
        kind="qr"
        label="QR mặc định cho cả nhóm (dùng lại cho mọi trận, trừ khi trận nào cần đổi riêng)"
        initialUrl={defaultQrImageUrl}
        onUploaded={setDefaultQrImageUrl}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm">
          Ngân hàng
          <input
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Số tài khoản
          <input
            value={bankAccount}
            onChange={(e) => setBankAccount(e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            placeholder="Chỉ nhập số"
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Chủ tài khoản
          <input
            value={bankHolder}
            onChange={(e) => setBankHolder(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        Discord Webhook URL (thông báo lịch mới, thanh toán...)
        <input
          value={webhookUrl}
          onChange={(e) => setWebhookUrl(e.target.value)}
          placeholder="https://discord.com/api/webhooks/..."
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </label>

      {error && <p className="text-xs text-danger">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="w-fit rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
      >
        Lưu cài đặt
      </button>
      {saved && <span className="text-xs text-success">Đã lưu</span>}
    </form>
  );
}
