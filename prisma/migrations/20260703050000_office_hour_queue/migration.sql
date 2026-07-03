-- CreateEnum
CREATE TYPE "OfficeHourQueueStatus" AS ENUM ('WAITING', 'CALLED', 'DONE', 'LEFT');

-- CreateTable
CREATE TABLE "OfficeHourQueueEntry" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "calledAt" TIMESTAMP(3),
    "status" "OfficeHourQueueStatus" NOT NULL DEFAULT 'WAITING',

    CONSTRAINT "OfficeHourQueueEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OfficeHourQueueEntry_sessionId_studentId_key" ON "OfficeHourQueueEntry"("sessionId", "studentId");

-- CreateIndex
CREATE INDEX "OfficeHourQueueEntry_sessionId_status_joinedAt_idx" ON "OfficeHourQueueEntry"("sessionId", "status", "joinedAt");

-- AddForeignKey
ALTER TABLE "OfficeHourQueueEntry" ADD CONSTRAINT "OfficeHourQueueEntry_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "OfficeHourSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfficeHourQueueEntry" ADD CONSTRAINT "OfficeHourQueueEntry_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
