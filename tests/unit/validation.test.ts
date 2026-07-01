import { describe, expect, it } from "vitest";
import { createGradeCategorySchema, importGradesSchema } from "../../src/server/validation/grades";
import { createOfficeHourSessionSchema } from "../../src/server/validation/sessions";

const id = "clw0000000000000000000000";

describe("server validation", () => {
  it("rejects grade category weights over 100", () => {
    const result = createGradeCategorySchema.safeParse({
      courseOfferingId: id,
      name: "تمرین‌ها",
      weight: 120,
      maxScore: 20
    });
    expect(result.success).toBe(false);
  });

  it("rejects office-hour sessions with invalid date range", () => {
    const result = createOfficeHourSessionSchema.safeParse({
      courseOfferingId: id,
      hostId: id,
      title: "رفع اشکال",
      startsAt: new Date("2026-10-04T12:00:00.000Z"),
      endsAt: new Date("2026-10-04T10:00:00.000Z")
    });
    expect(result.success).toBe(false);
  });

  it("accepts a bounded grade import payload", () => {
    const result = importGradesSchema.safeParse({
      courseOfferingId: id,
      gradeItemId: id,
      format: "CSV",
      rows: [{ studentNumber: "405123456", score: 18.5 }]
    });
    expect(result.success).toBe(true);
  });
});
