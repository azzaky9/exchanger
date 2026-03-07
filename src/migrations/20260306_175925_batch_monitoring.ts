import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // Add partial_success enum value
  await db.execute(sql`
    ALTER TYPE "public"."enum_batches_status" ADD VALUE IF NOT EXISTS 'partial_success' BEFORE 'success';
  `)

  // Drop old constraints and indexes from batches
  await db.execute(sql`
    ALTER TABLE "batches" DROP CONSTRAINT IF EXISTS "batches_admin_id_users_id_fk";
    ALTER TABLE "batches" DROP CONSTRAINT IF EXISTS "batches_config_id_wallet_config_id_fk";
    ALTER TABLE "batches" DROP CONSTRAINT IF EXISTS "batches_network_id_networks_id_fk";
    DROP INDEX IF EXISTS "batches_admin_idx";
    DROP INDEX IF EXISTS "batches_config_idx";
    DROP INDEX IF EXISTS "batches_tx_hash_idx";
    DROP INDEX IF EXISTS "batches_network_idx";
  `)

  // Add new batch columns (network-agnostic — no network/treasury on batch)
  await db.execute(sql`
    ALTER TABLE "batches" ADD COLUMN IF NOT EXISTS "transaction_count" numeric NOT NULL DEFAULT 0;
    ALTER TABLE "batches" ADD COLUMN IF NOT EXISTS "total_fee_usdt" numeric NOT NULL DEFAULT 0;
    ALTER TABLE "batches" ADD COLUMN IF NOT EXISTS "total_net_usdt" numeric NOT NULL DEFAULT 0;
  `)

  // Drop old batch columns no longer needed
  await db.execute(sql`
    ALTER TABLE "batches" DROP COLUMN IF EXISTS "admin_id";
    ALTER TABLE "batches" DROP COLUMN IF EXISTS "config_id";
    ALTER TABLE "batches" DROP COLUMN IF EXISTS "tx_hash";
    ALTER TABLE "batches" DROP COLUMN IF EXISTS "network_id";
    ALTER TABLE "batches" DROP COLUMN IF EXISTS "treasury_id";
  `)

  // Add rpc_url to networks
  await db.execute(sql`
    ALTER TABLE "networks" ADD COLUMN IF NOT EXISTS "rpc_url" varchar;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Remove rpc_url from networks
  await db.execute(sql`
    ALTER TABLE "networks" DROP COLUMN IF EXISTS "rpc_url";
  `)

  // Revert batch status enum
  await db.execute(sql`
    ALTER TABLE "batches" ALTER COLUMN "status" SET DATA TYPE text;
    ALTER TABLE "batches" ALTER COLUMN "status" SET DEFAULT 'processing'::text;
    DROP TYPE IF EXISTS "public"."enum_batches_status";
    CREATE TYPE "public"."enum_batches_status" AS ENUM('processing', 'success', 'failed');
    ALTER TABLE "batches" ALTER COLUMN "status" SET DEFAULT 'processing'::"public"."enum_batches_status";
    ALTER TABLE "batches" ALTER COLUMN "status" SET DATA TYPE "public"."enum_batches_status" USING "status"::"public"."enum_batches_status";
  `)

  // Re-add old batch columns
  await db.execute(sql`
    ALTER TABLE "batches" ADD COLUMN IF NOT EXISTS "admin_id" integer;
    ALTER TABLE "batches" ADD COLUMN IF NOT EXISTS "config_id" integer;
    ALTER TABLE "batches" ADD COLUMN IF NOT EXISTS "tx_hash" varchar;
    ALTER TABLE "batches" ADD COLUMN IF NOT EXISTS "network_id" integer;
    ALTER TABLE "batches" ADD COLUMN IF NOT EXISTS "treasury_id" integer;
  `)

  // Drop new batch columns
  await db.execute(sql`
    ALTER TABLE "batches" DROP COLUMN IF EXISTS "transaction_count";
    ALTER TABLE "batches" DROP COLUMN IF EXISTS "total_fee_usdt";
    ALTER TABLE "batches" DROP COLUMN IF EXISTS "total_net_usdt";
  `)
}
