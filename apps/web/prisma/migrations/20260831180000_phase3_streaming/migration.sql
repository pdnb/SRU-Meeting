-- CreateTable
CREATE TABLE "Stream" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "startedById" TEXT NOT NULL,
    "status" "RecordingStatus" NOT NULL DEFAULT 'pending_consent',
    "rtmpUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "egressIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Stream_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StreamConsent" (
    "id" TEXT NOT NULL,
    "streamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "consentedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StreamConsent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Stream_roomId_createdAt_idx" ON "Stream"("roomId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "StreamConsent_streamId_userId_key" ON "StreamConsent"("streamId", "userId");

-- AddForeignKey
ALTER TABLE "Stream" ADD CONSTRAINT "Stream_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stream" ADD CONSTRAINT "Stream_startedById_fkey" FOREIGN KEY ("startedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StreamConsent" ADD CONSTRAINT "StreamConsent_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES "Stream"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StreamConsent" ADD CONSTRAINT "StreamConsent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
