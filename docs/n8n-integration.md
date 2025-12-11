# n8n Integration Guide

This document describes how to integrate the Favorite Logistics automation system with n8n workflows.

## Overview

The system exposes 7 API endpoints that n8n workflows can call to automate shipment management via WhatsApp and email.

## Authentication

All endpoints require API key authentication via the `Authorization` header:

```
Authorization: Bearer YOUR_N8N_API_KEY
```

Store your API key as a credential in n8n and reference it in HTTP Request nodes.

## Base URL

```
https://vodhvvkmxocxzhmdwsuu.supabase.co/functions/v1
```

## API Endpoints

### 1. Create Shipment

**Endpoint:** `POST /shipments-create`

Creates a new shipment record. Automatically creates supplier/client if they don't exist.

**Request Body:**
```json
{
  "lot_number": "883",
  "supplier_name": "WINTEX - ADNAN",
  "client_name": "MJ",
  "commodity": "FABRIC",
  "eta": "2025-05-10",
  "source": "whatsapp"
}
```

**Response:**
```json
{
  "success": true,
  "shipment_id": "uuid",
  "message": "Shipment 883 created successfully",
  "whatsapp_message": "✅ NEW SHIPMENT CREATED\n\n📦 LOT 883\n📍 WINTEX - ADNAN → MJ\n📋 FABRIC\n⏰ ETA: 2025-05-10\n\nReady for tracking!"
}
```

---

### 2. Update Shipment Status

**Endpoint:** `POST /shipments-update-status`

Updates shipment status, document submission, telex release, or delivery date.

**Request Body:**
```json
{
  "lot_number": "881",
  "status": "in-transit",
  "document_submitted": true,
  "document_submitted_date": "2025-04-14",
  "telex_released": true,
  "telex_released_date": "2025-04-15",
  "delivery_date": "2025-04-18",
  "notes": "Delivered to warehouse",
  "source": "whatsapp"
}
```

All fields except `lot_number` are optional. Only include what you want to update.

**Response:**
```json
{
  "success": true,
  "shipment": { /* updated shipment object */ },
  "message": "Shipment 881 updated successfully",
  "whatsapp_message": "✅ 📦 LOT 881 UPDATED\n\n📊 Status: IN-TRANSIT\n📄 Documents submitted: 2025-04-14\n📨 Telex released: 2025-04-15\n\n📍 WINTEX - ADNAN → MJ"
}
```

---

### 3. Add Costs

**Endpoint:** `POST /shipments-add-costs`

Adds cost breakdown to a shipment. Creates supplier ledger debit entry automatically.

**Request Body:**
```json
{
  "lot_number": "881",
  "supplier_cost": 105000,
  "freight_cost": 1200,
  "clearing_cost": 150,
  "transport_cost": 33.05,
  "bank_charges": 50,
  "source_currency": "USD",
  "fx_spot_rate": 18.90,
  "fx_applied_rate": 18.52,
  "invoice_number": "INV-01823",
  "source": "email"
}
```

**Response:**
```json
{
  "success": true,
  "costs": { /* costs object with calculated totals */ },
  "message": "Costs added for LOT 881",
  "whatsapp_message": "✅ LOT 881 COSTS UPDATED\n\n💰 Supplier: $105,000.00\n🚢 Freight: $1,200.00\n📦 Clearing: $150.00\n🚚 Transport: $33.05\n💵 Total: $106,383.05\n\n📊 FX Rate: 18.52\n💰 Total ZAR: R1,970,214.09\n\n📍 WINTEX - ADNAN → MJ\n⏰ ETA: Apr 25\n\n⏳ Profit calculation pending client invoice."
}
```

---

### 4. Add Revenue (Client Invoice)

**Endpoint:** `POST /shipments-add-revenue`

Adds client invoice amount and calculates all profit metrics.

**Request Body:**
```json
{
  "lot_number": "881",
  "client_invoice_zar": 2050000,
  "source": "whatsapp"
}
```

**Response:**
```json
{
  "success": true,
  "profit_data": {
    "gross_profit_zar": 79785.91,
    "fx_commission_zar": 27582.99,
    "fx_spread_profit_zar": 40425.56,
    "net_profit_zar": 147744.46,
    "profit_margin": 7.21
  },
  "whatsapp_message": "💰 LOT 881 PROFIT CALCULATED\n\n📊 Client Invoice: R2,050,000.00\n📦 Total Costs: R1,970,214.09\n\n💵 Gross Profit: R79,785.91\n💱 FX Commission: R27,582.99\n📈 FX Spread Profit: R40,425.56\n🏦 Bank Charges: R50.00\n\n✅ NET PROFIT: R147,744.46\n📊 Margin: 7.21%\n\n📍 WINTEX - ADNAN → MJ"
}
```

---

### 5. Create Payment

**Endpoint:** `POST /payments-create`

Records a payment to a supplier. Creates ledger credit entry and calculates commission.

**Request Body:**
```json
{
  "supplier_name": "WINTEX",
  "lot_number": "881",
  "amount_foreign": 106383.05,
  "currency": "USD",
  "fx_rate": 18.46,
  "bank_account": "SWISS",
  "payment_date": "2025-04-20",
  "reference": "TT-2025-0420",
  "source": "whatsapp"
}
```

**Response:**
```json
{
  "success": true,
  "payment_id": "uuid",
  "supplier_balance": 0,
  "commission_earned": 27494.73,
  "message": "Payment created for WINTEX - ADNAN",
  "whatsapp_message": "✅ PAYMENT RECORDED\n\n💳 WINTEX - ADNAN\n💰 Amount: $106,383.05\n📊 FX Rate: 18.46\n💵 ZAR Value: R1,963,831.50\n🏦 Bank: SWISS\n📦 LOT: 881\n\n💱 Commission: R27,494.73\n\n📊 Updated Balance: $0.00"
}
```

---

### 6. Query Shipments

**Endpoint:** `POST /shipments-query`

Retrieves shipments with optional filters.

**Request Body:**
```json
{
  "lot_number": "881",
  "status": "pending",
  "supplier_name": "WINTEX",
  "limit": 10,
  "source": "whatsapp"
}
```

All fields are optional:
- `lot_number` - Get specific shipment details
- `status` - Filter by status: `pending`, `in-transit`, `documents-submitted`, `completed`
- `supplier_name` - Filter by supplier (partial match)
- `limit` - Max results (default: 10)

**Response (single shipment):**
```json
{
  "success": true,
  "shipments": [ /* array of shipment objects */ ],
  "count": 1,
  "whatsapp_message": "📦 LOT 881 DETAILS\n\n📊 Status: IN-TRANSIT\n📍 WINTEX - ADNAN → MJ\n📋 FABRIC\n⏰ ETA: Apr 25\n\n📄 Docs: 2025-04-14\n📨 Telex: 2025-04-15\n\n💰 COSTS:\nTotal: R1,970,214\nInvoice: R2,050,000\nNet Profit: R147,744 (7.2%)"
}
```

**Response (list):**
```json
{
  "success": true,
  "shipments": [ /* array */ ],
  "count": 3,
  "whatsapp_message": "📦 PENDING SHIPMENTS (3)\n\n1. LOT 883\n   HUBEI → MOTALA\n   pending | ETA: May 10\n\n2. LOT 884\n   WINTEX - ADNAN → MJ\n   pending | ETA: May 15\n\n..."
}
```

---

### 7. Supplier Balance

**Endpoint:** `POST /suppliers-balance`

Gets supplier current balance and recent transactions.

**Request Body:**
```json
{
  "supplier_name": "WINTEX",
  "source": "whatsapp"
}
```

**Response:**
```json
{
  "success": true,
  "supplier": {
    "name": "WINTEX - ADNAN",
    "currency": "USD",
    "current_balance": 52000,
    "recent_transactions": [
      {
        "ledger_type": "debit",
        "amount": 106383.05,
        "transaction_date": "2025-04-10",
        "shipments": { "lot_number": "881" }
      }
    ]
  },
  "whatsapp_message": "📊 WINTEX - ADNAN BALANCE\n\n💰 Balance: $52,000.00\n🔴 Owed to supplier\n💱 Currency: USD\n\n📝 RECENT TRANSACTIONS:\n📥 +$106,383.05 (LOT 881)\n   2025-04-10\n📤 -$54,383.05 (LOT 881)\n   2025-04-20"
}
```

---

## n8n Workflow Examples

### Workflow 1: Email Invoice Parser

Automatically parse supplier invoices from email and update shipment costs.

**Trigger:** Gmail - Watch for new emails with label "Invoices"

**Steps:**
1. **Gmail Trigger** - New email in "Invoices" label
2. **Claude/OpenAI** - Extract invoice data:
   ```
   Prompt: Extract shipment data from this supplier invoice email.
   Return JSON: {
     "lot_number": "string",
     "supplier_name": "string", 
     "invoice_number": "string",
     "supplier_cost": number,
     "freight_cost": number,
     "clearing_cost": number,
     "transport_cost": number,
     "currency": "USD" | "EUR",
     "invoice_date": "YYYY-MM-DD"
   }
   ```
3. **HTTP Request** - POST to `/shipments-add-costs`:
   - URL: `https://vodhvvkmxocxzhmdwsuu.supabase.co/functions/v1/shipments-add-costs`
   - Method: POST
   - Headers: `Authorization: Bearer {{$credentials.n8n_api_key}}`
   - Body: JSON from Claude + `"source": "email"`
4. **WhatsApp** - Send `response.whatsapp_message` to team group

---

### Workflow 2: WhatsApp Command Processor

Process natural language commands from WhatsApp to update shipments.

**Trigger:** WhatsApp Business API Webhook

**Steps:**
1. **Webhook Trigger** - Incoming WhatsApp message
2. **Claude/OpenAI** - Interpret command:
   ```
   Prompt: Interpret this WhatsApp command about freight shipments.
   
   User message: "{{$json.message}}"
   
   Available actions:
   - create_shipment: New shipment
   - update_status: Update status/docs/telex/delivery
   - add_costs: Add costs from invoice
   - add_revenue: Add client invoice
   - create_payment: Record payment
   - query_shipment: Get shipment details
   - query_balance: Get supplier balance
   
   Return JSON with:
   {
     "action": "action_name",
     "endpoint": "/endpoint-name",
     "data": { /* extracted data */ }
   }
   ```
3. **Switch** - Route based on `action`
4. **HTTP Request** - POST to appropriate endpoint
5. **WhatsApp** - Reply with `response.whatsapp_message`

**Example Commands:**
| User Message | Parsed Action | Endpoint |
|-------------|---------------|----------|
| "New shipment LOT 885 from HUBEI to MJ, ETA June 1" | create_shipment | /shipments-create |
| "LOT 881 documents submitted" | update_status | /shipments-update-status |
| "LOT 881 telex released today" | update_status | /shipments-update-status |
| "LOT 881 delivered" | update_status | /shipments-update-status |
| "Paid WINTEX $50k at R18.50 via SWISS" | create_payment | /payments-create |
| "Show LOT 881" | query_shipment | /shipments-query |
| "Show pending shipments" | query_shipment | /shipments-query |
| "Show WINTEX balance" | query_balance | /suppliers-balance |
| "Invoiced MJ R2.05M for LOT 881" | add_revenue | /shipments-add-revenue |

---

### Workflow 3: Daily Summary

Send daily shipment summary every morning.

**Trigger:** Cron - Daily at 8:00 AM

**Steps:**
1. **Schedule Trigger** - 8:00 AM daily
2. **HTTP Request** - GET pending shipments:
   - POST `/shipments-query` with `{"status": "pending"}`
3. **HTTP Request** - GET in-transit shipments:
   - POST `/shipments-query` with `{"status": "in-transit"}`
4. **Code Node** - Format summary:
   ```javascript
   const pending = $input.all()[0].json;
   const inTransit = $input.all()[1].json;
   
   return {
     message: `📊 DAILY SUMMARY\n\n` +
       `⏳ Pending: ${pending.count}\n` +
       `🚢 In Transit: ${inTransit.count}\n\n` +
       `${pending.whatsapp_message}\n\n` +
       `${inTransit.whatsapp_message}`
   };
   ```
5. **WhatsApp** - Send to Mo's number

---

## Environment Variables

Set these in n8n credentials:

| Variable | Description |
|----------|-------------|
| `N8N_API_KEY` | Your API key for authentication |
| `SUPABASE_FUNCTIONS_URL` | `https://vodhvvkmxocxzhmdwsuu.supabase.co/functions/v1` |
| `WHATSAPP_NUMBER` | Team WhatsApp number for notifications |

---

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error description",
  "whatsapp_message": "❌ Failed to [action]: [error]"
}
```

**HTTP Status Codes:**
- `200` - Success
- `400` - Bad request (missing required fields)
- `401` - Unauthorized (invalid API key)
- `404` - Resource not found (shipment/supplier doesn't exist)
- `500` - Server error

Always check `success: true` before using response data.

---

## Testing

Test endpoints using curl:

```bash
# Create shipment
curl -X POST https://vodhvvkmxocxzhmdwsuu.supabase.co/functions/v1/shipments-create \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "lot_number": "TEST001",
    "supplier_name": "Test Supplier",
    "client_name": "Test Client",
    "commodity": "TEST",
    "eta": "2025-06-01",
    "source": "manual"
  }'

# Query shipment
curl -X POST https://vodhvvkmxocxzhmdwsuu.supabase.co/functions/v1/shipments-query \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"lot_number": "TEST001"}'
```

---

## Monitoring

All API calls are logged in the `automation_logs` table with:
- Source (whatsapp/email/manual)
- Action performed
- Request/response data
- Success status
- Error details if failed
- Timestamp

View logs in the dashboard's Automation Status tab.
