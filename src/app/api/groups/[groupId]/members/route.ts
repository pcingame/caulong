import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AuthzError, requireAdmin } from "@/lib/authz";
import { zodFirstError } from "@/lib/api-error";

const addMemberSchema = z.object({
  email: z.string().email("Email không đúng định dạng"),
});

export async function POST(request: Request, { params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = addMemberSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: zodFirstError(body.error) }, { status: 400 });
  }

  try {
    await requireAdmin(groupId, session.user.id);
  } catch (e) {
    if (e instanceof AuthzError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }

  const user = await prisma.user.findUnique({ where: { email: body.data.email } });
  if (!user) {
    return NextResponse.json(
      { error: "Người dùng chưa từng đăng nhập vào app, chưa thể thêm" },
      { status: 404 }
    );
  }

  const membership = await prisma.membership.upsert({
    where: { groupId_userId: { groupId, userId: user.id } },
    create: { groupId, userId: user.id, role: "MEMBER" },
    update: { status: "ACTIVE", leftAt: null },
  });

  await prisma.auditLog.create({
    data: {
      entity: "Membership",
      entityId: membership.id,
      action: "ADD_MEMBER",
      actorId: session.user.id,
    },
  });

  return NextResponse.json({ membership }, { status: 201 });
}
