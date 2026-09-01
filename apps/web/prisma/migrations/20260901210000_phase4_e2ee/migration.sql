-- Phase 4 Wave 6: E2EE room flag
ALTER TABLE "Room" ADD COLUMN "e2eeEnabled" BOOLEAN NOT NULL DEFAULT false;
