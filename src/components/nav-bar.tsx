import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { Avatar } from "@/components/avatar";

export async function NavBar() {
  const session = await auth();

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-surface/80 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <span aria-hidden>🏸</span>
          Cầu Lông
        </Link>
        {session?.user && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Avatar
                name={session.user.name}
                email={session.user.email}
                image={session.user.image}
                size={24}
              />
              <span className="hidden text-xs text-muted sm:inline">
                {session.user.name ?? session.user.email}
              </span>
            </div>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button
                type="submit"
                className="text-xs text-muted transition hover:text-foreground"
              >
                Đăng xuất
              </button>
            </form>
          </div>
        )}
      </div>
    </header>
  );
}
