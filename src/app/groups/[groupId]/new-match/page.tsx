import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NavBar } from "@/components/nav-bar";
import { NewMatchForm } from "@/components/new-match-form";

export default async function NewMatchPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const membership = await prisma.membership.findFirst({
    where: { groupId, userId: session.user.id, status: "ACTIVE" },
  });
  if (!membership) notFound();
  if (membership.role !== "ADMIN" && membership.role !== "SUPER_ADMIN") {
    redirect(`/groups/${groupId}`);
  }

  return (
    <>
      <NavBar />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6">
        <h1 className="text-lg font-semibold">Tạo trận đấu mới</h1>
        <NewMatchForm groupId={groupId} />
      </main>
    </>
  );
}
