# Formula Mathematics Audit

Date: 2026-04-15
Scope: Financial/exchange formulas used in rate setup, transaction computation, endpoint payload semantics, and dashboard summaries.

## Reviewed Sources

- src/collections/ExchangeRate.ts
- src/collections/Transaction.ts
- src/endpoints/createExchange.ts
- src/endpoints/createExchangeBatch.ts
- src/endpoints/finance-summary.ts
- src/collections/FiatToCrypto.ts
- src/collections/CryptoToFiat.ts
- src/components/ProfitPercentageCell.tsx
- src/components/ExchangeOperationsSummaryBanner.tsx
- src/components/TransactionSummaryBanner.tsx
- formula.md
- docs/EXCHANGE_RATE_FORMULAS.md

## Notation

- `R_ref_u2p`: USDT->PHP reference rate (`usdtToPhpReferenceRate`)
- `R_app_u2p`: USDT->PHP applied/final rate (`usdtToPhpRate`)
- `R_ref_p2u`: PHP->USDT reference rate (`phpToUsdtReferenceRate`)
- `R_app_p2u`: PHP->USDT applied/final rate (`phpToUsdtRate`)
- `A_src`: source amount from request, stored in `transaction.amountPhp`
- `A_final`: final payout amount, stored in `transaction.amountUsdt`
- `A_orig_usdt`: `transaction.amountUsdtOriginal`
- `P_usdt`: `transaction.profit`
- `round6(x) = Math.round(x * 1_000_000) / 1_000_000`
- `round2(x) = Math.round(x * 100) / 100`

## 1) Exchange Rate Math (ExchangeRate.ts)

### 1.1 USDT->PHP side

When admin edits percentage/reference:

`R_app_u2p = round6(R_ref_u2p * (1 - pct/100))`

When admin edits rate (or no edit sentinel):

`pct = round2(abs(R_ref_u2p - R_app_u2p) / R_ref_u2p * 100)`

Spread values:

- `spread_u2p = round6(abs(R_ref_u2p - R_app_u2p))`
- `spreadPct_u2p = round2(abs(R_ref_u2p - R_app_u2p) / R_ref_u2p * 100)`

### 1.2 PHP->USDT side

When admin edits percentage/reference:

`R_app_p2u = round6(R_ref_p2u * (1 - pct/100))`

When admin edits rate (or no edit sentinel):

`pct = round2(abs(R_ref_p2u - R_app_p2u) / R_ref_p2u * 100)`

Spread values:

- `spread_p2u = round6(abs(R_ref_p2u - R_app_p2u))`
- `spreadPct_p2u = round2(abs(R_ref_p2u - R_app_p2u) / R_ref_p2u * 100)`

### Verdict

- Formula implementation is internally consistent.
- Markup/spread percentages are absolute values, so they do not carry direction (discount vs premium).

## 2) Transaction Math (Transaction.ts beforeChange)

Source amount for both flows is `A_src = amountPhp`.

### 2.1 Fiat->Crypto (`type = fiat_to_crypto`)

- User sends PHP (`A_src`)
- User receives USDT (`A_final`)

Formulas:

- `A_orig_usdt = A_src * R_ref_p2u`
- `A_final = A_src * R_app_p2u`
- `P_usdt = A_orig_usdt - A_final`

Storage rounding:

- `amountUsdtOriginal = round6(A_orig_usdt)`
- `amountUsdt = round6(A_final)`
- `profit = round6(P_usdt)`

### 2.2 Crypto->Fiat (`type = crypto_to_fiat`)

- User sends USDT (`A_src`)
- User receives PHP (`A_final`)

Formulas:

- `A_final = A_src * R_app_u2p` (PHP payout)
- `A_orig_usdt = A_final / R_ref_u2p`
- `P_php = (A_src * R_ref_u2p) - A_final`
- `P_usdt = P_php / R_ref_u2p`

Equivalent simplification:

- `P_usdt = A_src - A_orig_usdt`

Storage rounding:

- `amountUsdtOriginal = round6(A_orig_usdt)`
- `amountUsdt = round2(A_final)` (PHP precision)
- `profit = round6(P_usdt)`

### Verdict

- Current formulas are coherent and match the recent spread behavior requirement (example: 10.00 USDT source can map to 9.80 USDT original-rate equivalent with 2% spread).
- Data model intentionally reuses `amountPhp` as the source amount field for both flows.

## 3) Endpoint Semantics (createExchange/createExchangeBatch)

Both endpoints pass source amount into transaction `amountPhp`:

- Fiat->Crypto: `amountPhp = source PHP`
- Crypto->Fiat: `amountPhp = source USDT`

Response mapping:

- Fiat->Crypto: user sends PHP, user receives USDT (`transaction.amountUsdt`)
- Crypto->Fiat: user sends USDT, user receives PHP (`transaction.amountUsdt`)

### Verdict

- Endpoint semantics match transaction formulas.

## 4) Profit Percentage Math

### 4.1 Transactions list cell (ProfitPercentageCell.tsx)

`pct = profit / baseline * 100`

Baselines:

- Fiat->Crypto baseline: `amountUsdtOriginal`
- Crypto->Fiat baseline: `amountPhp` (source USDT in current model)

### 4.2 CryptoToFiat collection detail

Primary method:

`pct = abs(referenceRateSnapshot - appliedRateSnapshot) / referenceRateSnapshot * 100`

Fallback method:

`pct = profit / amountUsdtOriginal * 100`

### 4.3 FiatToCrypto collection detail

`pct = profit / amountUsdtOriginal * 100`

### Verdict

- Formulas are valid but not fully unified across screens (baseline-based vs rate-delta-based).
- Values can differ slightly across views for the same transaction.

## 5) Summary/Dashboard Math

## 5.1 ExchangeOperationsSummaryBanner

Per operation row:

- `totalExchange += transaction.amountPhp`
- `totalReceives += transaction.amountUsdt`
- `totalRevenue += transaction.profit` (admin only)

Display unit changes by page:

- Fiat->Crypto page: exchange as PHP, receives as USDT
- Crypto->Fiat page: exchange as USDT, receives as PHP

## 5.2 finance-summary endpoint

Accumulators by transaction type:

- Fiat->Crypto:
  - `volumePhp += amountPhp`
  - `volumeUsdt += amountUsdt`
  - `profitUsdt += profit`
- Crypto->Fiat:
  - `volumeUsdt += amountPhp`
  - `volumePhp += amountUsdt`
  - `profitPhp += profit`

Pending sent totals:

- Fiat->Crypto pending sent USDT: `pendingSentUsdt += amountUsdt`
- Crypto->Fiat pending sent PHP: `pendingSentPhp += amountUsdt`

### Verdict

- Dashboard math aligns with current data model and currency flow interpretation.
- `profitPhp` naming is misleading because `profit` is stored in USDT; this is a label/semantic issue, not a numeric bug.

## 6) Findings Against Existing Documentation

## Finding A: formula.md is outdated for current model

Issue:

- Describes older model with `referenceRate` as single source and crypto->fiat using inverse/division from desired PHP amount.

Current code reality:

- Uses directional snapshots (`referenceRateSnapshot`, `appliedRateSnapshot`) and source amount in `amountPhp` for both flows.

Impact:

- Medium documentation mismatch; can mislead future development or QA.

## Finding B: docs/EXCHANGE_RATE_FORMULAS.md has directional logic mismatch

Issue:

- States crypto->fiat profit requires markup rate greater than original.

Current code reality:

- Profit is positive when applied rate is lower than reference for both directional pairs in current implementation.

Impact:

- Medium documentation mismatch; onboarding and operations confusion risk.

## Finding C: Profit % display formulas differ by screen

Issue:

- Some screens use `profit/baseline`, while CryptoToFiat detail prefers rate-delta percentage.

Impact:

- Low-medium consistency risk (users/admin may see slightly different percentages for same row across views).

## 7) Recommended Actions

1. Replace formula.md with this audited model or archive it as legacy.
2. Update docs/EXCHANGE_RATE_FORMULAS.md to reflect current directional rates and sign behavior.
3. Standardize one profit percentage definition across all tables/cards/components.
4. Consider renaming finance-summary `profitPhp` to `profitUsdtFromCryptoToFiat` (or equivalent) to avoid unit confusion.

## 8) Overall Result

- Core computation formulas in active code paths are mathematically coherent: PASS
- Documentation parity with implementation: FAIL (needs update)
- Cross-view percentage definition consistency: PARTIAL
