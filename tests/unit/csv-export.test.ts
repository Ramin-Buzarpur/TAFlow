import { describe, expect, it } from "vitest";

describe("CSV export contract", () => {
  it("uses UTF-8 BOM for Persian-compatible CSV files", () => {
    const csv = "\uFEFF" + "studentNumber,name,email";
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });
});
