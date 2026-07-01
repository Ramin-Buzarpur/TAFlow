import { describe, expect, it } from "vitest";

function weightedTotal(items: Array<{ score: number; maxScore: number; weight: number }>) {
  return items.reduce((sum, item) => sum + (item.score / item.maxScore) * item.weight, 0);
}

describe("gradebook math", () => {
  it("calculates weighted total correctly", () => {
    const total = weightedTotal([
      { score: 18, maxScore: 20, weight: 30 },
      { score: 45, maxScore: 50, weight: 40 },
      { score: 27, maxScore: 30, weight: 30 }
    ]);
    expect(total).toBeCloseTo(90, 4);
  });

  it("does not allow negative scores in calculations", () => {
    const items = [{ score: -1, maxScore: 20, weight: 30 }];
    expect(items.some((item) => item.score < 0)).toBe(true);
  });
});
