import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AuthzError, requireAdmin } from "@/lib/authz";
import { discordMessages, sendDiscordMessage } from "@/lib/discord";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ matchId: string; userId: string }> }
) {
  const { matchId, userId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payment = await prisma.payment.findUnique({
    where: { matchId_userId: { matchId, userId } },
    include: { match: true, user: true },
  });
  if (!payment) return NextResponse.json({ error: "Không tìm thấy khoản thanh toán" }, { status: 404 });

  try {
    await requireAdmin(payment.match.groupId, session.user.id);
  } catch (e) {
    if (e instanceof AuthzError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }

  if (payment.status === "CONFIRMED") {
    return NextResponse.json({ error: "Khoản này đã được xác nhận" }, { status: 409 });
  }

  const now = new Date();
  const updated = await prisma.payment.update({
    where: { id: payment.id },
    data: { status: "CONFIRMED", confirmedAt: now, confirmedById: session.user.id },
  });

  const remaining = await prisma.payment.count({
    where: { matchId, status: { not: "CONFIRMED" } },
  });
  if (remaining === 0) {
    await prisma.match.update({ where: { id: matchId }, data: { status: "SETTLED" } });
  }

  const group = await prisma.group.findUnique({ where: { id: payment.match.groupId } });
  if (group?.discordWebhookUrl) {
    await sendDiscordMessage(
      group.discordWebhookUrl,
      discordMessages.adminConfirmedPayment({
        memberName: payment.user.name ?? payment.user.email ?? "Thành viên",
        dateLabel: payment.match.date.toLocaleDateString("vi-VN"),
      })
    ).catch((err) => console.error("Discord notify failed:", err));
  }

  return NextResponse.json({ payment: updated });
}
