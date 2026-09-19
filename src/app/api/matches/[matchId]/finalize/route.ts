import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AuthzError, requireAdmin } from "@/lib/authz";
import { canFinalize } from "@/lib/match-status";
import { discordMessages, sendDiscordMessage } from "@/lib/discord";
import { splitCost } from "@/lib/split";
import { zodFirstError } from "@/lib/api-error";
import { moneyAmountSchema } from "@/lib/money";

const finalizeSchema = z.object({
  actualCourtFee: moneyAmountSchema,
  actualWaterFee: moneyAmountSchema.default(0),
  actualOtherFee: moneyAmountSchema.default(0),
  // Who actually played — locks the split at finalize time, independent of RSVP.
  participantUserIds: z.array(z.string()).min(1),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = finalizeSchema.safeParse(await request.json());
  if (!body.success) return NextResponse.json({ error: zodFirstError(body.error) }, { status: 400 });

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) return NextResponse.json({ error: "Không tìm thấy trận đấu" }, { status: 404 });

  try {
    await requireAdmin(match.groupId, session.user.id);
  } catch (e) {
    if (e instanceof AuthzError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }

  if (!canFinalize(match)) {
    return NextResponse.json(
      { error: "Chỉ có thể chốt sổ sau khi trận đấu đã kết thúc và chưa được chốt trước đó" },
      { status: 409 }
    );
  }

  const { actualCourtFee, actualWaterFee, actualOtherFee, participantUserIds } = body.data;
  const total = actualCourtFee + actualWaterFee + actualOtherFee;
  const n = participantUserIds.length;
  const amounts = splitCost(total, n);

  const now = new Date();

  const updatedMatch = await prisma.$transaction(async (tx) => {
    for (const [idx, userId] of participantUserIds.entries()) {
      const amountOwed = amounts[idx];

      await tx.participation.upsert({
        where: { matchId_userId: { matchId, userId } },
        create: { matchId, userId, rsvpStatus: "GOING", checkedIn: true, lockedAt: now },
        update: { checkedIn: true, lockedAt: now },
      });

      await tx.payment.upsert({
        where: { matchId_userId: { matchId, userId } },
        create: { matchId, userId, amountOwed },
        update: { amountOwed },
      });
    }

    return tx.match.update({
      where: { id: matchId },
      data: {
        status: "FINALIZED",
        actualCourtFee,
        actualWaterFee,
        actualOtherFee,
        finalizedAt: now,
        finalizedById: session.user.id,
      },
    });
  });

  await prisma.auditLog.create({
    data: {
      entity: "Match",
      entityId: matchId,
      action: "FINALIZE",
      actorId: session.user.id,
      diff: { actualCourtFee, actualWaterFee, actualOtherFee, participantUserIds },
    },
  });

  const group = await prisma.group.findUnique({ where: { id: match.groupId } });
  if (group?.discordWebhookUrl) {
    const matchUrl = `${process.env.NEXTAUTH_URL ?? ""}/matches/${matchId}`;
    await sendDiscordMessage(
      group.discordWebhookUrl,
      discordMessages.matchFinalized({
        dateLabel: match.date.toLocaleDateString("vi-VN"),
        perPerson: Math.round(total / n),
        matchUrl,
      })
    ).catch((err) => console.error("Discord notify failed:", err));
  }

  return NextResponse.json({ match: updatedMatch });
}
