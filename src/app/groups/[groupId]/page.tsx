import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NavBar } from "@/components/nav-bar";
import { MatchCard } from "@/components/match-card";
import { LeaveGroupButton } from "@/components/leave-group-button";
import { Avatar } from "@/components/avatar";

export default async function GroupPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const membership = await prisma.membership.findFirst({
    where: { groupId, userId: session.user.id, status: "ACTIVE" },
  });
  if (!membership) notFound();

  const [group, matches] = await Promise.all([
    prisma.group.findUnique({ where: { id: groupId } }),
    prisma.match.findMany({
      where: { groupId },
      orderBy: { date: "desc" },
      include: { participations: true },
    }),
  ]);
  if (!group) notFound();

  const isAdmin = membership.role === "ADMIN" || membership.role === "SUPER_ADMIN";

  return (
    <>
      <NavBar />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar name={group.name} size={40} />
            <div>
              <h1 className="text-lg font-semibold">{group.name}</h1>
              <p className="text-sm text-muted">{matches.length} trận đấu</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/groups/${groupId}/settings`}
              className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:text-foreground"
            >
              Cài đặt
            </Link>
            {isAdmin && (
              <Link
                href={`/groups/${groupId}/new-match`}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
              >
                + Tạo trận
              </Link>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {matches.length === 0 && (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border p-8 text-center">
              <span className="text-3xl">🏸</span>
              <p className="text-sm text-muted">Chưa có trận đấu nào.</p>
            </div>
          )}
          {matches.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>

        <div className="border-t border-border pt-4">
          <LeaveGroupButton groupId={groupId} />
        </div>
      </main>
    </>
  );
}
