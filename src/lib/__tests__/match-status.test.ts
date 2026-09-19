import { describe, expect, it } from "vitest";
import { canAcceptPayment, canFinalize, getEffectiveStatus } from "@/lib/match-status";

function hoursFromNow(h: number) {
  return new Date(Date.now() + h * 60 * 60 * 1000);
}

describe("getEffectiveStatus", () => {
  it("is UPCOMING before startTime", () => {
    const match = { status: "UPCOMING" as const, startTime: hoursFromNow(2), endTime: hoursFromNow(4) };
    expect(getEffectiveStatus(match)).toBe("UPCOMING");
  });

  it("is ONGOING between startTime and endTime", () => {
    const match = { status: "UPCOMING" as const, startTime: hoursFromNow(-1), endTime: hoursFromNow(1) };
    expect(getEffectiveStatus(match)).toBe("ONGOING");
  });

  it("is AWAITING_FINALIZE after endTime when still UPCOMING in the DB", () => {
    const match = { status: "UPCOMING" as const, startTime: hoursFromNow(-3), endTime: hoursFromNow(-1) };
    expect(getEffectiveStatus(match)).toBe("AWAITING_FINALIZE");
  });

  it("never derives away from a terminal FINALIZED status", () => {
    // Even if start/end are in the far past or future, FINALIZED is authoritative.
    const match = { status: "FINALIZED" as const, startTime: hoursFromNow(-100), endTime: hoursFromNow(-99) };
    expect(getEffectiveStatus(match)).toBe("FINALIZED");
  });

  it("never derives away from a terminal SETTLED status", () => {
    const match = { status: "SETTLED" as const, startTime: hoursFromNow(-100), endTime: hoursFromNow(-99) };
    expect(getEffectiveStatus(match)).toBe("SETTLED");
  });
});

describe("canFinalize", () => {
  it("is true only once the match has ended and hasn't been finalized yet", () => {
    const ended = { status: "UPCOMING" as const, startTime: hoursFromNow(-3), endTime: hoursFromNow(-1) };
    expect(canFinalize(ended)).toBe(true);
  });

  it("is false while the match is still ongoing (fee often not known until it ends)", () => {
    const ongoing = { status: "UPCOMING" as const, startTime: hoursFromNow(-1), endTime: hoursFromNow(1) };
    expect(canFinalize(ongoing)).toBe(false);
  });

  it("is false once already finalized", () => {
    const finalized = { status: "FINALIZED" as const, startTime: hoursFromNow(-3), endTime: hoursFromNow(-1) };
    expect(canFinalize(finalized)).toBe(false);
  });
});

describe("canAcceptPayment", () => {
  it("is false before finalization even if the match already ended", () => {
    const awaiting = { status: "UPCOMING" as const, startTime: hoursFromNow(-3), endTime: hoursFromNow(-1) };
    expect(canAcceptPayment(awaiting)).toBe(false);
  });

  it("is true once finalized", () => {
    const finalized = { status: "FINALIZED" as const, startTime: hoursFromNow(-3), endTime: hoursFromNow(-1) };
    expect(canAcceptPayment(finalized)).toBe(true);
  });

  it("is true once settled", () => {
    const settled = { status: "SETTLED" as const, startTime: hoursFromNow(-3), endTime: hoursFromNow(-1) };
    expect(canAcceptPayment(settled)).toBe(true);
  });
});
