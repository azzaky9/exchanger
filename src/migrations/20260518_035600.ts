import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  // Add per-direction fee columns (idempotent — dev mode may have already pushed them)
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'exchange_rates' AND column_name = 'usdt_to_php_spinzo_fee'
      ) THEN
        ALTER TABLE "exchange_rates" ADD COLUMN "usdt_to_php_spinzo_fee" numeric DEFAULT 0.2 NOT NULL;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'exchange_rates' AND column_name = 'usdt_to_php_gic_fee'
      ) THEN
        ALTER TABLE "exchange_rates" ADD COLUMN "usdt_to_php_gic_fee" numeric DEFAULT 0.2 NOT NULL;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'exchange_rates' AND column_name = 'php_to_usdt_spinzo_fee'
      ) THEN
        ALTER TABLE "exchange_rates" ADD COLUMN "php_to_usdt_spinzo_fee" numeric DEFAULT 0.2 NOT NULL;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'exchange_rates' AND column_name = 'php_to_usdt_gic_fee'
      ) THEN
        ALTER TABLE "exchange_rates" ADD COLUMN "php_to_usdt_gic_fee" numeric DEFAULT 0.2 NOT NULL;
      END IF;
    END $$;
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "exchange_rates" DROP COLUMN IF EXISTS "usdt_to_php_spinzo_fee";
    ALTER TABLE "exchange_rates" DROP COLUMN IF EXISTS "usdt_to_php_gic_fee";
    ALTER TABLE "exchange_rates" DROP COLUMN IF EXISTS "php_to_usdt_spinzo_fee";
    ALTER TABLE "exchange_rates" DROP COLUMN IF EXISTS "php_to_usdt_gic_fee";
  `)
}
