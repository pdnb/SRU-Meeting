-- CreateEnum
CREATE TYPE "BreakoutAssignmentMode" AS ENUM ('auto', 'manual', 'self_pick');

-- CreateEnum
CREATE TYPE "BreakoutSessionStatus" AS ENUM ('open', 'closed');

-- AlterTable
ALTER TABLE "Room" ADD COLUMN "parentRoomId" TEXT;
ALTER TABLE "Room" ADD COLUMN "breakoutSessionId" TEXT;

-- CreateTable
CREATE TABLE "BreakoutSession" (
    "id" TEXT NOT NULL,
    "parentRoomId" TEXT NOT NULL,
    "status" "BreakoutSessionStatus" NOT NULL DEFAULT 'open',
    "assignmentMode" "BreakoutAssignmentMode" NOT NULL,
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BreakoutSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BreakoutAssignment" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "childRoomId" TEXT NOT NULL,

    CONSTRAINT "BreakoutAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BreakoutSession_parentRoomId_status_idx" ON "BreakoutSession"("parentRoomId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "BreakoutAssignment_sessionId_userId_key" ON "BreakoutAssignment"("sessionId", "userId");

-- CreateIndex
CREATE INDEX "BreakoutAssignment_childRoomId_idx" ON "BreakoutAssignment"("childRoomId");

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_parentRoomId_fkey" FOREIGN KEY ("parentRoomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_breakoutSessionId_fkey" FOREIGN KEY ("breakoutSessionId") REFERENCES "BreakoutSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BreakoutSession" ADD CONSTRAINT "BreakoutSession_parentRoomId_fkey" FOREIGN KEY ("parentRoomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BreakoutAssignment" ADD CONSTRAINT "BreakoutAssignment_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "BreakoutSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BreakoutAssignment" ADD CONSTRAINT "BreakoutAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BreakoutAssignment" ADD CONSTRAINT "BreakoutAssignment_childRoomId_fkey" FOREIGN KEY ("childRoomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
