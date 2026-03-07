import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "transactions" ADD COLUMN "exchange_fee_percent" numeric;
  ALTER TABLE "transactions" ADD COLUMN "exchange_fee_usdt" numeric;
  ALTER TABLE "transactions" ADD COLUMN "net_amount_usdt" numeric;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "transactions" DROP COLUMN "exchange_fee_percent";
  ALTER TABLE "transactions" DROP COLUMN "exchange_fee_usdt";
  ALTER TABLE "transactions" DROP COLUMN "net_amount_usdt";`)
}
