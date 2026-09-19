import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NavBar } from "@/components/nav-bar";
import { MatchStatusBadge } from "@/components/status-badge";
import { getEffectiveStatus } from "@/lib/match-status";
import { RsvpButtons } from "@/components/rsvp-buttons";
import { FinalizePanel } from "@/components/finalize-panel";
import { PaymentList } from "@/components/payment-list";
import { ParticipantsList } from "@/components/participants-list";
import { RsvpStatusBadge } from "@/components/status-badge";
import { EstimateEditor } from "@/components/estimate-editor";

function formatVnd(amount: number) {
  return amount.toLocaleString("vi-VN") + "đ";
}

type ActiveMember = { userId: string; user: { name: string | null; email: string | null } };
type ParticipationRow = {
  userId: string;
  rsvpStatus: string;
  user: { name: string | null; email: string | null };
};

/**
 * Who can be selected + charged when finalizing: every current active
 * member, PLUS anyone who already has a Participation row on this specific
 * match even if they've since left or been removed from the group. Without
 * that second group, someone who actually played and then left right before
 * finalize would vanish from this list entirely and become uncharegable —
 * exactly the "admin thất thoát tiền" gap this was built to close.
 */
function buildFinalizeCandidates(
  activeMembers: ActiveMember[],
  match: { participations: ParticipationRow[] }
) {
  const candidates = new Map<
    string,
    { userId: string; name: string | null; email: string | null; defaultChecked: boolean; hasLeftGroup: boolean }
  >();

  for (const m of activeMembers) {
    const participation = match.participations.find((p) => p.userId === m.userId);
    candidates.set(m.userId, {
      userId: m.userId,
      name: m.user.name,
      email: m.user.email,
      defaultChecked: participation?.rsvpStatus === "GOING",
      hasLeftGroup: false,
    });
  }

  for (const p of match.participations) {
    if (!candidates.has(p.userId)) {
      candidates.set(p.userId, {
        userId: p.userId,
        name: p.user.name,
        email: p.user.email,
        defaultChecked: p.rsvpStatus === "GOING",
        hasLeftGroup: true,
      });
    }
  }

  return Array.from(candidates.values());
}

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      group: true,
      participations: { include: { user: true } },
      payments: { include: { user: true } },
    },
  });
  if (!match) notFound();

  const membership = await prisma.membership.findFirst({
    where: { groupId: match.groupId, userId: session.user.id, status: "ACTIVE" },
  });
  if (!membership) notFound();
  const isAdmin = membership.role === "ADMIN" || membership.role === "SUPER_ADMIN";

  const effectiveStatus = getEffectiveStatus(match);
  const myParticipation = match.participations.find((p) => p.userId === session.user.id);

  const qrImageUrl = match.qrImageUrl ?? match.group.defaultQrImageUrl;

  const activeMembers = await prisma.membership.findMany({
    where: { groupId: match.groupId, status: "ACTIVE" },
    include: { user: true },
  });

  return (
    <>
      <NavBar />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">
              {match.date.toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit" })}
            </h1>
            <p className="text-sm text-muted">
              {match.startTime.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} –{" "}
              {match.endTime.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} ·{" "}
              {match.courtLocation}
            </p>
          </div>
          <MatchStatusBadge status={effectiveStatus} />
        </div>

        {match.proofImageUrl && (
          <Image
            src={match.proofImageUrl}
            alt="Ảnh đặt lịch"
            width={300}
            height={300}
            unoptimized
            className="max-h-56 w-fit rounded-lg border border-border object-contain"
          />
        )}

        <section className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4">
          <h2 className="text-sm font-medium text-muted">Chi phí</h2>
          {effectiveStatus === "FINALIZED" || effectiveStatus === "SETTLED" ? (
            <p className="text-sm">
              Tổng: {formatVnd((match.actualCourtFee ?? 0) + (match.actualWaterFee ?? 0) + (match.actualOtherFee ?? 0))}
              {" · "}
              Sân {formatVnd(match.actualCourtFee ?? 0)} · Nước {formatVnd(match.actualWaterFee ?? 0)}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted">
                {match.estimatedPerPerson
                  ? `Dự kiến ~${formatVnd(match.estimatedPerPerson)}/người (chỉ để tham khảo, chưa phải số cuối)`
                  : "Chưa có dữ liệu ước tính"}
              </p>
              {isAdmin && (
                <EstimateEditor
                  matchId={match.id}
                  estimatedCourtFee={match.estimatedCourtFee}
                  estimatedWaterFee={match.estimatedWaterFee}
                />
              )}
            </div>
          )}
        </section>

        {(match.qrImageUrl || qrImageUrl) && (effectiveStatus === "FINALIZED" || effectiveStatus === "SETTLED") && (
          <section className="flex flex-col items-center gap-2 rounded-lg border border-border bg-surface p-4">
            <h2 className="self-start text-sm font-medium text-muted">Quét QR để thanh toán</h2>
            {qrImageUrl && (
              <Image src={qrImageUrl} alt="QR thanh toán" width={220} height={220} unoptimized />
            )}
            {match.group.defaultBankAccount && (
              <p className="text-xs text-muted">
                {match.group.defaultBankName} · {match.group.defaultBankAccount} ·{" "}
                {match.group.defaultBankHolder}
              </p>
            )}
          </section>
        )}

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-muted">Bạn có tham gia không?</h2>
          {effectiveStatus === "UPCOMING" ? (
            <RsvpButtons
              matchId={match.id}
              currentStatus={myParticipation?.rsvpStatus ?? null}
              disabled={false}
            />
          ) : myParticipation ? (
            <div className="flex items-center gap-2">
              <RsvpStatusBadge status={myParticipation.rsvpStatus} />
              <span className="text-xs text-muted">Trận đã bắt đầu, không thể đổi nữa</span>
            </div>
          ) : (
            <p className="text-xs text-muted">Bạn chưa xác nhận trước khi trận bắt đầu</p>
          )}
        </section>

        {effectiveStatus !== "FINALIZED" && effectiveStatus !== "SETTLED" && (
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-medium text-muted">Người tham gia</h2>
            <ParticipantsList
              participants={match.participations.map((p) => ({
                userId: p.userId,
                name: p.user.name,
                email: p.user.email,
                image: p.user.image,
                rsvpStatus: p.rsvpStatus,
              }))}
            />
          </section>
        )}

        {isAdmin && effectiveStatus === "AWAITING_FINALIZE" && (
          <FinalizePanel matchId={match.id} members={buildFinalizeCandidates(activeMembers, match)} />
        )}

        {match.payments.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-medium text-muted">Thanh toán</h2>
            <PaymentList
              matchId={match.id}
              currentUserId={session.user.id}
              isAdmin={isAdmin}
              payments={match.payments.map((p) => ({
                userId: p.userId,
                name: p.user.name,
                email: p.user.email,
                image: p.user.image,
                amountOwed: p.amountOwed,
                status: p.status,
              }))}
            />
          </section>
        )}
      </main>
    </>
  );
}
