# Exchange Rate Formulas and Logic

This document explains the mathematics and logic behind the Exchange Rates and Transactions inside the Exchanger Lotto system.

## 1. The Base Pair: PHP to USD
The system fetches global exchange rates from the API using the base pair **`PHP/USD`**.
- This means the rate represents **how much 1 PHP is worth in USD**.
- Example Rate: **`0.0177`** (1 Peso is worth ~0.0177 USD).

Because the value of 1 PHP is a fraction of a USD, translating PHP into USDT (which is pegged 1:1 to USD) uses **multiplication**.

---

## 2. Converting PHP to USDT (Multiplication)
When a customer deposits PHP, the system calculates how much USDT they receive by multiplying their PHP by the Exchange Rate.

**Formula:**
`Received USDT = Amount (PHP) × Exchange Rate`

**Example:**
- Customer wants to exchange: **10,000 PHP**
- Original Exchange Rate: **0.0177**
- True Value (Original USDT): `10,000 × 0.0177` = **177.00 USDT**

---

## 3. How Profit Works (The Markup Rate)
Because we are using multiplication with a fractional rate (`0.0177`), **to make a profit, you must give the customer a LOWER exchange rate than the original.**

If you give them a lower rate, the multiplication results in a smaller amount of USDT for the customer, keeping the difference in your treasury as profit.

**Example Scenario:**
- Original Rate: **0.0177**
- Admin sets Markup Rate to: **0.0170**
- Input Amount: **10,000 PHP**

**Calculations:**
1. **Calculated USDT (Original Rate):** `10,000 × 0.0177` = **177.00 USDT** (The true market pool).
2. **Total USDT to Send (Markup / Customer Rate):** `10,000 × 0.0170` = **170.00 USDT** (What the customer gets).
3. **Profit:** `177.00 USDT - 170.00 USDT` = **7.00 USDT** (Kept by the platform).

*Rule of Thumb: Lowering the rate by `0.0001` increases your profit margin.*

---

## 4. Directional Logic: Fiat-to-Crypto vs Crypto-to-Fiat

The system dynamically adjusts labels and profit math based on the **Transaction Type**.

### Flow A: Fiat to Crypto (Sending USDT)
- **Goal:** Customer gives PHP, you give them USDT.
- **Profit Strategy:** Give them **fewer** USDT than the true market value.
- **Rate Requirement:** `Markup Rate < Original Rate`.
- **Profit Formula:** `USDT (Original) - USDT (Final) = Profit`.

### Flow B: Crypto to Fiat (Receiving USDT)
- **Goal:** Customer gives USDT (e.g. to vault), you give them PHP.
- **Profit Strategy:** Customer must send **more** USDT than the true market value of the PHP they want.
- **Rate Requirement:** `Markup Rate > Original Rate`.
- **Profit Formula:** `USDT (Final) - USDT (Original) = Profit`.

---

## 5. The Markup Percentage Formula
Inside the **Exchange Rates** creation page, the system automatically calculates the exact profit percentage you are taking. 

**Formula:**
`Markup Percentage (%) = ((Original Rate - Markup Rate) / Original Rate) × 100`

*Note: The formula is designed to show a positive percentage when you configured the rates for a standard profit margin in the PHP/USD multiplication model.*
