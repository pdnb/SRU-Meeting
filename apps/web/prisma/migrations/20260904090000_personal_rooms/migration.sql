-- CreateEnum
CREATE TYPE "RoomKind" AS ENUM ('adhoc', 'personal');

-- AlterTable
ALTER TABLE "Room" ADD COLUMN "kind" "RoomKind" NOT NULL DEFAULT 'adhoc';
ALTER TABLE "Room" ADD COLUMN "slug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Room_slug_key" ON "Room"("slug");

-- CreateIndex
CREATE INDEX "Room_ownerId_kind_idx" ON "Room"("ownerId", "kind");

-- One personal room per owner (adhoc rooms remain unlimited)
CREATE UNIQUE INDEX "Room_ownerId_personal_key" ON "Room"("ownerId") WHERE "kind" = 'personal';
