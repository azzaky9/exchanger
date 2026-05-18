import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  // Add enum values only if they don't already exist (idempotent for dev-mode push)
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'processing' AND enumtypid = 'public.enum_fiat_to_crypto_status'::regtype) THEN
        ALTER TYPE "public"."enum_fiat_to_crypto_status" ADD VALUE 'processing';
      END IF;
    END $$;
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'completed' AND enumtypid = 'public.enum_fiat_to_crypto_status'::regtype) THEN
        ALTER TYPE "public"."enum_fiat_to_crypto_status" ADD VALUE 'completed';
      END IF;
    END $$;
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'confirmed' AND enumtypid = 'public.enum_crypto_to_fiat_status'::regtype) THEN
        ALTER TYPE "public"."enum_crypto_to_fiat_status" ADD VALUE 'confirmed' BEFORE 'processing';
      END IF;
    END $$;
  `)
  await db.execute(sql`
    ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "rate_snapshot" numeric;
    ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "reference_rate_snapshot" numeric;
    ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "applied_rate_snapshot" numeric;
    ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "usdt_to_php_reference_rate_snapshot" numeric;
    ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "usdt_to_php_rate_snapshot" numeric;
    ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "php_to_usdt_reference_rate_snapshot" numeric;
    ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "php_to_usdt_rate_snapshot" numeric;
    ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "invoice_image_id" integer;
    ALTER TABLE "fiat_to_crypto" ADD COLUMN IF NOT EXISTS "invoice_image_id" integer;
  `)
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "transactions" ADD CONSTRAINT "transactions_invoice_image_id_media_id_fk" FOREIGN KEY ("invoice_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
    DO $$ BEGIN
      ALTER TABLE "fiat_to_crypto" ADD CONSTRAINT "fiat_to_crypto_invoice_image_id_media_id_fk" FOREIGN KEY ("invoice_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "transactions_invoice_image_idx" ON "transactions" USING btree ("invoice_image_id");
    CREATE INDEX IF NOT EXISTS "fiat_to_crypto_invoice_image_idx" ON "fiat_to_crypto" USING btree ("invoice_image_id");
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "transactions" DROP CONSTRAINT "transactions_invoice_image_id_media_id_fk";
  
  ALTER TABLE "fiat_to_crypto" DROP CONSTRAINT "fiat_to_crypto_invoice_image_id_media_id_fk";
  
  ALTER TABLE "fiat_to_crypto" ALTER COLUMN "status" SET DATA TYPE text;
  ALTER TABLE "fiat_to_crypto" ALTER COLUMN "status" SET DEFAULT 'pending'::text;
  DROP TYPE "public"."enum_fiat_to_crypto_status";
  CREATE TYPE "public"."enum_fiat_to_crypto_status" AS ENUM('pending', 'confirmed');
  ALTER TABLE "fiat_to_crypto" ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."enum_fiat_to_crypto_status";
  ALTER TABLE "fiat_to_crypto" ALTER COLUMN "status" SET DATA TYPE "public"."enum_fiat_to_crypto_status" USING "status"::"public"."enum_fiat_to_crypto_status";
  ALTER TABLE "crypto_to_fiat" ALTER COLUMN "status" SET DATA TYPE text;
  ALTER TABLE "crypto_to_fiat" ALTER COLUMN "status" SET DEFAULT 'pending'::text;
  DROP TYPE "public"."enum_crypto_to_fiat_status";
  CREATE TYPE "public"."enum_crypto_to_fiat_status" AS ENUM('pending', 'processing', 'completed', 'failed');
  ALTER TABLE "crypto_to_fiat" ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."enum_crypto_to_fiat_status";
  ALTER TABLE "crypto_to_fiat" ALTER COLUMN "status" SET DATA TYPE "public"."enum_crypto_to_fiat_status" USING "status"::"public"."enum_crypto_to_fiat_status";
  DROP INDEX "transactions_invoice_image_idx";
  DROP INDEX "fiat_to_crypto_invoice_image_idx";
  ALTER TABLE "transactions" DROP COLUMN "rate_snapshot";
  ALTER TABLE "transactions" DROP COLUMN "reference_rate_snapshot";
  ALTER TABLE "transactions" DROP COLUMN "applied_rate_snapshot";
  ALTER TABLE "transactions" DROP COLUMN "usdt_to_php_reference_rate_snapshot";
  ALTER TABLE "transactions" DROP COLUMN "usdt_to_php_rate_snapshot";
  ALTER TABLE "transactions" DROP COLUMN "php_to_usdt_reference_rate_snapshot";
  ALTER TABLE "transactions" DROP COLUMN "php_to_usdt_rate_snapshot";
  ALTER TABLE "transactions" DROP COLUMN "invoice_image_id";
  ALTER TABLE "fiat_to_crypto" DROP COLUMN "invoice_image_id";`)
}
