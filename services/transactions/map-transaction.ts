import { format } from "date-fns";

export function mapTransaction(t: any, role: string) {
    const isFiatToCrypto = t.type === "fiat_to_crypto";
    const amountUsdt = Number(t.amount_usdt || 0);

    // Calculate GIC/Spinzo profits
    let gicProfitUsdt = 0;
    let spinzoProfitUsdt = 0;
    let spreadPercentage = 0;

    if (t.exchange_rate) {
        if (isFiatToCrypto) {
            const gicFee = Number(t.exchange_rate.php_to_usdt_gic_fee || 0);
            const spinzoFee = Number(t.exchange_rate.php_to_usdt_spinzo_fee || 0);
            spreadPercentage = Number(t.exchange_rate.php_to_usdt_spread_percentage || 0);

            const totalSpread = gicFee + spinzoFee;
            if (totalSpread > 0) {
                const totalProfitUsdt = Number(t.profit || 0);
                gicProfitUsdt = totalProfitUsdt * (gicFee / totalSpread);
                spinzoProfitUsdt = totalProfitUsdt * (spinzoFee / totalSpread);
            }
        } else {
            const gicFee = Number(t.exchange_rate.usdt_to_php_gic_fee || 0);
            const spinzoFee = Number(t.exchange_rate.usdt_to_php_spinzo_fee || 0);
            spreadPercentage = Number(t.exchange_rate.usdt_to_php_spread_percentage || 0);

            const totalSpread = gicFee + spinzoFee;
            if (totalSpread > 0) {
                const totalProfitUsdt = Number(t.profit || 0);
                gicProfitUsdt = totalProfitUsdt * (gicFee / totalSpread);
                spinzoProfitUsdt = totalProfitUsdt * (spinzoFee / totalSpread);
            }
        }
    }

    let displayRate = "-";
    if (t.exchange_rate) {
        if (isFiatToCrypto) {
            const refRate = Number(t.reference_rate_snapshot || t.exchange_rate.php_to_usdt_reference_rate || 0);
            const appliedRate = Number(
                t.applied_rate_snapshot ||
                t.rate_snapshot ||
                t.php_to_usdt_rate_snapshot ||
                t.exchange_rate.php_to_usdt_rate ||
                0
            );
            if (role === "gic") {
                const spinzoFee = Number(t.exchange_rate.php_to_usdt_spinzo_fee || 0);
                const usdtToPhpRef = Number(
                    t.usdt_to_php_reference_rate_snapshot ||
                    t.exchange_rate.usdt_to_php_reference_rate ||
                    (refRate > 0 ? 1 / refRate : 1)
                );
                const spinzoRate = spinzoFee / (usdtToPhpRef * usdtToPhpRef);
                const defaultRate = refRate - spinzoRate;
                displayRate = `1 PHP = ${defaultRate.toFixed(6)} USDT`;
            } else if (role === "lotto") {
                const rate = appliedRate || refRate;
                displayRate = `1 PHP = ${rate.toFixed(6)} USDT`;
            } else {
                displayRate = `1 PHP = ${refRate.toFixed(6)} USDT`;
            }
        } else {
            const refRate = Number(t.reference_rate_snapshot || t.exchange_rate.usdt_to_php_reference_rate || 0);
            const appliedRate = Number(
                t.applied_rate_snapshot ||
                t.rate_snapshot ||
                t.usdt_to_php_rate_snapshot ||
                t.exchange_rate.usdt_to_php_rate ||
                0
            );
            if (role === "gic") {
                const spinzoFee = Number(t.exchange_rate.usdt_to_php_spinzo_fee || 0);
                const defaultRate = refRate - spinzoFee;
                displayRate = `1 USDT = ${defaultRate.toFixed(2)} PHP`;
            } else if (role === "lotto") {
                const rate = appliedRate || refRate;
                displayRate = `1 USDT = ${rate.toFixed(2)} PHP`;
            } else {
                displayRate = `1 USDT = ${refRate.toFixed(2)} PHP`;
            }
        }
    }

    return {
      id: t.id.toString(),
      orderId: t.order_id || "-",
      type: t.type,
      status: t.status,
      totalAmountSent: isFiatToCrypto
          ? `₱${Number(t.amount_php).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
          : `${amountUsdt.toFixed(6)} USDT`,
      totalReceived: isFiatToCrypto
          ? `${amountUsdt.toFixed(6)} USDT`
          : `₱${Number(t.amount_php).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      exchangeRate: displayRate,
      profitUsdt: `${Number(t.profit || 0).toFixed(6)} USDT`,
      profitPercentage: amountUsdt > 0
          ? `${((Number(t.profit || 0) / amountUsdt) * 100).toFixed(2)}%`
          : "0.00%",
      gicProfit: `${gicProfitUsdt.toFixed(6)} USDT`,
      spinzoProfit: `${spinzoProfitUsdt.toFixed(6)} USDT`,
      transactionProfitSpread: `${spreadPercentage.toFixed(2)}%`,
      targetAddress: t.target_address || "-",
      treasuryAddress: t.treasury?.wallet_address || "-",
      networkSymbol: t.treasury?.network?.symbol?.toLowerCase() || "",
      txHash: t.tx_hash || "-",
      bankDetails: t.bank_details ? (() => { try { return JSON.parse(t.bank_details) } catch { return null } })() : null,
      invoiceUrl: t.invoiceMedia?.url || null,
      createdAt: format(new Date(t.created_at), "MMM d, yyyy h:mm a"),
      lastUpdated: format(new Date(t.updated_at), "MMM d, yyyy h:mm a"),
      lastUpdatedBy: "Admin", // Static for now
    }
}
