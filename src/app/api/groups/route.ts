import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { zodFirstError } from "@/lib/api-error";

const createGroupSchema = z.object({
  name: z.string().trim().min(1, "Tên nhóm không được để trống").max(100),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const groups = await prisma.group.findMany({
    where: { memberships: { some: { userId: session.user.id, status: "ACTIVE" } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ groups });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = createGroupSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: zodFirstError(body.error) }, { status: 400 });
  }

  try {
    const group = await prisma.group.create({
      data: {
        name: body.data.name,
        memberships: {
          create: { userId: session.user.id, role: "SUPER_ADMIN" },
        },
      },
    });

    return NextResponse.json({ group }, { status: 201 });
  } catch (e) {
    // This is the one route that inserts a brand-new row FK'd to
    // session.user.id without an existing Membership already proving that
    // user exists — every other route implicitly checks via requireMember/
    // requireAdmin first. A stale JWT session (e.g. pointing at a user
    // deleted from the DB) surfaces here as a raw FK violation otherwise.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003") {
      return NextResponse.json(
        { error: "Phiên đăng nhập không còn hợp lệ, vui lòng đăng xuất và đăng nhập lại" },
        { status: 401 }
      );
    }
    throw e;
  }
}
