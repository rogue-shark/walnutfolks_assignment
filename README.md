# 💸 Intent Farm Webhook Processor Backend Service

This backend service is designed to **reliably receive and asynchronously process transaction webhooks** from external payment processors.  
It ensures **immediate acknowledgment** of webhooks while handling transactions in the background for reliability.

---

## 🚀 Getting Started (Local Development)

These instructions will help you get a copy of the project up and running on your local machine.

### 🧩 Prerequisites
You need **Node.js (version 18+)** installed to run this service.

---

### ⚙️ Installation

**1. Clone the repository**
```bash
git clone [YOUR_REPO_URL]
cd [YOUR_REPO_NAME]/server
```

**2. Configure Environment Variables**

Create a file named `.env` inside the `server` directory and add your **Supabase credentials**:

```env
SUPABASE_URL="https://your-project-ref.supabase.co"
SUPABASE_KEY="your-service-role-key"
```

**3. Install dependencies**
```bash
npm install
```

**4. Run the service**
```bash
npm start
```

The service will start on port `3000` by default or the port specified in the `PORT` environment variable.

```
Service running on http://localhost:3000
```

---

## 📋 API Endpoints & Testing

The service exposes three primary endpoints:  
1️⃣ Health check  
2️⃣ Webhook receiver  
3️⃣ Transaction status query

---

### **1. Health Check (`GET /`)**

Used to confirm the service is alive and the database connection is healthy.

| Field | Value |
|-------|--------|
| **Method** | `GET` |
| **URL** | `/` |

**Example Response**
```json
{
  "status": "HEALTHY",
  "current_time": "2025-11-03T10:30:00Z"
}
```

---

### **2. Transaction Webhook Receiver (`POST /v1/webhooks/transactions`)**

Receives transaction data and immediately acknowledges the request with **HTTP 202 (Accepted)**.  
The transaction is stored with status `PROCESSING` and queued for background processing.

| Field | Value |
|-------|--------|
| **Method** | `POST` |
| **URL** | `/v1/webhooks/transactions` |

**Request Body Example**
```json
{
  "transaction_id": "txn_abc123def456",
  "source_account": "acc_user_789",
  "destination_account": "acc_merchant_456",
  "amount": 1500,
  "currency": "INR"
}
```

**Testing via cURL**
```bash
curl -X POST http://localhost:3000/v1/webhooks/transactions -H "Content-Type: application/json" -d '{
    "transaction_id": "txn_test001",
    "source_account": "acc_user_123",
    "destination_account": "acc_merchant_456",
    "amount": 2500,
    "currency": "INR"
}'
```

---

### **3. Transaction Status Query (`GET /v1/transactions/:id`)**

Retrieves the **current status** of a transaction using its ID.

| Field | Value |
|-------|--------|
| **Method** | `GET` |
| **URL** | `/v1/transactions/:id` |

**Example Request**
```
GET /v1/transactions/txn_abc123def456
```

**Example Response (Success)**
```json
{
  "transaction_id": "txn_abc123def456",
  "status": "PROCESSED",
  "details": {
    "source_account": "acc_user_789",
    "amount": 1500,
    "currency": "INR"
  }
}
```

---

## ⚙️ Technical Choices & Architecture

### **1. Technology Stack**
- **Runtime:** Node.js  
- **Framework:** Express.js  
- **Database:** Supabase (PostgreSQL)  
- **Configuration:** dotenv  
- **Deployment:** Render  

---

### **2. Asynchronous Processing & Idempotency (The Core Requirements)**

The service focuses on **speed** and **reliability**.

#### ⚡ Immediate Acknowledgment (Speed)
- Built with **Express.js** for high concurrency.
- The webhook endpoint (`POST /v1/webhooks/transactions`) immediately returns a **202 Accepted** response.
- Prevents timeouts from external processors.

#### 🧵 Background Processing (Reliability)
- Simulates a **30-second background job** using `setTimeout`.
- Represents actual processing logic (e.g., ledger updates, API calls).
- After completion, the database is asynchronously updated to mark the transaction as `PROCESSED`.

#### 🔁 Idempotency (No Duplicates)
- Supabase (PostgreSQL) enforces **Primary Key constraints** on `transaction_id`.
- Using **upsert** ensures that duplicate webhooks don’t result in multiple records.

---

### **3. Deployment**

- Hosted on **Render**, connected to a **Supabase PostgreSQL** instance.
- **Port Handling:** Uses `process.env.PORT` to dynamically listen to Render-assigned ports.
- **Configuration:** Environment variables (`SUPABASE_URL`, `SUPABASE_KEY`) are securely set in Render’s dashboard.

---

✅ **Summary**
- Receives webhooks ✅  
- Processes them asynchronously ✅  
- Ensures idempotency ✅  
- Provides health & status APIs ✅  
- Deployable and cloud-ready ✅

---
