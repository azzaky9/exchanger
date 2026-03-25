import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "order_id" varchar;
  CREATE UNIQUE INDEX IF NOT EXISTS "transactions_order_id_idx" ON "transactions" USING btree ("order_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX IF EXISTS "transactions_order_id_idx";
  ALTER TABLE "transactions" DROP COLUMN IF EXISTS "order_id";`)
}
