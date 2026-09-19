import { Avatar } from "@/components/avatar";
import { RsvpStatusBadge } from "@/components/status-badge";
import type { RsvpStatus } from "@prisma/client";

type ParticipantRow = {
  userId: string;
  name: string | null;
  email: string | null;
  image: string | null;
  rsvpStatus: RsvpStatus;
};

const ORDER: Record<RsvpStatus, number> = { GOING: 0, MAYBE: 1, NOT_GOING: 2 };

export function ParticipantsList({ participants }: { participants: ParticipantRow[] }) {
  if (participants.length === 0) {
    return <p className="text-sm text-muted">Chưa có ai xác nhận tham gia.</p>;
  }

  const sorted = [...participants].sort((a, b) => ORDER[a.rsvpStatus] - ORDER[b.rsvpStatus]);

  return (
    <div className="flex flex-col gap-2">
      {sorted.map((p) => (
        <div
          key={p.userId}
          className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2"
        >
          <div className="flex items-center gap-2 text-sm">
            <Avatar name={p.name} email={p.email} image={p.image} size={28} />
            <span>{p.name ?? p.email}</span>
          </div>
          <RsvpStatusBadge status={p.rsvpStatus} />
        </div>
      ))}
    </div>
  );
}
