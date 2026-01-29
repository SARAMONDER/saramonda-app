# Saramondā Backend

Premium Salmon Pre-order System - LINE Chatbot Backend

## Deploy to Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template)

## Environment Variables

Set these in Railway Dashboard:

```env
# Server
NODE_ENV=production
PORT=3000

# Security
JWT_SECRET=your-super-secret-key-change-this

# LINE Messaging API
LINE_CHANNEL_ACCESS_TOKEN=your-channel-access-token
LINE_CHANNEL_SECRET=your-channel-secret
LINE_LIFF_ID=2008921790-SyMjjGWY

# Admin
LINE_ADMIN_USER_ID=your-admin-line-user-id
```

## Local Development

```bash
npm install
npm run dev
```

## API Endpoints

- `GET /health` - Health check
- `POST /api/v1/webhook/line` - LINE Webhook
- `GET /api/v1/orders` - Get orders
- `POST /api/v1/orders` - Create order

## Tech Stack

- Node.js + Express
- SQLite (sql.js)
- LINE Messaging API
- WebSocket for real-time updates
