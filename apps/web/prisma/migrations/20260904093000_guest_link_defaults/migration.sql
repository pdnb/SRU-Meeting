-- New rooms default to guest-shareable links (no backfill of existing rows).
ALTER TABLE "Room" ALTER COLUMN "allowGuests" SET DEFAULT true;
ALTER TABLE "Room" ALTER COLUMN "signedInOnly" SET DEFAULT false;
