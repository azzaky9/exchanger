import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_networks_network_type" AS ENUM('mainnet', 'testnet');
  ALTER TABLE "networks" ADD COLUMN "network_type" "enum_networks_network_type" NOT NULL;
  ALTER TABLE "networks" ADD COLUMN "usdt_contract_address" varchar NOT NULL;
  ALTER TABLE "networks" ADD COLUMN "gas_fee_token_name" varchar NOT NULL;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "networks" DROP COLUMN "network_type";
  ALTER TABLE "networks" DROP COLUMN "usdt_contract_address";
  ALTER TABLE "networks" DROP COLUMN "gas_fee_token_name";
  DROP TYPE "public"."enum_networks_network_type";`)
}
