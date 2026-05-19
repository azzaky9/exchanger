-- CreateEnum
CREATE TYPE "enum_networks_network_category" AS ENUM ('evm', 'svm', 'btc');

-- AlterTable
ALTER TABLE "networks" ADD COLUMN     "network_category" "enum_networks_network_category" NOT NULL DEFAULT 'evm';

-- AlterTable
ALTER TABLE "transactions" ALTER COLUMN "exchange_rate_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_exchange_rate_id_fkey" FOREIGN KEY ("exchange_rate_id") REFERENCES "exchange_rates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
