import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NavBar } from "@/components/nav-bar";
import { GroupIdentityForm } from "@/components/group-identity-form";
import { GroupSettingsForm } from "@/components/group-settings-form";
import { MemberManager } from "@/components/member-manager";
import { DeleteGroupButton } from "@/components/delete-group-button";

export default async function GroupSettingsPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const membership = await prisma.membership.findFirst({
    where: { groupId, userId: session.user.id, status: "ACTIVE" },
  });
  if (!membership) notFound();
  // Any active member can open settings — name is editable by everyone,
  // the rest of the page is gated per-section below.
  const isAdmin = membership.role === "ADMIN" || membership.role === "SUPER_ADMIN";

  const [group, memberships] = await Promise.all([
    prisma.group.findUnique({ where: { id: groupId } }),
    prisma.membership.findMany({
      where: { groupId, status: "ACTIVE" },
      include: { user: true },
      orderBy: { joinedAt: "asc" },
    }),
  ]);
  if (!group) notFound();

  return (
    <>
      <NavBar />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-6">
        <div>
          <h1 className="text-lg font-semibold">Cài đặt nhóm</h1>
          <p className="text-sm text-muted">{group.name}</p>
        </div>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-muted">Thông tin nhóm</h2>
          <GroupIdentityForm groupId={groupId} initial={{ name: group.name }} />
        </section>

        {isAdmin && (
          <>
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-medium text-muted">Thanh toán</h2>
              <GroupSettingsForm
                groupId={groupId}
                initial={{
                  defaultQrImageUrl: group.defaultQrImageUrl,
                  defaultBankName: group.defaultBankName,
                  defaultBankAccount: group.defaultBankAccount,
                  defaultBankHolder: group.defaultBankHolder,
                  discordWebhookUrl: group.discordWebhookUrl,
                }}
              />
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-medium text-muted">Thành viên</h2>
              <MemberManager
                groupId={groupId}
                currentUserId={session.user.id}
                isSuperAdminViewer={membership.role === "SUPER_ADMIN"}
                members={memberships.map((m) => ({
                  userId: m.userId,
                  name: m.user.name,
                  email: m.user.email,
                  role: m.role,
                }))}
              />
            </section>
          </>
        )}

        {membership.role === "SUPER_ADMIN" && (
          <section>
            <DeleteGroupButton groupId={groupId} groupName={group.name} />
          </section>
        )}
      </main>
    </>
  );
}
