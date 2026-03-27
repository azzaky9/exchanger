import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  // Step 1: Cast status to plain text first (removes old enum constraint)
  await db.execute(sql`
    ALTER TABLE "transactions" ALTER COLUMN "status" SET DATA TYPE text;
    ALTER TABLE "transactions" ALTER COLUMN "status" SET DEFAULT 'pending'::text;
    DROP TYPE IF EXISTS "public"."enum_transactions_status";
  `)

  // Step 2: Remap old status values to new equivalents
  await db.execute(sql`
    UPDATE "transactions" SET "status" = 'pending'       WHERE "status" IN ('awaiting_fiat', 'awaiting_crypto', 'awaiting_payment');
    UPDATE "transactions" SET "status" = 'processing'    WHERE "status" IN ('fiat_received', 'crypto_received', 'crypto_transfer_pending');
    UPDATE "transactions" SET "status" = 'completed'     WHERE "status" IN ('fiat_sent', 'crypto_sent');
    UPDATE "transactions" SET "status" = 'review_needed' WHERE "status" IN ('failed', 'dispute');
    UPDATE "transactions" SET "status" = 'pending'
      WHERE "status" NOT IN ('pending', 'confirmed', 'processing', 'completed', 'refunded', 'review_needed');
  `)

  // Step 3: Create the new enum and cast the column to it
  await db.execute(sql`
    CREATE TYPE "public"."enum_transactions_status" AS ENUM('pending', 'confirmed', 'processing', 'completed', 'refunded', 'review_needed');
    ALTER TABLE "transactions" ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."enum_transactions_status";
    ALTER TABLE "transactions" ALTER COLUMN "status" SET DATA TYPE "public"."enum_transactions_status" USING "status"::"public"."enum_transactions_status";
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "transactions" ALTER COLUMN "status" SET DATA TYPE text;
    ALTER TABLE "transactions" ALTER COLUMN "status" SET DEFAULT 'awaiting_fiat'::text;
    DROP TYPE IF EXISTS "public"."enum_transactions_status";
    CREATE TYPE "public"."enum_transactions_status" AS ENUM('awaiting_fiat', 'fiat_received', 'crypto_transfer_pending', 'completed', 'refunded', 'review_needed');
    ALTER TABLE "transactions" ALTER COLUMN "status" SET DEFAULT 'awaiting_fiat'::"public"."enum_transactions_status";
    ALTER TABLE "transactions" ALTER COLUMN "status" SET DATA TYPE "public"."enum_transactions_status" USING "status"::"public"."enum_transactions_status";
  `)
}
