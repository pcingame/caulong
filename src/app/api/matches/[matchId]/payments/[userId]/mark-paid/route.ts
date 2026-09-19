import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { discordMessages, sendDiscordMessage } from "@/lib/discord";

/** A member marks their own payment as sent; only the owner can do this. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ matchId: string; userId: string }> }
) {
  const { matchId, userId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.id !== userId) {
    return NextResponse.json({ error: "Bạn chỉ có thể xác nhận thanh toán của chính mình" }, { status: 403 });
  }

  const payment = await prisma.payment.findUnique({
    where: { matchId_userId: { matchId, userId } },
    include: { match: true, user: true },
  });
  if (!payment) return NextResponse.json({ error: "Không tìm thấy khoản thanh toán" }, { status: 404 });
  if (payment.match.status !== "FINALIZED" && payment.match.status !== "SETTLED") {
    return NextResponse.json({ error: "Trận chưa chốt sổ, chưa thể thanh toán" }, { status: 409 });
  }
  if (payment.status !== "PENDING") {
    return NextResponse.json({ error: "Khoản này đã được báo hoặc xác nhận trước đó" }, { status: 409 });
  }

  const updated = await prisma.payment.update({
    where: { id: payment.id },
    data: { status: "MARKED_PAID", markedPaidAt: new Date() },
  });

  const group = await prisma.group.findUnique({ where: { id: payment.match.groupId } });
  if (group?.discordWebhookUrl) {
    await sendDiscordMessage(
      group.discordWebhookUrl,
      discordMessages.memberMarkedPaid({
        memberName: payment.user.name ?? payment.user.email ?? "Thành viên",
        amount: payment.amountOwed,
        dateLabel: payment.match.date.toLocaleDateString("vi-VN"),
      })
    ).catch((err) => console.error("Discord notify failed:", err));
  }

  return NextResponse.json({ payment: updated });
}
