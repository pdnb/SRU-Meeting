-- CreateTable
CREATE TABLE "DailyOrgMetrics" (
    "date" DATE NOT NULL,
    "roomsCreated" INTEGER NOT NULL DEFAULT 0,
    "participantMinutes" INTEGER NOT NULL DEFAULT 0,
    "recordingsFinished" INTEGER NOT NULL DEFAULT 0,
    "uniqueUsers" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DailyOrgMetrics_pkey" PRIMARY KEY ("date")
);

-- CreateTable
CREATE TABLE "QosReport" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rttMs" INTEGER,
    "packetLoss" DOUBLE PRECISION,
    "jitterMs" INTEGER,
    "bitrateKbps" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QosReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QosReport_roomId_createdAt_idx" ON "QosReport"("roomId", "createdAt");

-- AddForeignKey
ALTER TABLE "QosReport" ADD CONSTRAINT "QosReport_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QosReport" ADD CONSTRAINT "QosReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
