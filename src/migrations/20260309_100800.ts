import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "transactions" ALTER COLUMN "amount_php" DROP NOT NULL;
  ALTER TABLE "transactions" ALTER COLUMN "amount_usdt" SET NOT NULL;
  ALTER TABLE "transactions" ADD COLUMN "markup" numeric DEFAULT 0;
  ALTER TABLE "transactions" ADD COLUMN "profit" numeric DEFAULT 0;
  ALTER TABLE "transactions" DROP COLUMN "exchange_fee_percent";
  ALTER TABLE "transactions" DROP COLUMN "exchange_fee_usdt";
  ALTER TABLE "transactions" DROP COLUMN "net_amount_usdt";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "transactions" ALTER COLUMN "amount_usdt" DROP NOT NULL;
  ALTER TABLE "transactions" ALTER COLUMN "amount_php" SET NOT NULL;
  ALTER TABLE "transactions" ADD COLUMN "exchange_fee_percent" numeric;
  ALTER TABLE "transactions" ADD COLUMN "exchange_fee_usdt" numeric;
  ALTER TABLE "transactions" ADD COLUMN "net_amount_usdt" numeric;
  ALTER TABLE "transactions" DROP COLUMN "markup";
  ALTER TABLE "transactions" DROP COLUMN "profit";`)
}
