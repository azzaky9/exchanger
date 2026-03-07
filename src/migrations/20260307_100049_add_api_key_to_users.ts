import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "enable_a_p_i_key" boolean;
   ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "api_key" varchar;
   ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "api_key_index" varchar;
   CREATE INDEX IF NOT EXISTS "users_api_key_idx" ON "users" USING btree ("api_key_index");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX IF EXISTS "users_api_key_idx";
   ALTER TABLE "users" DROP COLUMN IF EXISTS "enable_a_p_i_key";
   ALTER TABLE "users" DROP COLUMN IF EXISTS "api_key";
   ALTER TABLE "users" DROP COLUMN IF EXISTS "api_key_index";`)
}
