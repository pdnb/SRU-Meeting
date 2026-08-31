-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isGuest" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "passwordHash" TEXT,
ADD COLUMN     "lobbyEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "locked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "finishedAt" TIMESTAMP(3),
ADD COLUMN     "allowGuests" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "signedInOnly" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "allowedEmailDomains" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "allowScreenShare" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "allowChat" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "maxParticipants" INTEGER NOT NULL DEFAULT 25,
ADD COLUMN     "chatRetentionDays" INTEGER;

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "recipientId" TEXT,
    "attachmentKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatMessage_roomId_createdAt_idx" ON "ChatMessage"("roomId", "createdAt");

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
