# Exchange Rate and Transaction Formulas

This document outlines the mathematical formulas used to calculate the exchange rate markups and transaction amounts in the Exchanger platform.

## 1. Exchange Rate Definitions (`ExchangeRate.ts`)

*   **`referenceRate`**: The market value of **1 USDT in PHP** (e.g., `58.00`).
*   **`usdtToPhpRate`**: The rate offered when a user sells USDT for PHP (e.g., `57.50`).
*   **`phpToUsdtRate`**: The rate offered when a user pays PHP for USDT, expressed in **USDT per 1 PHP** (e.g., `0.0171`).

### Markup Percentage Calculations

When creating or updating an `ExchangeRate`, the system calculates how much premium/discount is being applied compared to the `referenceRate`.

**USDT → PHP (Crypto to Fiat)**:
```javascript
diff = | referenceRate - usdtToPhpRate |
usdtToPhpMarkupPercentage = (diff / referenceRate) * 100
```

**PHP → USDT (Fiat to Crypto)**:  
Since `phpToUsdtRate` is in _USDT per PHP_, the reference rate must be converted into the same unit:
```javascript
impliedPhpToUsdt = 1 / referenceRate
diff = | impliedPhpToUsdt - phpToUsdtRate |
phpToUsdtMarkupPercentage = (diff / impliedPhpToUsdt) * 100
```

---

## 2. Transaction Math (`Transaction.ts`)

When a transaction is created, the system calculates the exact `amountUsdtOriginal`, `amountUsdt`, and `profit` based on the exchange direction.

### Crypto to Fiat (User sends USDT, gets PHP)
*   The user wants a specific `amountPhp` (e.g., `57,500 PHP`).
*   The rate they get is `usdtToPhpRate` (e.g., `1 USDT = 57.50 PHP`).
*   **Total USDT they send** (`usdtFinal`): `amountPhp / usdtToPhpRate` (e.g., `1000 USDT`).
*   **True Market Value** (`usdtOriginal`): `amountPhp / referenceRate` (e.g., `57500 / 58 = 991.38 USDT`).
*   **Our Profit**: What we received minus market value: `profit = usdtFinal - usdtOriginal` (e.g., `1000 - 991.38 = 8.62 USDT`).

### Fiat to Crypto (User sends PHP, gets USDT)
*   The user pays a specific `amountPhp` (e.g., `1,000 PHP`).
*   The rate they get is `phpToUsdtRate` (e.g., `1 PHP = 0.0171 USDT`).
*   **Total USDT they receive** (`usdtFinal`): `amountPhp * phpToUsdtRate` (e.g., `17.10 USDT`).
*   **True Market Value** (`usdtOriginal`): `amountPhp / referenceRate` (e.g., `1000 / 58 = 17.24 USDT`).
*   **Our Profit**: What we *should* have sent minus what we actually sent: `profit = usdtOriginal - usdtFinal` (e.g., `17.24 - 17.10 = 0.14 USDT`).

### The Final Code Snippet
These calculations are executed in the `beforeChange` hook logic inside `Transaction.ts` before records are saved, ensuring values are rounded to 6 decimal places:

```typescript
// Shared true market value
const usdtOriginal = data.amountPhp / originalRate

if (data.type === 'crypto_to_fiat') {
  usdtFinal = data.amountPhp / usdtToPhpRate
  profit = usdtFinal - usdtOriginal
} else {
  usdtFinal = data.amountPhp * phpToUsdtRate
  profit = usdtOriginal - usdtFinal
}
```
