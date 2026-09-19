import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AuthzError, requireMember, requireSuperAdmin } from "@/lib/authz";
import { zodFirstError } from "@/lib/api-error";

// Any active member may edit the group name; everything else is admin-only
// (enforced below, since it's payment/notification-critical, not cosmetic).
const MEMBER_EDITABLE_FIELDS = new Set(["name"]);

const updateGroupSchema = z.object({
  name: z.string().trim().min(1, "Tên nhóm không được để trống").max(100).optional(),
  defaultQrImageUrl: z.string().url().nullable().optional(),
  defaultBankName: z.string().max(100).nullable().optional(),
  defaultBankAccount: z
    .string()
    .regex(/^\d+$/, "Số tài khoản chỉ gồm chữ số")
    .max(50)
    .nullable()
    .optional(),
  defaultBankHolder: z.string().max(100).nullable().optional(),
  discordWebhookUrl: z
    .string()
    .url()
    .regex(
      /^https:\/\/(discord|discordapp)\.com\/api\/webhooks\//,
      "URL phải là Discord Webhook hợp lệ (bắt đầu bằng https://discord.com/api/webhooks/)"
    )
    .nullable()
    .optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = updateGroupSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: zodFirstError(body.error) }, { status: 400 });
  }

  let membership;
  try {
    membership = await requireMember(groupId, session.user.id);
  } catch (e) {
    if (e instanceof AuthzError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }

  const isAdmin = membership.role === "ADMIN" || membership.role === "SUPER_ADMIN";
  if (!isAdmin) {
    const disallowed = Object.keys(body.data).filter((f) => !MEMBER_EDITABLE_FIELDS.has(f));
    if (disallowed.length > 0) {
      return NextResponse.json(
        { error: "Chỉ admin mới sửa được các thông tin này" },
        { status: 403 }
      );
    }
  }

  const group = await prisma.group.update({ where: { id: groupId }, data: body.data });

  await prisma.auditLog.create({
    data: {
      entity: "Group",
      entityId: groupId,
      action: "UPDATE_SETTINGS",
      actorId: session.user.id,
      diff: body.data,
    },
  });

  return NextResponse.json({ group });
}

/** Only the group creator (SUPER_ADMIN) can delete the group. Matches,
 * memberships, participations and payments cascade via schema FKs. */
export async function DELETE(request: Request, { params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await requireSuperAdmin(groupId, session.user.id);
  } catch (e) {
    if (e instanceof AuthzError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }

  await prisma.group.delete({ where: { id: groupId } });

  return NextResponse.json({ ok: true });
}
