import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_received_currency" RENAME TO "enum_fiat_to_crypto_currency";
  ALTER TYPE "public"."enum_received_status" RENAME TO "enum_fiat_to_crypto_status";
  ALTER TYPE "public"."enum_received_method" RENAME TO "enum_fiat_to_crypto_method";
  ALTER TYPE "public"."enum_sending_currency" RENAME TO "enum_crypto_to_fiat_currency";
  ALTER TYPE "public"."enum_sending_status" RENAME TO "enum_crypto_to_fiat_status";
  ALTER TYPE "public"."enum_sending_method" RENAME TO "enum_crypto_to_fiat_method";
  ALTER TABLE "received" RENAME TO "fiat_to_crypto";
  ALTER TABLE "sending" RENAME TO "crypto_to_fiat";
  ALTER TABLE "payload_locked_documents_rels" RENAME COLUMN "received_id" TO "fiat_to_crypto_id";
  ALTER TABLE "payload_locked_documents_rels" RENAME COLUMN "sending_id" TO "crypto_to_fiat_id";
  ALTER TABLE "transactions" DROP CONSTRAINT "transactions_received_record_id_received_id_fk";
  
  ALTER TABLE "transactions" DROP CONSTRAINT "transactions_sending_record_id_sending_id_fk";
  
  ALTER TABLE "fiat_to_crypto" DROP CONSTRAINT "received_transaction_id_transactions_id_fk";
  
  ALTER TABLE "crypto_to_fiat" DROP CONSTRAINT "sending_transaction_id_transactions_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_received_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_sending_fk";
  
  DROP INDEX "received_transaction_idx";
  DROP INDEX "received_updated_at_idx";
  DROP INDEX "received_created_at_idx";
  DROP INDEX "sending_transaction_idx";
  DROP INDEX "sending_updated_at_idx";
  DROP INDEX "sending_created_at_idx";
  DROP INDEX "payload_locked_documents_rels_received_id_idx";
  DROP INDEX "payload_locked_documents_rels_sending_id_idx";
  ALTER TABLE "transactions" ADD CONSTRAINT "transactions_received_record_id_fiat_to_crypto_id_fk" FOREIGN KEY ("received_record_id") REFERENCES "public"."fiat_to_crypto"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "transactions" ADD CONSTRAINT "transactions_sending_record_id_crypto_to_fiat_id_fk" FOREIGN KEY ("sending_record_id") REFERENCES "public"."crypto_to_fiat"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "fiat_to_crypto" ADD CONSTRAINT "fiat_to_crypto_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "crypto_to_fiat" ADD CONSTRAINT "crypto_to_fiat_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_fiat_to_crypto_fk" FOREIGN KEY ("fiat_to_crypto_id") REFERENCES "public"."fiat_to_crypto"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_crypto_to_fiat_fk" FOREIGN KEY ("crypto_to_fiat_id") REFERENCES "public"."crypto_to_fiat"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "fiat_to_crypto_transaction_idx" ON "fiat_to_crypto" USING btree ("transaction_id");
  CREATE INDEX "fiat_to_crypto_updated_at_idx" ON "fiat_to_crypto" USING btree ("updated_at");
  CREATE INDEX "fiat_to_crypto_created_at_idx" ON "fiat_to_crypto" USING btree ("created_at");
  CREATE INDEX "crypto_to_fiat_transaction_idx" ON "crypto_to_fiat" USING btree ("transaction_id");
  CREATE INDEX "crypto_to_fiat_updated_at_idx" ON "crypto_to_fiat" USING btree ("updated_at");
  CREATE INDEX "crypto_to_fiat_created_at_idx" ON "crypto_to_fiat" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_fiat_to_crypto_id_idx" ON "payload_locked_documents_rels" USING btree ("fiat_to_crypto_id");
  CREATE INDEX "payload_locked_documents_rels_crypto_to_fiat_id_idx" ON "payload_locked_documents_rels" USING btree ("crypto_to_fiat_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_fiat_to_crypto_currency" RENAME TO "enum_received_currency";
  ALTER TYPE "public"."enum_fiat_to_crypto_status" RENAME TO "enum_received_status";
  ALTER TYPE "public"."enum_fiat_to_crypto_method" RENAME TO "enum_received_method";
  ALTER TYPE "public"."enum_crypto_to_fiat_currency" RENAME TO "enum_sending_currency";
  ALTER TYPE "public"."enum_crypto_to_fiat_status" RENAME TO "enum_sending_status";
  ALTER TYPE "public"."enum_crypto_to_fiat_method" RENAME TO "enum_sending_method";
  ALTER TABLE "fiat_to_crypto" RENAME TO "received";
  ALTER TABLE "crypto_to_fiat" RENAME TO "sending";
  ALTER TABLE "payload_locked_documents_rels" RENAME COLUMN "fiat_to_crypto_id" TO "received_id";
  ALTER TABLE "payload_locked_documents_rels" RENAME COLUMN "crypto_to_fiat_id" TO "sending_id";
  ALTER TABLE "transactions" DROP CONSTRAINT "transactions_received_record_id_fiat_to_crypto_id_fk";
  
  ALTER TABLE "transactions" DROP CONSTRAINT "transactions_sending_record_id_crypto_to_fiat_id_fk";
  
  ALTER TABLE "received" DROP CONSTRAINT "fiat_to_crypto_transaction_id_transactions_id_fk";
  
  ALTER TABLE "sending" DROP CONSTRAINT "crypto_to_fiat_transaction_id_transactions_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_fiat_to_crypto_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_crypto_to_fiat_fk";
  
  DROP INDEX "fiat_to_crypto_transaction_idx";
  DROP INDEX "fiat_to_crypto_updated_at_idx";
  DROP INDEX "fiat_to_crypto_created_at_idx";
  DROP INDEX "crypto_to_fiat_transaction_idx";
  DROP INDEX "crypto_to_fiat_updated_at_idx";
  DROP INDEX "crypto_to_fiat_created_at_idx";
  DROP INDEX "payload_locked_documents_rels_fiat_to_crypto_id_idx";
  DROP INDEX "payload_locked_documents_rels_crypto_to_fiat_id_idx";
  ALTER TABLE "transactions" ADD CONSTRAINT "transactions_received_record_id_received_id_fk" FOREIGN KEY ("received_record_id") REFERENCES "public"."received"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "transactions" ADD CONSTRAINT "transactions_sending_record_id_sending_id_fk" FOREIGN KEY ("sending_record_id") REFERENCES "public"."sending"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "received" ADD CONSTRAINT "received_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "sending" ADD CONSTRAINT "sending_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_received_fk" FOREIGN KEY ("received_id") REFERENCES "public"."received"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_sending_fk" FOREIGN KEY ("sending_id") REFERENCES "public"."sending"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "received_transaction_idx" ON "received" USING btree ("transaction_id");
  CREATE INDEX "received_updated_at_idx" ON "received" USING btree ("updated_at");
  CREATE INDEX "received_created_at_idx" ON "received" USING btree ("created_at");
  CREATE INDEX "sending_transaction_idx" ON "sending" USING btree ("transaction_id");
  CREATE INDEX "sending_updated_at_idx" ON "sending" USING btree ("updated_at");
  CREATE INDEX "sending_created_at_idx" ON "sending" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_received_id_idx" ON "payload_locked_documents_rels" USING btree ("received_id");
  CREATE INDEX "payload_locked_documents_rels_sending_id_idx" ON "payload_locked_documents_rels" USING btree ("sending_id");`)
}
