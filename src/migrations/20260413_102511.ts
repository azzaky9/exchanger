import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_transactions_status" ADD VALUE 'fiat_received' BEFORE 'processing';
  ALTER TYPE "public"."enum_transactions_status" ADD VALUE 'crypto_received' BEFORE 'processing';
  ALTER TABLE "exchange_rates" ALTER COLUMN "usdt_to_php_markup_percentage" SET DEFAULT 0;
  ALTER TABLE "exchange_rates" ALTER COLUMN "php_to_usdt_markup_percentage" SET DEFAULT 0;
  ALTER TABLE "exchange_rates" ADD COLUMN "usdt_to_php_reference_rate" numeric NOT NULL;
  ALTER TABLE "exchange_rates" ADD COLUMN "usdt_to_php_spread" numeric;
  ALTER TABLE "exchange_rates" ADD COLUMN "usdt_to_php_spread_percentage" numeric;
  ALTER TABLE "exchange_rates" ADD COLUMN "php_to_usdt_reference_rate" numeric NOT NULL;
  ALTER TABLE "exchange_rates" ADD COLUMN "php_to_usdt_spread" numeric;
  ALTER TABLE "exchange_rates" ADD COLUMN "php_to_usdt_spread_percentage" numeric;
  ALTER TABLE "exchange_rates" DROP COLUMN "reference_rate";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "transactions" ALTER COLUMN "status" SET DATA TYPE text;
  ALTER TABLE "transactions" ALTER COLUMN "status" SET DEFAULT 'pending'::text;
  DROP TYPE "public"."enum_transactions_status";
  CREATE TYPE "public"."enum_transactions_status" AS ENUM('pending', 'confirmed', 'processing', 'completed', 'refunded', 'review_needed');
  ALTER TABLE "transactions" ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."enum_transactions_status";
  ALTER TABLE "transactions" ALTER COLUMN "status" SET DATA TYPE "public"."enum_transactions_status" USING "status"::"public"."enum_transactions_status";
  ALTER TABLE "exchange_rates" ALTER COLUMN "usdt_to_php_markup_percentage" DROP DEFAULT;
  ALTER TABLE "exchange_rates" ALTER COLUMN "php_to_usdt_markup_percentage" DROP DEFAULT;
  ALTER TABLE "exchange_rates" ADD COLUMN "reference_rate" numeric NOT NULL;
  ALTER TABLE "exchange_rates" DROP COLUMN "usdt_to_php_reference_rate";
  ALTER TABLE "exchange_rates" DROP COLUMN "usdt_to_php_spread";
  ALTER TABLE "exchange_rates" DROP COLUMN "usdt_to_php_spread_percentage";
  ALTER TABLE "exchange_rates" DROP COLUMN "php_to_usdt_reference_rate";
  ALTER TABLE "exchange_rates" DROP COLUMN "php_to_usdt_spread";
  ALTER TABLE "exchange_rates" DROP COLUMN "php_to_usdt_spread_percentage";`)
}
