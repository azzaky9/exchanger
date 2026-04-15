import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_fiat_to_crypto_status" ADD VALUE 'processing';
  ALTER TYPE "public"."enum_fiat_to_crypto_status" ADD VALUE 'completed';
  ALTER TYPE "public"."enum_crypto_to_fiat_status" ADD VALUE 'confirmed' BEFORE 'processing';
  ALTER TABLE "transactions" ADD COLUMN "rate_snapshot" numeric;
  ALTER TABLE "transactions" ADD COLUMN "reference_rate_snapshot" numeric;
  ALTER TABLE "transactions" ADD COLUMN "applied_rate_snapshot" numeric;
  ALTER TABLE "transactions" ADD COLUMN "usdt_to_php_reference_rate_snapshot" numeric;
  ALTER TABLE "transactions" ADD COLUMN "usdt_to_php_rate_snapshot" numeric;
  ALTER TABLE "transactions" ADD COLUMN "php_to_usdt_reference_rate_snapshot" numeric;
  ALTER TABLE "transactions" ADD COLUMN "php_to_usdt_rate_snapshot" numeric;
  ALTER TABLE "transactions" ADD COLUMN "invoice_image_id" integer;
  ALTER TABLE "fiat_to_crypto" ADD COLUMN "invoice_image_id" integer;
  ALTER TABLE "transactions" ADD CONSTRAINT "transactions_invoice_image_id_media_id_fk" FOREIGN KEY ("invoice_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "fiat_to_crypto" ADD CONSTRAINT "fiat_to_crypto_invoice_image_id_media_id_fk" FOREIGN KEY ("invoice_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "transactions_invoice_image_idx" ON "transactions" USING btree ("invoice_image_id");
  CREATE INDEX "fiat_to_crypto_invoice_image_idx" ON "fiat_to_crypto" USING btree ("invoice_image_id");`)
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
