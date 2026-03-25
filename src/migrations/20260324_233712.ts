import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE IF NOT EXISTS "exchange_rates" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"pair" varchar DEFAULT 'USDT/PHP' NOT NULL,
  	"reference_rate" numeric NOT NULL,
  	"usdt_to_php_rate" numeric NOT NULL,
  	"php_to_usdt_rate" numeric NOT NULL,
  	"usdt_to_php_markup_percentage" numeric,
  	"php_to_usdt_markup_percentage" numeric,
  	"is_active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "transactions" ALTER COLUMN "amount_usdt" DROP NOT NULL;
  ALTER TABLE "transactions" ALTER COLUMN "amount_php" SET NOT NULL;
  ALTER TABLE "treasury" ADD COLUMN IF NOT EXISTS "wallet_name" varchar NOT NULL DEFAULT 'default';
  ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "amount_usdt_original" numeric;
  ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "exchange_rate_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "exchange_rates_id" integer;
  CREATE UNIQUE INDEX IF NOT EXISTS "exchange_rates_pair_idx" ON "exchange_rates" USING btree ("pair");
  CREATE INDEX IF NOT EXISTS "exchange_rates_updated_at_idx" ON "exchange_rates" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "exchange_rates_created_at_idx" ON "exchange_rates" USING btree ("created_at");
  BEGIN;
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transactions_exchange_rate_id_exchange_rates_id_fk') THEN
      ALTER TABLE "transactions" ADD CONSTRAINT "transactions_exchange_rate_id_exchange_rates_id_fk" FOREIGN KEY ("exchange_rate_id") REFERENCES "public"."exchange_rates"("id") ON DELETE set null ON UPDATE no action;
    END IF;
  END $$;
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payload_locked_documents_rels_exchange_rates_fk') THEN
      ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_exchange_rates_fk" FOREIGN KEY ("exchange_rates_id") REFERENCES "public"."exchange_rates"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
  END $$;
  COMMIT;
  CREATE UNIQUE INDEX IF NOT EXISTS "treasury_wallet_name_idx" ON "treasury" USING btree ("wallet_name");
  CREATE INDEX IF NOT EXISTS "transactions_exchange_rate_idx" ON "transactions" USING btree ("exchange_rate_id");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_exchange_rates_id_idx" ON "payload_locked_documents_rels" USING btree ("exchange_rates_id");
  ALTER TABLE "transactions" DROP COLUMN IF EXISTS "exchange_rate";
  ALTER TABLE "transactions" DROP COLUMN IF EXISTS "markup";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "exchange_rates" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "exchange_rates" CASCADE;
  ALTER TABLE "transactions" DROP CONSTRAINT "transactions_exchange_rate_id_exchange_rates_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_exchange_rates_fk";
  
  DROP INDEX "treasury_wallet_name_idx";
  DROP INDEX "transactions_exchange_rate_idx";
  DROP INDEX "payload_locked_documents_rels_exchange_rates_id_idx";
  ALTER TABLE "transactions" ALTER COLUMN "amount_php" DROP NOT NULL;
  ALTER TABLE "transactions" ALTER COLUMN "amount_usdt" SET NOT NULL;
  ALTER TABLE "transactions" ADD COLUMN "exchange_rate" numeric;
  ALTER TABLE "transactions" ADD COLUMN "markup" numeric DEFAULT 0;
  ALTER TABLE "treasury" DROP COLUMN "wallet_name";
  ALTER TABLE "transactions" DROP COLUMN "amount_usdt_original";
  ALTER TABLE "transactions" DROP COLUMN "exchange_rate_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "exchange_rates_id";`)
}
