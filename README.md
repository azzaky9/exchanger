# Exchanger Lotto

A fiat-to-crypto and crypto-to-fiat exchange platform built with Payload CMS and Next.js. Users submit the USDT amount they need, an admin sets the exchange rate and markup, and the system processes on-chain transfers via configurable blockchain networks.

## Runtime Setup

This project uses Bun for package management and script execution.

### Install and run

```bash
bun install
bun run dev
```

### Required environment variables

```bash
PAYLOAD_SECRET=your_payload_secret
DATABASE_URL=postgresql://user:password@host:5432/dbname
```

### Optional S3 storage for media uploads

When the S3 variables below are set, Payload stores media in your S3 bucket. If they are not set, Payload falls back to local storage.

```bash
S3_BUCKET=your-bucket-name
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
S3_HOST=sgp1.vultrobjects.com
S3_HOST_BUCKET=exchange.sgp1.vultrobjects.com
S3_FORCE_PATH_STYLE=false
```

---

## API Integration Guide

Base URL: `https://exc-api-stag.spinzo.io`

### Authentication

All API endpoints require authentication. Two methods are supported:

#### Option 1: API Key (Recommended for server-to-server)

Each user account can have an API key generated from the admin panel. Send it in the `Authorization` header:

```
Authorization: users API-Key s3cret
```

**How to get an API key:**
1. An admin creates a user account in the Payload admin panel (Users collection)
2. On the user's edit page, scroll to the **API Key** section and click **Enable API Key**
3. Copy the generated key — it will only be shown once
4. Use the key in all API requests as shown above

**Example with cURL:**

```bash
curl -H "Authorization: users API-Key xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" \
  https://exc-api-stag.spinzo.io/api/networks/available
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

Submit an exchange request (fiat-to-crypto or crypto-to-fiat). The user specifies the USDT amount they need. A treasury wallet is automatically assigned based on the chosen network. The exchange rate and markup are set later by an admin in the panel, and the PHP amount is auto-computed.

```
POST /api/transactions/create-exchange
Content-Type: application/json
Authorization: users API-Key YOUR_API_KEY
```

**Request Body:**

| Field           | Type   | Required | Description                                                  |
| --------------- | ------ | -------- | ------------------------------------------------------------ |
| `type`          | string | Yes      | `fiat_to_crypto` or `crypto_to_fiat`                         |
| `amountUsdt`    | number | Yes      | Amount of USDT                                               |
| `network`       | number | Yes      | Network ID (from the available list)                         |
| `targetAddress` | string | Yes      | Destination wallet address to receive USDT                   |

**Example Request:**

```json
{
  "type": "fiat_to_crypto",
  "amountUsdt": 100,
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
    "amountUsdt": 100,
    "network": 1,
    "targetAddress": "0x1234567890abcdef1234567890abcdef12345678",
    "status": "awaiting_fiat",
    "createdAt": "2026-03-07T12:00:00.000Z"
  }
}
```

> **Note:** `exchangeRate`, `markup`, and `amountPhp` are not returned on creation. An admin sets the exchange rate and markup from the admin panel after the transaction is created. The PHP amount is then auto-computed as: `amountUsdt × exchangeRate × (1 + markup%)`.

**Error Responses:**

| Status | Reason                                          |
| ------ | ----------------------------------------------- |
| 401    | Unauthorized — missing or invalid credentials  |
| 400    | Invalid `type` — must be `fiat_to_crypto` or `crypto_to_fiat` |
| 400    | Missing/invalid fields, inactive network        |
| 400    | No treasury wallet available for chosen network |

### 3. Check Settlement Status

Allows a third-party vault to check whether fiat has been settled for a given transaction. Fiat settlement is confirmed manually by an admin in the admin panel — this endpoint lets external systems poll the current status.

```
GET /api/transactions/check-settlement/:id
Authorization: users API-Key YOUR_API_KEY
```

**Path Parameters:**

| Parameter | Type   | Description              |
| --------- | ------ | ------------------------ |
| `id`      | number | Transaction ID to check  |

**Example Request:**

```bash
curl -H "Authorization: users API-Key YOUR_API_KEY" \
  https://exc-api-stag.spinzo.io/api/transactions/check-settlement/42
```

**Response (fiat not yet settled):**

```json
{
  "success": true,
  "transaction": {
    "id": 42,
    "type": "fiat_to_crypto",
    "amountUsdt": 100,
    "status": "awaiting_fiat",
    "fiatSettled": false,
    "fiatSettlementId": null,
    "txHash": null,
    "createdAt": "2026-03-07T12:00:00.000Z",
    "updatedAt": "2026-03-07T12:00:00.000Z"
  }
}
```

**Response (fiat settled, crypto completed):**

```json
{
  "success": true,
  "transaction": {
    "id": 42,
    "type": "fiat_to_crypto",
    "amountUsdt": 100,
    "status": "completed",
    "fiatSettled": true,
    "fiatSettlementId": "PAY-20260307-ABC123",
    "txHash": "0xabc123...",
    "createdAt": "2026-03-07T12:00:00.000Z",
    "updatedAt": "2026-03-07T14:30:00.000Z"
  }
}
```

**Response Fields:**

| Field              | Type    | Description                                                    |
| ------------------ | ------- | -------------------------------------------------------------- |
| `fiatSettled`      | boolean | `true` once admin has confirmed fiat receipt                   |
| `fiatSettlementId` | string  | Admin-provided payment reference (null if not yet settled)     |
| `txHash`           | string  | On-chain transaction hash (null if transfer not yet completed) |
| `status`           | string  | Current transaction status (see lifecycle below)               |

**Error Responses:**

| Status | Reason                                        |
| ------ | --------------------------------------------- |
| 401    | Unauthorized — missing or invalid credentials |
| 400    | Missing or invalid transaction ID             |
| 404    | Transaction not found                         |

### Transaction Lifecycle

```
awaiting_fiat → fiat_received → crypto_transfer_pending → completed
                                                        ↘ review_needed (on failure → retryable from admin)
```

1. **`awaiting_fiat`** — Transaction created, waiting for admin to confirm fiat payment
2. **`fiat_received`** — Fiat settlement confirmed by admin in the panel; transaction is queued for batching
3. **`crypto_transfer_pending`** — Batch collector picked up the transaction; on-chain transfer in progress
4. **`completed`** — USDT successfully transferred to user's wallet
5. **`review_needed`** — Transfer failed; admin can retry from the Payload admin panel
