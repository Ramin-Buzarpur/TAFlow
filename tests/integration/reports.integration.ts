import { PrismaClient } from "@prisma/client";
import { afterAll, describe, expect, it } from "vitest";
import { exportManagementReportCsv, getManagementReport } from "@/server/services/reports";

const prisma = new PrismaClient();

afterAll(async () => {
  await prisma.$disconnect();
});

describe("management reports", () => {
  it("returns course summaries and CSV export for admin", async () => {
    const admin = await prisma.user.findUniqueOrThrow({
      where: { email: "admin@example.edu" },
      select: { id: true }
    });

    const report = await getManagementReport(admin.id);
    expect(report.courseSummaries.length).toBeGreaterThan(0);
    expect(report.totalApplications).toBeGreaterThanOrEqual(0);
    expect(report.activeTaAssignments).toBeGreaterThanOrEqual(0);
    expect(report.totalSessions).toBeGreaterThanOrEqual(0);
    expect(report.attendanceRate === null || report.attendanceRate >= 0).toBe(true);

    const csv = await exportManagementReportCsv(admin.id);
    expect(csv).toContain('"course","semester","activeTaAssignments"');
    expect(csv).toContain(report.courseSummaries[0].course);
  }, 30_000);
});
