# New Features Documentation

## Summary of Changes

This update removes Google Sheets integration and adds a comprehensive Owner API system with automatic API key generation, plus printer device settings for cashiers.

## 🗑️ Removed Features

### Google Sheets Integration
All Google Sheets functionality has been completely removed:
- ❌ Daily automatic export cron job
- ❌ Google Sheet creation on tenant registration
- ❌ Google API credential validation
- ❌ `googleapis` npm package dependency
- ❌ `googleSheetId` field from tenants table

## ✨ New Features

### 1. Owner API with Automatic API Key Generation

#### Overview
Every time an admin creates a new owner/tenant, the system automatically generates a secure API key for that tenant. This API key can be used to programmatically access business data.

#### API Key Format
```
mypos_live_[64_hex_characters]
```

#### Security
- API keys are stored as SHA-256 hashes in the database
- Keys are only shown once during tenant creation
- Supports expiration dates and activation/deactivation

#### Available Endpoints

All Owner API endpoints require the API key in the `X-API-Key` header:

```http
X-API-Key: mypos_live_abc123...
```

**Base URL:** `/api/owner`

##### 1. Sales Report
```
GET /api/owner/reports/sales
```

**Query Parameters:**
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string
- `outletId` (optional): Filter by outlet

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalTransactions": 150,
      "totalRevenue": 45000000,
      "totalDiscount": 500000,
      "totalTax": 4500000,
      "totalItems": 320
    },
    "transactions": [
      {
        "transactionNumber": "TRX-001",
        "orderType": "dine-in",
        "subtotal": 100000,
        "discountAmount": 0,
        "taxAmount": 10000,
        "total": 110000,
        "cashier": "John Doe",
        "outlet": "Main Branch",
        "createdAt": "2025-11-26T10:30:00Z",
        "items": [...],
        "payments": [...]
      }
    ]
  }
}
```

##### 2. Stock/Inventory Report
```
GET /api/owner/reports/stock
```

**Query Parameters:**
- `outletId` (optional): Filter by outlet
- `lowStock` (optional): Set to `true` to filter low stock items

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalItems": 120,
      "lowStockItems": 5,
      "totalStockValue": 15000000
    },
    "items": [
      {
        "id": 1,
        "sku": "ITM-001",
        "name": "Nasi Goreng",
        "category": "Main Course",
        "stock": 50,
        "minStock": 10,
        "price": 25000,
        "outlet": "Main Branch",
        "isLowStock": false
      }
    ]
  }
}
```

##### 3. Transaction Summary
```
GET /api/owner/reports/transactions
```

**Query Parameters:**
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string

**Response:**
```json
{
  "success": true,
  "data": {
    "totalTransactions": 150,
    "totalRevenue": 45000000,
    "averageOrderValue": 300000,
    "paymentMethods": {
      "cash": 25000000,
      "card": 15000000,
      "qris": 5000000
    },
    "orderTypes": {
      "dine-in": 80,
      "takeaway": 50,
      "delivery": 20
    }
  }
}
```

##### 4. Cash Flow Report
```
GET /api/owner/reports/cash-flow
```

**Query Parameters:**
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string

**Response:**
```json
{
  "success": true,
  "data": {
    "revenue": 45000000,
    "expenses": 0,
    "netCashFlow": 45000000,
    "transactionCount": 150
  }
}
```

##### 5. Top Selling Items
```
GET /api/owner/reports/top-items
```

**Query Parameters:**
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string
- `limit` (optional): Number of items to return (default: 10)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "itemId": 5,
      "itemName": "Nasi Goreng Special",
      "totalQuantity": 120,
      "totalRevenue": 3000000,
      "transactionCount": 85
    }
  ]
}
```

#### Error Responses

The API returns appropriate error codes:

- `401` - Missing or invalid API key
- `403` - API key disabled, expired, or tenant inactive
- `500` - Server error

Example error response:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_API_KEY",
    "message": "Invalid API key."
  }
}
```

#### Usage Example (cURL)

```bash
curl -X GET "https://your-api.com/api/owner/reports/sales?startDate=2025-11-01&endDate=2025-11-30" \
  -H "X-API-Key: mypos_live_your_api_key_here"
```

#### Usage Example (JavaScript)

```javascript
const apiKey = 'mypos_live_your_api_key_here';
const baseUrl = 'https://your-api.com';

async function getSalesReport(startDate, endDate) {
  const response = await fetch(
    `${baseUrl}/api/owner/reports/sales?startDate=${startDate}&endDate=${endDate}`,
    {
      headers: {
        'X-API-Key': apiKey,
      },
    }
  );

  const data = await response.json();
  return data;
}

// Usage
const report = await getSalesReport('2025-11-01', '2025-11-30');
console.log(report);
```

#### Usage Example (Python)

```python
import requests

api_key = 'mypos_live_your_api_key_here'
base_url = 'https://your-api.com'

def get_sales_report(start_date, end_date):
    headers = {
        'X-API-Key': api_key
    }
    params = {
        'startDate': start_date,
        'endDate': end_date
    }

    response = requests.get(
        f'{base_url}/api/owner/reports/sales',
        headers=headers,
        params=params
    )

    return response.json()

# Usage
report = get_sales_report('2025-11-01', '2025-11-30')
print(report)
```

### 2. Printer Device Settings (Per Cashier)

#### Overview
Each cashier can now configure their own default printer settings. This is stored at the user level, allowing different cashiers to use different printers or settings.

#### Settings Available

1. **Default Printer Name**: The device name of the printer to use
2. **Printer Width**: 58mm or 80mm
3. **Auto Print**: Whether to automatically print after transaction
4. **Number of Copies**: How many copies to print (1-10)

#### API Endpoints

**Base URL:** `/api/printer-settings`

##### Get Printer Settings
```
GET /api/printer-settings
```

Requires JWT authentication in the Authorization header.

**Response:**
```json
{
  "success": true,
  "data": {
    "defaultPrinter": "Epson TM-T82",
    "printerWidth": "80mm",
    "autoPrint": true,
    "copies": 1
  }
}
```

##### Update Printer Settings
```
PUT /api/printer-settings
```

**Request Body:**
```json
{
  "defaultPrinter": "Epson TM-T82",
  "printerWidth": "80mm",
  "autoPrint": true,
  "copies": 2
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "defaultPrinter": "Epson TM-T82",
    "printerWidth": "80mm",
    "autoPrint": true,
    "copies": 2
  },
  "message": "Printer settings updated successfully"
}
```

##### Reset Printer Settings
```
POST /api/printer-settings/reset
```

Resets to default settings:
- Default Printer: "" (empty)
- Printer Width: "80mm"
- Auto Print: true
- Copies: 1

#### UI Access

Cashiers can access printer settings from:
1. Click the profile icon in the Cashier page
2. Select the "Printer" tab
3. Configure settings
4. Click "Save Settings"

#### Database Schema

Printer settings are stored in the `users` table:

```sql
ALTER TABLE users ADD COLUMN printer_settings JSON DEFAULT '{}';
```

Example stored data:
```json
{
  "defaultPrinter": "Epson TM-T82",
  "printerWidth": "80mm",
  "autoPrint": true,
  "copies": 1
}
```

## 🛠️ Database Migration

Run the following migration to update your database:

```bash
psql -U your_user -d your_database -f database/migrations/003_add_api_keys_and_printer_settings.sql
```

Or manually execute:
1. Remove `google_sheet_id` column from `tenants` table
2. Add `printer_settings` JSON column to `users` table
3. Create `api_keys` table with indexes

## 📋 Implementation Checklist

### Backend
- [x] Remove Google Sheets service
- [x] Remove daily recap cron job
- [x] Remove googleapis dependency
- [x] Create API key generation utility
- [x] Create API key authentication middleware
- [x] Auto-generate API key on tenant creation
- [x] Create Owner API controller with 5 reporting endpoints
- [x] Create printer settings controller
- [x] Create API key management controller
- [x] Add routes for Owner API, printer settings, and API keys
- [x] Update database schema (Prisma)
- [x] Generate Prisma client

### Frontend
- [x] Create printer settings service
- [x] Create API key service
- [x] Add printer settings tab to cashier profile
- [x] Add printer settings UI components
- [x] Create admin API documentation page
- [x] Create owner API keys view page

### Database
- [x] Create migration SQL file
- [x] Update Prisma schema

## 🔒 Security Considerations

### API Keys
1. **Never commit API keys to version control**
2. API keys are hashed using SHA-256 before storage
3. Keys are only displayed once during tenant creation
4. Implement rate limiting for Owner API endpoints (recommended)
5. Monitor API key usage via `last_used` timestamp
6. Set expiration dates for API keys when needed

### Printer Settings
1. User-level isolation ensures privacy
2. Settings are stored as JSON in the database
3. Validated on the server side before saving

## 📝 Notes for Developers

### Adding New Owner API Endpoints

1. Add controller method in `backend/src/controllers/ownerApi.controller.ts`
2. Add route in `backend/src/routes/ownerApi.routes.ts`
3. All routes automatically use `apiKeyAuth` middleware

### Extending Printer Settings

To add new printer settings:
1. Update the `PrinterSettings` interface in `frontend/src/services/printerSettingsService.ts`
2. Add validation in `backend/src/controllers/printerSettings.controller.ts`
3. Update the UI in `frontend/src/components/cashier/ProfileMenu.tsx`

## 🐛 Troubleshooting

### API Key Not Working

1. Check that the API key is being sent in the `X-API-Key` header
2. Verify the tenant is active (`is_active = true`)
3. Verify the subscription is active
4. Check API key expiration date
5. Ensure the API key hasn't been deactivated

### Printer Settings Not Saving

1. Check browser console for errors
2. Verify JWT token is valid
3. Check network tab for API response
4. Ensure user has permission to update settings

## 📦 Dependencies Removed

```json
{
  "dependencies": {
    "googleapis": "^166.0.0"  // REMOVED
  }
}
```

## 🎯 Future Improvements

### Potential Enhancements:
1. API key management UI for owners (view, create, revoke)
2. API usage analytics and rate limiting
3. Webhook support for real-time notifications
4. More granular API key permissions
5. Printer device auto-detection
6. Direct thermal printer integration
7. Print queue management
8. Receipt template customization per cashier

## 📞 Support

For issues or questions:
1. Check the error logs in the backend
2. Verify database migrations have been applied
3. Ensure all dependencies are installed
4. Review API documentation above

---

**Version:** 2.0.0
**Date:** November 26, 2025
**Author:** System Update
