import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "fiat_to_crypto" ALTER COLUMN "currency" SET DATA TYPE text;
  ALTER TABLE "fiat_to_crypto" ALTER COLUMN "currency" SET DEFAULT 'USDT'::text;
  DROP TYPE "public"."enum_fiat_to_crypto_currency";
  CREATE TYPE "public"."enum_fiat_to_crypto_currency" AS ENUM('USDT');
  ALTER TABLE "fiat_to_crypto" ALTER COLUMN "currency" SET DEFAULT 'USDT'::"public"."enum_fiat_to_crypto_currency";
  ALTER TABLE "fiat_to_crypto" ALTER COLUMN "currency" SET DATA TYPE "public"."enum_fiat_to_crypto_currency" USING "currency"::"public"."enum_fiat_to_crypto_currency";
  ALTER TABLE "crypto_to_fiat" ALTER COLUMN "currency" SET DATA TYPE text;
  ALTER TABLE "crypto_to_fiat" ALTER COLUMN "currency" SET DEFAULT 'USDT'::text;
  DROP TYPE "public"."enum_crypto_to_fiat_currency";
  CREATE TYPE "public"."enum_crypto_to_fiat_currency" AS ENUM('USDT');
  ALTER TABLE "crypto_to_fiat" ALTER COLUMN "currency" SET DEFAULT 'USDT'::"public"."enum_crypto_to_fiat_currency";
  ALTER TABLE "crypto_to_fiat" ALTER COLUMN "currency" SET DATA TYPE "public"."enum_crypto_to_fiat_currency" USING "currency"::"public"."enum_crypto_to_fiat_currency";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_fiat_to_crypto_currency" ADD VALUE 'PHP' BEFORE 'USDT';
  ALTER TYPE "public"."enum_crypto_to_fiat_currency" ADD VALUE 'PHP' BEFORE 'USDT';
  ALTER TABLE "fiat_to_crypto" ALTER COLUMN "currency" DROP DEFAULT;
  ALTER TABLE "crypto_to_fiat" ALTER COLUMN "currency" DROP DEFAULT;`)
}
