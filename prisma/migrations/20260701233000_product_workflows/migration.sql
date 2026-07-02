-- AlterTable
ALTER TABLE "GradeItem" ADD COLUMN     "assigneeId" TEXT;

-- AlterTable
ALTER TABLE "TACertificate" ADD COLUMN     "revokeReason" TEXT,
ADD COLUMN     "revokedById" TEXT;

-- CreateTable
CREATE TABLE "OfficeHourRegistration" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attendedAt" TIMESTAMP(3),

    CONSTRAINT "OfficeHourRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegradeRequest" (
    "id" TEXT NOT NULL,
    "gradeRecordId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "response" TEXT,
    "respondedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegradeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OfficeHourRegistration_studentId_idx" ON "OfficeHourRegistration"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "OfficeHourRegistration_sessionId_studentId_key" ON "OfficeHourRegistration"("sessionId", "studentId");

-- CreateIndex
CREATE INDEX "RegradeRequest_gradeRecordId_idx" ON "RegradeRequest"("gradeRecordId");

-- CreateIndex
CREATE INDEX "RegradeRequest_studentId_status_idx" ON "RegradeRequest"("studentId", "status");

-- CreateIndex
CREATE INDEX "GradeItem_assigneeId_idx" ON "GradeItem"("assigneeId");

-- AddForeignKey
ALTER TABLE "OfficeHourRegistration" ADD CONSTRAINT "OfficeHourRegistration_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "OfficeHourSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfficeHourRegistration" ADD CONSTRAINT "OfficeHourRegistration_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradeItem" ADD CONSTRAINT "GradeItem_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegradeRequest" ADD CONSTRAINT "RegradeRequest_gradeRecordId_fkey" FOREIGN KEY ("gradeRecordId") REFERENCES "GradeRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegradeRequest" ADD CONSTRAINT "RegradeRequest_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegradeRequest" ADD CONSTRAINT "RegradeRequest_respondedById_fkey" FOREIGN KEY ("respondedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TACertificate" ADD CONSTRAINT "TACertificate_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

