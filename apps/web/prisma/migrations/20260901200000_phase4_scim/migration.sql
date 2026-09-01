-- Phase 4 Wave 5: SCIM 2.0 provisioning (Tasks 77–80)

ALTER TABLE "User" ADD COLUMN "externalId" TEXT;
ALTER TABLE "User" ADD COLUMN "scimGroups" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE UNIQUE INDEX "User_externalId_key" ON "User"("externalId");
