import { describe, expect, it } from "vitest";
import { splitCost } from "@/lib/split";

describe("splitCost", () => {
  it("splits evenly when total divides cleanly", () => {
    expect(splitCost(300000, 4)).toEqual([75000, 75000, 75000, 75000]);
  });

  it("hands the remainder to the first participants, 1 đồng each", () => {
    // 100000 / 3 = 33333.33 -> base 33333, remainder 1
    expect(splitCost(100000, 3)).toEqual([33334, 33333, 33333]);
  });

  it("always sums back to the original total", () => {
    const total = 340000;
    const n = 7;
    const amounts = splitCost(total, n);
    expect(amounts).toHaveLength(n);
    expect(amounts.reduce((a, b) => a + b, 0)).toBe(total);
  });

  it("gives everything to the single participant", () => {
    expect(splitCost(50000, 1)).toEqual([50000]);
  });

  it("handles zero total", () => {
    expect(splitCost(0, 4)).toEqual([0, 0, 0, 0]);
  });

  it("throws for a non-positive participant count", () => {
    expect(() => splitCost(10000, 0)).toThrow();
  });
});
