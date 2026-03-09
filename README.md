---
layout: default
title: Exchanger Lotto API Docs
description: A fiat-to-crypto exchange platform built with Payload CMS and Next.js.
theme: jekyll-theme-merlot
---

# Exchanger Lotto

A fiat-to-crypto exchange platform built with Payload CMS and Next.js. Users submit PHP amounts, the system auto-calculates USDT conversion with fees, and processes on-chain transfers via configurable blockchain networks.

---

## API Integration Guide

Base URL: `https://your-domain.com`

### Authentication

All API endpoints (except the fiat settlement webhook) require authentication. Two methods are supported:

#### Option 1: API Key (Recommended for server-to-server)

Each user account can have an API key generated from the admin panel. Send it in the `Authorization` header:

```
Authorization: users API-Key YOUR_API_KEY_HERE
```

**How to get an API key:**
1. An admin creates a user account in the Payload admin panel (Users collection)
2. On the user's edit page, scroll to the **API Key** section and click **Enable API Key**
3. Copy the generated key — it will only be shown once
4. Use the key in all API requests as shown above

**Example with cURL:**

```bash
curl -H "Authorization: users API-Key xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" \
  https://your-domain.com/api/networks/available
```

#### Option 2: JWT Token (For session-based apps)

Login with email/password to get a JWT token, then use it for subsequent requests.

**Login:**

```
POST /api/users/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your-password"
}
```

**Response:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "id": 1, "email": "user@example.com" },
  "exp": 3600
}
```

**Use the token:**

```
Authorization: JWT eyJhbGciOiJIUzI1NiIs...
```

---

### 1. List Available Networks

Fetch active blockchain networks the user can choose for their exchange.

```
GET /api/networks/available
Authorization: users API-Key YOUR_API_KEY
```

**Response:**

```json
{
  "networks": [
    {
      "id": 1,
      "name": "BEP20 (BSC)",
      "symbol": "bep20",
      "networkType": "mainnet",
      "gasFeeTokenName": "BNB"
    },
    {
      "id": 2,
      "name": "Ethereum",
      "symbol": "eth",
      "networkType": "mainnet",
      "gasFeeTokenName": "ETH"
    }
  ]
}
```

### 2. Create Exchange Transaction

Submit a fiat-to-crypto exchange request. The system auto-calculates the exchange rate, fees, and net USDT. A treasury wallet is automatically assigned based on the chosen network.

```
POST /api/transactions/create-exchange
Content-Type: application/json
Authorization: users API-Key YOUR_API_KEY
```

**Request Body:**

| Field           | Type   | Required | Description                           |
| --------------- | ------ | -------- | ------------------------------------- |
| `amountPhp`     | number | Yes      | Amount in Philippine Peso             |
| `network`       | number | Yes      | Network ID (from the available list)  |
| `targetAddress` | string | Yes      | User's wallet address to receive USDT |

**Example Request:**

```json
{
  "amountPhp": 5000,
  "network": 1,
  "targetAddress": "0x1234567890abcdef1234567890abcdef12345678"
}
```

**Response:**

```json
{
  "success": true,
  "transaction": {
    "id": 42,
    "type": "fiat_to_crypto",
    "amountPhp": 5000,
    "exchangeRate": 0.017543,
    "amountUsdt": 87.72,
    "exchangeFeePercent": 2,
    "exchangeFeeUsdt": 1.75,
    "netAmountUsdt": 85.97,
    "network": 1,
    "targetAddress": "0x1234567890abcdef1234567890abcdef12345678",
    "status": "awaiting_fiat",
    "createdAt": "2026-03-07T12:00:00.000Z"
  }
}
```

**Error Responses:**

| Status | Reason                                          |
| ------ | ----------------------------------------------- |
| 401    | Unauthorized — missing or invalid credentials  |
| 400    | Missing/invalid fields, inactive network        |
| 400    | No treasury wallet available for chosen network |
| 500    | Exchange rate API failure                        |

### 3. Fiat Settlement Webhook

After the user completes the fiat payment through your payment gateway, call this webhook to notify the exchanger that fiat has been received. The transaction status will be updated to `fiat_received`, which queues it for automatic crypto transfer.

```
POST /api/transactions/webhook/fiat-settlement
Content-Type: application/json
x-webhook-signature: sha256=<HMAC-SHA256 hex digest>
```

**Request Body:**

| Field              | Type   | Required | Description                        |
| ------------------ | ------ | -------- | ---------------------------------- |
| `transactionId`    | number | Yes      | Transaction ID from step 2         |
| `fiatSettlementId` | string | Yes      | Your payment reference / ID        |

**Example Request:**

```json
{
  "transactionId": 42,
  "fiatSettlementId": "PAY-20260307-ABC123"
}
```

**Response:**

```json
{
  "success": true,
  "transaction": {
    "id": 42,
    "status": "fiat_received",
    "fiatSettlementId": "PAY-20260307-ABC123"
  }
}
```

**Error Responses:**

| Status | Reason                                          |
| ------ | ----------------------------------------------- |
| 400    | Missing/invalid fields                          |
| 401    | Missing or invalid `x-webhook-signature` header |
| 404    | Transaction not found                           |
| 409    | Transaction is not in `awaiting_fiat` status    |
| 500    | `WEBHOOK_SECRET` not configured on server       |

#### Webhook Signature

All webhook requests must be signed with HMAC-SHA256 using the shared `WEBHOOK_SECRET`. The signature is sent in the `x-webhook-signature` header.

**How to sign (Node.js example):**

```js
const crypto = require('crypto');

const body = JSON.stringify({ transactionId: 42, fiatSettlementId: 'PAY-20260307-ABC123' });
const signature = 'sha256=' + crypto.createHmac('sha256', WEBHOOK_SECRET).update(body).digest('hex');

// Send with header: x-webhook-signature: <signature>
```

**How to sign (Python example):**

```python
import hmac, hashlib, json

body = json.dumps({"transactionId": 42, "fiatSettlementId": "PAY-20260307-ABC123"})
signature = "sha256=" + hmac.new(WEBHOOK_SECRET.encode(), body.encode(), hashlib.sha256).hexdigest()

# Send with header: x-webhook-signature: <signature>
```

### Transaction Lifecycle

```
awaiting_fiat → fiat_received → crypto_transfer_pending → completed
                                                        ↘ review_needed (on failure → retryable from admin)
```

1. **`awaiting_fiat`** — Transaction created, waiting for fiat payment
2. **`fiat_received`** — Fiat settlement confirmed via webhook; transaction is queued for batching
3. **`crypto_transfer_pending`** — Batch collector picked up the transaction; on-chain transfer in progress
4. **`completed`** — USDT successfully transferred to user's wallet
5. **`review_needed`** — Transfer failed; admin can retry from the Payload admin panel
