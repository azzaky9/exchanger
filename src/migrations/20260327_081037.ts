import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_received_currency" AS ENUM('PHP', 'USDT');
  CREATE TYPE "public"."enum_received_status" AS ENUM('pending', 'confirmed');
  CREATE TYPE "public"."enum_received_method" AS ENUM('bank_transfer', 'crypto');
  CREATE TYPE "public"."enum_sending_currency" AS ENUM('PHP', 'USDT');
  CREATE TYPE "public"."enum_sending_status" AS ENUM('pending', 'processing', 'completed', 'failed');
  CREATE TYPE "public"."enum_sending_method" AS ENUM('bank_transfer', 'crypto');
  CREATE TABLE "received" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"amount" numeric NOT NULL,
  	"currency" "enum_received_currency" NOT NULL,
  	"transaction_id" integer NOT NULL,
  	"status" "enum_received_status" DEFAULT 'pending' NOT NULL,
  	"method" "enum_received_method",
  	"reference_number" varchar,
  	"sender_address" varchar,
  	"tx_hash" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "sending" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"amount" numeric NOT NULL,
  	"currency" "enum_sending_currency" NOT NULL,
  	"transaction_id" integer NOT NULL,
  	"status" "enum_sending_status" DEFAULT 'pending' NOT NULL,
  	"method" "enum_sending_method",
  	"tx_hash" varchar,
  	"receiver_details" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "treasury" ALTER COLUMN "private_key" DROP NOT NULL;
  ALTER TABLE "transactions" ALTER COLUMN "target_address" DROP NOT NULL;
  ALTER TABLE "transactions" ADD COLUMN "bank_details" varchar;
  ALTER TABLE "transactions" ADD COLUMN "received_record_id" integer;
  ALTER TABLE "transactions" ADD COLUMN "sending_record_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "received_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "sending_id" integer;
  ALTER TABLE "received" ADD CONSTRAINT "received_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "sending" ADD CONSTRAINT "sending_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "received_transaction_idx" ON "received" USING btree ("transaction_id");
  CREATE INDEX "received_updated_at_idx" ON "received" USING btree ("updated_at");
  CREATE INDEX "received_created_at_idx" ON "received" USING btree ("created_at");
  CREATE INDEX "sending_transaction_idx" ON "sending" USING btree ("transaction_id");
  CREATE INDEX "sending_updated_at_idx" ON "sending" USING btree ("updated_at");
  CREATE INDEX "sending_created_at_idx" ON "sending" USING btree ("created_at");
  ALTER TABLE "transactions" ADD CONSTRAINT "transactions_received_record_id_received_id_fk" FOREIGN KEY ("received_record_id") REFERENCES "public"."received"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "transactions" ADD CONSTRAINT "transactions_sending_record_id_sending_id_fk" FOREIGN KEY ("sending_record_id") REFERENCES "public"."sending"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_received_fk" FOREIGN KEY ("received_id") REFERENCES "public"."received"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_sending_fk" FOREIGN KEY ("sending_id") REFERENCES "public"."sending"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "transactions_received_record_idx" ON "transactions" USING btree ("received_record_id");
  CREATE INDEX "transactions_sending_record_idx" ON "transactions" USING btree ("sending_record_id");
  CREATE INDEX "payload_locked_documents_rels_received_id_idx" ON "payload_locked_documents_rels" USING btree ("received_id");
  CREATE INDEX "payload_locked_documents_rels_sending_id_idx" ON "payload_locked_documents_rels" USING btree ("sending_id");
  ALTER TABLE "exchange_rates" DROP COLUMN "_lastedited";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "received" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "sending" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "received" CASCADE;
  DROP TABLE "sending" CASCADE;
  ALTER TABLE "transactions" DROP CONSTRAINT "transactions_received_record_id_received_id_fk";
  
  ALTER TABLE "transactions" DROP CONSTRAINT "transactions_sending_record_id_sending_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_received_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_sending_fk";
  
  DROP INDEX "transactions_received_record_idx";
  DROP INDEX "transactions_sending_record_idx";
  DROP INDEX "payload_locked_documents_rels_received_id_idx";
  DROP INDEX "payload_locked_documents_rels_sending_id_idx";
  ALTER TABLE "treasury" ALTER COLUMN "private_key" SET NOT NULL;
  ALTER TABLE "transactions" ALTER COLUMN "target_address" SET NOT NULL;
  ALTER TABLE "exchange_rates" ADD COLUMN "_lastedited" varchar;
  ALTER TABLE "transactions" DROP COLUMN "bank_details";
  ALTER TABLE "transactions" DROP COLUMN "received_record_id";
  ALTER TABLE "transactions" DROP COLUMN "sending_record_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "received_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "sending_id";
  DROP TYPE "public"."enum_received_currency";
  DROP TYPE "public"."enum_received_status";
  DROP TYPE "public"."enum_received_method";
  DROP TYPE "public"."enum_sending_currency";
  DROP TYPE "public"."enum_sending_status";
  DROP TYPE "public"."enum_sending_method";`)
}
