import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** Mirrors src/lib/split.ts — duplicated because this script runs standalone via tsx, outside the Next.js path-alias setup. */
function splitCost(total: number, participantCount: number): number[] {
  const base = Math.floor(total / participantCount);
  const remainder = total - base * participantCount;
  return Array.from({ length: participantCount }, (_, idx) => base + (idx < remainder ? 1 : 0));
}

function at(daysOffset: number, hour: number, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  d.setHours(hour, minute, 0, 0);
  return d;
}

const DEFAULT_DEV_ADMIN_EMAIL = "admin@dev.test";

async function main() {
  // Local dev logs in via the "dev-login" credentials provider (any email,
  // auto-creates the User), so seeding can just upsert the admin user
  // directly — no need to log in first. In production this script isn't
  // run against real user data, but SEED_ADMIN_EMAIL still lets you target
  // a specific already-existing account if needed.
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? DEFAULT_DEV_ADMIN_EMAIL;

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    create: { email: adminEmail, name: adminEmail.split("@")[0] },
    update: {},
  });

  // Fake fellow members — data only, these emails can't actually log in.
  const memberDefs = [
    { name: "Minh Anh", email: "minh.anh@example.test" },
    { name: "Huy Trần", email: "huy.tran@example.test" },
    { name: "Lan Phạm", email: "lan.pham@example.test" },
    { name: "Đức Nguyễn", email: "duc.nguyen@example.test" },
  ];
  const members = await Promise.all(
    memberDefs.map((m) =>
      prisma.user.upsert({ where: { email: m.email }, create: m, update: {} })
    )
  );

  const group = await prisma.group.upsert({
    where: { id: "seed-group-clb-xom-tro" },
    create: {
      id: "seed-group-clb-xom-tro",
      name: "CLB Cầu Lông Xóm Trọ",
      defaultQrImageUrl: "https://placehold.co/300x300/png?text=QR+Demo",
      defaultBankName: "Vietcombank",
      defaultBankAccount: "0123456789",
      defaultBankHolder: "NGUYEN VAN A",
    },
    update: {},
  });

  await prisma.membership.upsert({
    where: { groupId_userId: { groupId: group.id, userId: admin.id } },
    create: { groupId: group.id, userId: admin.id, role: "SUPER_ADMIN" },
    update: { role: "SUPER_ADMIN", status: "ACTIVE" },
  });
  for (const m of members) {
    await prisma.membership.upsert({
      where: { groupId_userId: { groupId: group.id, userId: m.id } },
      create: { groupId: group.id, userId: m.id, role: "MEMBER" },
      update: { status: "ACTIVE" },
    });
  }

  // Clean previous seed matches so this script is safely re-runnable.
  await prisma.match.deleteMany({ where: { groupId: group.id } });

  // 1) SETTLED — 2 weeks ago, everyone confirmed paid.
  const settled = await prisma.match.create({
    data: {
      groupId: group.id,
      date: at(-14, 19),
      startTime: at(-14, 19),
      endTime: at(-14, 21),
      courtLocation: "Sân cầu lông Thành Công, sân 3",
      status: "SETTLED",
      actualCourtFee: 240000,
      actualWaterFee: 60000,
      actualOtherFee: 0,
      finalizedAt: at(-14, 22),
      finalizedById: admin.id,
    },
  });
  {
    const participantIds = [admin.id, members[0].id, members[1].id, members[2].id];
    const amounts = splitCost(300000, participantIds.length);
    for (const [idx, userId] of participantIds.entries()) {
      await prisma.participation.create({
        data: { matchId: settled.id, userId, rsvpStatus: "GOING", checkedIn: true, lockedAt: at(-14, 22) },
      });
      await prisma.payment.create({
        data: {
          matchId: settled.id,
          userId,
          amountOwed: amounts[idx],
          status: "CONFIRMED",
          markedPaidAt: at(-13, 10),
          confirmedAt: at(-13, 12),
          confirmedById: admin.id,
        },
      });
    }
  }

  // 2) FINALIZED — 3 days ago, payments in mixed states.
  const finalized = await prisma.match.create({
    data: {
      groupId: group.id,
      date: at(-3, 19),
      startTime: at(-3, 19),
      endTime: at(-3, 21),
      courtLocation: "Sân cầu lông Thành Công, sân 3",
      status: "FINALIZED",
      actualCourtFee: 240000,
      actualWaterFee: 80000,
      actualOtherFee: 20000,
      finalizedAt: at(-3, 22),
      finalizedById: admin.id,
    },
  });
  {
    const participantIds = [admin.id, members[0].id, members[1].id, members[3].id];
    const amounts = splitCost(340000, participantIds.length);
    const statuses: ("PENDING" | "MARKED_PAID" | "CONFIRMED")[] = [
      "CONFIRMED",
      "MARKED_PAID",
      "PENDING",
      "PENDING",
    ];
    for (const [idx, userId] of participantIds.entries()) {
      await prisma.participation.create({
        data: { matchId: finalized.id, userId, rsvpStatus: "GOING", checkedIn: true, lockedAt: at(-3, 22) },
      });
      await prisma.payment.create({
        data: {
          matchId: finalized.id,
          userId,
          amountOwed: amounts[idx],
          status: statuses[idx],
          markedPaidAt: statuses[idx] !== "PENDING" ? at(-2, 9) : null,
          confirmedAt: statuses[idx] === "CONFIRMED" ? at(-2, 20) : null,
          confirmedById: statuses[idx] === "CONFIRMED" ? admin.id : null,
        },
      });
    }
  }

  // 3) AWAITING_FINALIZE — ended yesterday, admin hasn't clicked "Chốt sổ" yet.
  const awaitingFinalize = await prisma.match.create({
    data: {
      groupId: group.id,
      date: at(-1, 19),
      startTime: at(-1, 19),
      endTime: at(-1, 21),
      courtLocation: "Sân cầu lông Việt Đức",
      status: "UPCOMING", // derived to AWAITING_FINALIZE at read time since endTime has passed
      estimatedCourtFee: 240000,
      estimatedWaterFee: 70000,
      estimatedPerPerson: 62000,
    },
  });
  await prisma.participation.createMany({
    data: [
      { matchId: awaitingFinalize.id, userId: admin.id, rsvpStatus: "GOING" },
      { matchId: awaitingFinalize.id, userId: members[0].id, rsvpStatus: "GOING" },
      { matchId: awaitingFinalize.id, userId: members[1].id, rsvpStatus: "GOING" },
      { matchId: awaitingFinalize.id, userId: members[2].id, rsvpStatus: "NOT_GOING" },
    ],
  });

  // 4) UPCOMING — in 3 days, RSVP still open.
  const upcoming = await prisma.match.create({
    data: {
      groupId: group.id,
      date: at(3, 19),
      startTime: at(3, 19),
      endTime: at(3, 21),
      courtLocation: "Sân cầu lông Thành Công, sân 3",
      status: "UPCOMING",
      estimatedCourtFee: 240000,
      estimatedWaterFee: 65000,
      estimatedPerPerson: 61000,
    },
  });
  await prisma.participation.createMany({
    data: [
      { matchId: upcoming.id, userId: admin.id, rsvpStatus: "GOING" },
      { matchId: upcoming.id, userId: members[3].id, rsvpStatus: "MAYBE" },
    ],
  });

  console.log(`Seed xong cho nhóm "${group.name}" (id: ${group.id})`);
  console.log(`Đăng nhập ở http://localhost:3000/login bằng "Dev Login" với email: ${admin.email}`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
