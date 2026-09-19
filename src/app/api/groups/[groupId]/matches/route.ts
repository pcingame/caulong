import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AuthzError, requireAdmin, requireMember } from "@/lib/authz";
import { estimateMatchCost } from "@/lib/estimate";
import { discordMessages, sendDiscordMessage } from "@/lib/discord";
import { zodFirstError } from "@/lib/api-error";

const createMatchSchema = z.object({
  date: z.coerce.date(),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  courtLocation: z.string().trim().min(1, "Vui lòng nhập tên sân").max(200),
  proofImageUrl: z.string().url().optional(),
  expectedParticipants: z.number().int().min(1).max(100).default(8),
});

export async function GET(request: Request, { params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await requireMember(groupId, session.user.id);
  } catch (e) {
    if (e instanceof AuthzError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }

  const matches = await prisma.match.findMany({
    where: { groupId },
    orderBy: { date: "desc" },
    include: { participations: true },
  });

  return NextResponse.json({ matches });
}

export async function POST(request: Request, { params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = createMatchSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: zodFirstError(body.error) }, { status: 400 });
  }
  if (body.data.endTime <= body.data.startTime) {
    return NextResponse.json({ error: "Giờ kết thúc phải sau giờ bắt đầu" }, { status: 400 });
  }

  try {
    await requireAdmin(groupId, session.user.id);
  } catch (e) {
    if (e instanceof AuthzError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }

  const estimate = await estimateMatchCost(groupId, body.data.expectedParticipants);

  const match = await prisma.match.create({
    data: {
      groupId,
      date: body.data.date,
      startTime: body.data.startTime,
      endTime: body.data.endTime,
      courtLocation: body.data.courtLocation,
      proofImageUrl: body.data.proofImageUrl,
      estimatedCourtFee: estimate.estimatedCourtFee,
      estimatedWaterFee: estimate.estimatedWaterFee,
      estimatedPerPerson: estimate.estimatedPerPerson,
    },
  });

  await prisma.auditLog.create({
    data: { entity: "Match", entityId: match.id, action: "CREATE", actorId: session.user.id },
  });

  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (group?.discordWebhookUrl) {
    const matchUrl = `${process.env.NEXTAUTH_URL ?? ""}/matches/${match.id}`;
    await sendDiscordMessage(
      group.discordWebhookUrl,
      discordMessages.newMatch({
        dateLabel: match.date.toLocaleDateString("vi-VN"),
        location: match.courtLocation,
        estimatedPerPerson: estimate.estimatedPerPerson,
        matchUrl,
      })
    ).catch((err) => console.error("Discord notify failed:", err));
  }

  return NextResponse.json({ match }, { status: 201 });
}
