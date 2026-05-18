import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'gic' AND enumtypid = 'public.enum_users_roles'::regtype) THEN
        ALTER TYPE "public"."enum_users_roles" ADD VALUE 'gic';
      END IF;
    END $$;
  `)
  await db.execute(sql`
    ALTER TABLE "exchange_rates" ALTER COLUMN "spinzo_fee" SET DEFAULT 0.2;
    ALTER TABLE "exchange_rates" ALTER COLUMN "gic_fee" SET DEFAULT 0.2;
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "users_roles" ALTER COLUMN "value" SET DATA TYPE text;
  DROP TYPE "public"."enum_users_roles";
  CREATE TYPE "public"."enum_users_roles" AS ENUM('admin', 'user', 'arca');
  ALTER TABLE "users_roles" ALTER COLUMN "value" SET DATA TYPE "public"."enum_users_roles" USING "value"::"public"."enum_users_roles";
  ALTER TABLE "exchange_rates" ALTER COLUMN "spinzo_fee" SET DEFAULT 0;
  ALTER TABLE "exchange_rates" ALTER COLUMN "gic_fee" SET DEFAULT 0;`)
}
