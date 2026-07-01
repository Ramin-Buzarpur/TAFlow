import { describe, expect, it } from "vitest";

function resultsVisible(responseCount: number, minResponses: number) {
  return responseCount >= minResponses;
}

describe("survey privacy threshold", () => {
  it("hides results below the configured minimum", () => {
    expect(resultsVisible(2, 5)).toBe(false);
  });
  it("shows aggregate results after threshold", () => {
    expect(resultsVisible(6, 5)).toBe(true);
  });
});
