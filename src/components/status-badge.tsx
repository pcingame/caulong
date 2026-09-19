import type { MatchStatus, PaymentStatus, RsvpStatus } from "@prisma/client";

const MATCH_STATUS_LABEL: Record<MatchStatus, { label: string; className: string }> = {
  UPCOMING: { label: "Sắp diễn ra", className: "bg-primary/15 text-primary" },
  ONGOING: { label: "Đang diễn ra", className: "bg-warning/15 text-warning" },
  AWAITING_FINALIZE: { label: "Chờ chốt sổ", className: "bg-warning/15 text-warning" },
  FINALIZED: { label: "Đã chốt", className: "bg-success/15 text-success" },
  SETTLED: { label: "Đã tất toán", className: "bg-muted/15 text-muted" },
};

const PAYMENT_STATUS_LABEL: Record<PaymentStatus, { label: string; className: string }> = {
  PENDING: { label: "Chưa đóng", className: "bg-danger/15 text-danger" },
  MARKED_PAID: { label: "Chờ xác nhận", className: "bg-warning/15 text-warning" },
  CONFIRMED: { label: "Đã xác nhận", className: "bg-success/15 text-success" },
};

const RSVP_STATUS_LABEL: Record<RsvpStatus, { label: string; className: string }> = {
  GOING: { label: "Tham gia", className: "bg-success/15 text-success" },
  MAYBE: { label: "Chưa chắc", className: "bg-warning/15 text-warning" },
  NOT_GOING: { label: "Vắng", className: "bg-muted/15 text-muted" },
};

function Badge({ label, className }: { label: string; className: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}

export function MatchStatusBadge({ status }: { status: MatchStatus }) {
  const { label, className } = MATCH_STATUS_LABEL[status];
  return <Badge label={label} className={className} />;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const { label, className } = PAYMENT_STATUS_LABEL[status];
  return <Badge label={label} className={className} />;
}

export function RsvpStatusBadge({ status }: { status: RsvpStatus }) {
  const { label, className } = RSVP_STATUS_LABEL[status];
  return <Badge label={label} className={className} />;
}
