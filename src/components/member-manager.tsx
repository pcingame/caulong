"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toErrorMessage } from "@/lib/to-error-message";
import { Avatar } from "@/components/avatar";

type MemberRow = {
  userId: string;
  name: string | null;
  email: string | null;
  role: string;
};

type Suggestion = { id: string; name: string | null; email: string | null; image: string | null };

export function MemberManager({
  groupId,
  members,
  currentUserId,
  isSuperAdminViewer,
}: {
  groupId: string;
  members: MemberRow[];
  currentUserId: string;
  isSuperAdminViewer: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    const trimmed = email.trim();
    const timeout = setTimeout(async () => {
      if (trimmed.length < 2) {
        setSuggestions([]);
        return;
      }
      const res = await fetch(
        `/api/groups/${groupId}/members/search?q=${encodeURIComponent(trimmed)}`
      );
      if (!res.ok) return;
      const data = await res.json();
      setSuggestions(data.users ?? []);
    }, 300);
    return () => clearTimeout(timeout);
  }, [email, groupId]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/groups/${groupId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(toErrorMessage(data?.error, "Không thêm được thành viên"));
      return;
    }
    setEmail("");
    setSuggestions([]);
    router.refresh();
  }

  async function handleRemove(userId: string) {
    if (
      !confirm(
        "Xoá thành viên này khỏi nhóm? RSVP của họ ở các trận sắp tới (chưa diễn ra) sẽ bị gỡ. Lịch sử các trận đã diễn ra/đã chốt sổ vẫn giữ nguyên."
      )
    )
      return;
    const res = await fetch(`/api/groups/${groupId}/members/${userId}`, { method: "DELETE" });
    const data = await res.json().catch(() => null);
    if (data?.hadOutstandingDebt) {
      alert("Lưu ý: thành viên này còn nợ tiền chưa xác nhận trước khi bị xoá.");
    }
    router.refresh();
  }

  async function handleRoleChange(userId: string, role: "ADMIN" | "MEMBER") {
    await fetch(`/api/groups/${groupId}/members/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={handleAdd} className="relative flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          placeholder="Email thành viên (đã từng đăng nhập app)"
          required
          className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          Thêm
        </button>

        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 z-10 mt-1 flex w-[calc(100%-4.5rem)] flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
            {suggestions.map((s) => (
              <button
                key={s.id}
                type="button"
                onMouseDown={() => {
                  setEmail(s.email ?? "");
                  setSuggestions([]);
                }}
                className="flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface-hover"
              >
                <Avatar name={s.name} email={s.email} image={s.image} size={24} />
                <div>
                  <div>{s.name ?? s.email}</div>
                  {s.name && <div className="text-xs text-muted">{s.email}</div>}
                </div>
              </button>
            ))}
          </div>
        )}
      </form>
      {error && <p className="text-xs text-danger">{error}</p>}

      <div className="flex flex-col gap-2">
        {members.map((m) => (
          <div
            key={m.userId}
            className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2"
          >
            <div className="flex items-center gap-2 text-sm">
              <Avatar name={m.name} email={m.email} size={28} />
              <div>
                <div>{m.name ?? m.email}</div>
                <div className="text-xs text-muted">{m.role}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isSuperAdminViewer && m.role !== "SUPER_ADMIN" && m.userId !== currentUserId && (
                <button
                  onClick={() =>
                    handleRoleChange(m.userId, m.role === "ADMIN" ? "MEMBER" : "ADMIN")
                  }
                  className="text-xs text-muted hover:text-foreground"
                >
                  {m.role === "ADMIN" ? "Bỏ quyền Admin" : "Đặt làm Admin"}
                </button>
              )}
              {m.role !== "SUPER_ADMIN" && (
                <button
                  onClick={() => handleRemove(m.userId)}
                  className="text-xs text-danger hover:opacity-80"
                >
                  Xoá
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
