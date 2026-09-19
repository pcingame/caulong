import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NavBar } from "@/components/nav-bar";
import { CreateGroupForm } from "@/components/create-group-form";
import { Avatar } from "@/components/avatar";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const groups = await prisma.group.findMany({
    where: { memberships: { some: { userId: session.user.id, status: "ACTIVE" } } },
    include: { _count: { select: { matches: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <NavBar />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6">
        <div>
          <h1 className="text-lg font-semibold">Nhóm của bạn</h1>
          <p className="text-sm text-muted">Chọn 1 nhóm để xem lịch cầu và chi phí</p>
        </div>

        <div className="flex flex-col gap-2">
          {groups.length === 0 && (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border p-8 text-center">
              <span className="text-3xl">🏸</span>
              <p className="text-sm text-muted">
                Bạn chưa thuộc nhóm nào. Tạo nhóm mới bên dưới hoặc nhờ admin thêm bạn vào.
              </p>
            </div>
          )}
          {groups.map((group) => (
            <Link
              key={group.id}
              href={`/groups/${group.id}`}
              className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3 transition hover:bg-surface-hover"
            >
              <div className="flex items-center gap-3">
                <Avatar name={group.name} size={32} />
                <span className="text-sm font-medium">{group.name}</span>
              </div>
              <span className="text-xs text-muted">{group._count.matches} trận</span>
            </Link>
          ))}
        </div>

        <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
          <h2 className="text-sm font-medium text-muted">Tạo nhóm mới</h2>
          <CreateGroupForm />
        </div>
      </main>
    </>
  );
}
