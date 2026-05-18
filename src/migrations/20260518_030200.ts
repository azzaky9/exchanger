import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "exchange_rates" ALTER COLUMN "usdt_to_php_markup_percentage" DROP DEFAULT;
    ALTER TABLE "exchange_rates" ALTER COLUMN "php_to_usdt_markup_percentage" DROP DEFAULT;
    ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "prefix" varchar DEFAULT 'staging';
    ALTER TABLE "exchange_rates" ADD COLUMN IF NOT EXISTS "spinzo_fee" numeric DEFAULT 0 NOT NULL;
    ALTER TABLE "exchange_rates" ADD COLUMN IF NOT EXISTS "gic_fee" numeric DEFAULT 0 NOT NULL;
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "exchange_rates" ALTER COLUMN "usdt_to_php_markup_percentage" SET DEFAULT 0;
  ALTER TABLE "exchange_rates" ALTER COLUMN "php_to_usdt_markup_percentage" SET DEFAULT 0;
  ALTER TABLE "media" DROP COLUMN "prefix";
  ALTER TABLE "exchange_rates" DROP COLUMN "spinzo_fee";
  ALTER TABLE "exchange_rates" DROP COLUMN "gic_fee";`)
}
