const MAX_RETRIES = 3;

function formatVnd(amount: number) {
  return amount.toLocaleString("vi-VN") + "đ";
}

/**
 * Discord webhooks don't retry on their own and return 429 with a
 * `retry_after` (seconds) body when the ~5 req/2s per-webhook limit is hit.
 */
export async function sendDiscordMessage(webhookUrl: string, content: string) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });

    if (res.ok) return;

    if (res.status === 429 && attempt < MAX_RETRIES) {
      const body = await res.json().catch(() => null);
      const retryAfterSec = body?.retry_after ?? 1;
      await new Promise((r) => setTimeout(r, retryAfterSec * 1000));
      continue;
    }

    throw new Error(`Discord webhook failed: ${res.status} ${await res.text()}`);
  }
}

export const discordMessages = {
  newMatch: (params: {
    dateLabel: string;
    location: string;
    estimatedPerPerson: number | null;
    matchUrl: string;
  }) =>
    [
      `📅 **Lịch cầu mới:** ${params.dateLabel} tại ${params.location}`,
      params.estimatedPerPerson
        ? `💸 Chi phí dự kiến: ~${formatVnd(params.estimatedPerPerson)}/người`
        : `💸 Chi phí dự kiến: chưa có dữ liệu`,
      `👉 Xác nhận tham gia tại ${params.matchUrl}`,
    ].join("\n"),

  memberMarkedPaid: (params: { memberName: string; amount: number; dateLabel: string }) =>
    `💰 **${params.memberName}** đã báo chuyển khoản ${formatVnd(params.amount)} cho trận ${params.dateLabel}. Admin xác nhận giúp nhé.`,

  adminConfirmedPayment: (params: { memberName: string; dateLabel: string }) =>
    `✅ **${params.memberName}** đã hoàn tất thanh toán trận ${params.dateLabel}.`,

  matchFinalized: (params: { dateLabel: string; perPerson: number; matchUrl: string }) =>
    [
      `🧾 Trận ${params.dateLabel} đã được chốt sổ.`,
      `Mỗi người đóng ${formatVnd(params.perPerson)}.`,
      `👉 Thanh toán tại ${params.matchUrl}`,
    ].join("\n"),
};
