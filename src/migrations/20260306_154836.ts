import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  // Create enum type for transaction type (if not already created by dev mode)
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_transactions_type" AS ENUM('fiat_to_crypto', 'crypto_to_fiat');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `)

  // Migrate status enum: convert existing values then recreate enum
  await db.execute(sql`
    DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_transactions_status') THEN
        ALTER TABLE "transactions" ALTER COLUMN "status" SET DATA TYPE text;
        ALTER TABLE "transactions" ALTER COLUMN "status" SET DEFAULT 'awaiting_fiat'::text;
        UPDATE "transactions" SET "status" = CASE
          WHEN "status" = 'created' THEN 'awaiting_fiat'
          WHEN "status" = 'pending' THEN 'crypto_transfer_pending'
          WHEN "status" = 'processing' THEN 'crypto_transfer_pending'
          WHEN "status" = 'batched' THEN 'crypto_transfer_pending'
          WHEN "status" = 'completed' THEN 'completed'
          WHEN "status" = 'failed' THEN 'review_needed'
          WHEN "status" = 'fiat_settlement' THEN 'completed'
          ELSE "status"
        END
        WHERE "status" NOT IN ('awaiting_fiat', 'fiat_received', 'crypto_transfer_pending', 'completed', 'refunded', 'review_needed');
        DROP TYPE "public"."enum_transactions_status";
        CREATE TYPE "public"."enum_transactions_status" AS ENUM('awaiting_fiat', 'fiat_received', 'crypto_transfer_pending', 'completed', 'refunded', 'review_needed');
        ALTER TABLE "transactions" ALTER COLUMN "status" SET DEFAULT 'awaiting_fiat'::"public"."enum_transactions_status";
        ALTER TABLE "transactions" ALTER COLUMN "status" SET DATA TYPE "public"."enum_transactions_status" USING "status"::"public"."enum_transactions_status";
      END IF;
    END $$;
  `)

  // Add new columns idempotently
  await db.execute(sql`
    ALTER TABLE "transactions" ALTER COLUMN "exchange_rate" DROP NOT NULL;
    ALTER TABLE "transactions" ALTER COLUMN "amount_usdt" DROP NOT NULL;
    ALTER TABLE "treasury" ADD COLUMN IF NOT EXISTS "private_key" varchar NOT NULL DEFAULT '';
    ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "type" "public"."enum_transactions_type" DEFAULT 'fiat_to_crypto' NOT NULL;
    ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "treasury_id" integer;
    ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "target_address" varchar NOT NULL DEFAULT '';
    ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "tx_hash" varchar;
    ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "fail_reason" varchar;
  `)

  // Add foreign key and indexes idempotently
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "transactions" ADD CONSTRAINT "transactions_treasury_id_treasury_id_fk" FOREIGN KEY ("treasury_id") REFERENCES "public"."treasury"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "transactions_treasury_idx" ON "transactions" USING btree ("treasury_id");
    CREATE INDEX IF NOT EXISTS "transactions_tx_hash_idx" ON "transactions" USING btree ("tx_hash");
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "transactions" DROP CONSTRAINT "transactions_treasury_id_treasury_id_fk";

  ALTER TABLE "transactions" ALTER COLUMN "status" SET DATA TYPE text;
  ALTER TABLE "transactions" ALTER COLUMN "status" SET DEFAULT 'pending'::text;
  DROP TYPE "public"."enum_transactions_status";
  CREATE TYPE "public"."enum_transactions_status" AS ENUM('pending', 'batched', 'completed', 'fiat_settlement');
  ALTER TABLE "transactions" ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."enum_transactions_status";
  ALTER TABLE "transactions" ALTER COLUMN "status" SET DATA TYPE "public"."enum_transactions_status" USING "status"::"public"."enum_transactions_status";
  DROP INDEX "transactions_treasury_idx";
  DROP INDEX "transactions_tx_hash_idx";
  ALTER TABLE "transactions" ALTER COLUMN "exchange_rate" SET NOT NULL;
  ALTER TABLE "transactions" ALTER COLUMN "amount_usdt" SET NOT NULL;
  ALTER TABLE "treasury" DROP COLUMN "private_key";
  ALTER TABLE "transactions" DROP COLUMN "type";
  ALTER TABLE "transactions" DROP COLUMN "treasury_id";
  ALTER TABLE "transactions" DROP COLUMN "target_address";
  ALTER TABLE "transactions" DROP COLUMN "tx_hash";
  ALTER TABLE "transactions" DROP COLUMN "fail_reason";
  DROP TYPE "public"."enum_transactions_type";`)
}
