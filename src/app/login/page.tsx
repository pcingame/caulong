import { signIn } from "@/lib/auth";

const isDev = process.env.NODE_ENV !== "production";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4 text-foreground">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-semibold">Cầu Lông</h1>
        <p className="text-sm text-muted">
          Đăng nhập để xem lịch cầu và chi phí nhóm của bạn
        </p>
      </div>
      <form
        action={async () => {
          "use server";
          await signIn("google", { redirectTo: "/" });
        }}
      >
        <button
          type="submit"
          className="flex items-center gap-2 rounded-lg border border-border bg-surface px-5 py-2.5 text-sm font-medium text-foreground transition hover:bg-surface-hover"
        >
          Đăng nhập với Google
        </button>
      </form>

      {isDev && (
        <div className="flex w-full max-w-xs flex-col gap-2 border-t border-border pt-6">
          <p className="text-center text-xs text-muted">
            Chỉ hiện ở local — đăng nhập nhanh bằng email bất kỳ, không cần Google OAuth thật
          </p>
          <form
            action={async (formData: FormData) => {
              "use server";
              const email = formData.get("email");
              if (typeof email === "string" && email) {
                await signIn("dev-login", { email, redirectTo: "/" });
              }
            }}
            className="flex gap-2"
          >
            <input
              name="email"
              type="email"
              placeholder="admin@dev.test"
              required
              className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <button
              type="submit"
              className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:opacity-90"
            >
              Vào
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
