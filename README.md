# 🍣 Saramondā - Premium Salmon Pre-order System

ระบบสั่งจองแซลมอนพรีเมียมออนไลน์ พร้อมจัดส่งถึงบ้าน

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Status](https://img.shields.io/badge/status-production--ready-green)

---

## ✨ Features

### Customer App
- 📱 Mobile-first responsive design
- 🛒 Beautiful product catalog
- 🛵 Delivery scheduling with time slots
- 💳 Multiple payment options
- 📍 Address management

### Admin Dashboard
- 📊 Real-time analytics
- 📋 Order management
- 👥 Customer CRM
- 📦 Stock tracking

### Kitchen Display
- 🖥️ Real-time order updates
- 👨‍🍳 Status workflow management
- ⏱️ Timer tracking

### Integrations
- 📱 **LINE Messaging API** - Push notifications
- 📊 **Google Sheets** - Automatic order logging
- 🔗 **LINE Login (LIFF)** - Customer authentication

---

## 🚀 Quick Start

### Prerequisites
- Node.js v18+
- npm or yarn

### Installation

```bash
# Clone repository
git clone https://github.com/yourusername/saramonda.git
cd saramonda

# Install backend dependencies
cd backend
npm install

# Copy environment file
cp .env.example .env
# Edit .env with your credentials

# Start development server
npm run dev
```

### Access
- **Frontend**: http://localhost:8080
- **API**: http://localhost:3000
- **Kitchen**: http://localhost:8080/kitchen.html
- **Admin**: http://localhost:8080/admin.html

---

## 📁 Project Structure

```
saramonda/
├── index.html          # Customer ordering app
├── admin.html          # Admin dashboard
├── kitchen.html        # Kitchen display
├── pos.html            # Point of Sale
├── styles.css          # Main stylesheet
├── api-client.js       # API client
├── app.js              # Main app logic
├── images/             # Product images
├── docs/               # Documentation
│   ├── DEPLOYMENT.md
│   ├── LINE-MESSAGING-API-SETUP.md
│   └── LIFF-SETUP.md
└── backend/            # Backend API
    ├── src/
    │   ├── app.js      # Express server
    │   ├── config/     # Configuration
    │   ├── modules/    # Feature modules
    │   │   ├── orders/
    │   │   ├── products/
    │   │   ├── auth/
    │   │   └── notifications/
    │   ├── shared/     # Shared utilities
    │   └── middleware/ # Express middleware
    └── package.json
```

---

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NODE_ENV` | production / development | Yes |
| `PORT` | Server port | Yes |
| `JWT_SECRET` | JWT signing secret | Yes |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE API token | Yes |
| `LINE_CHANNEL_SECRET` | LINE API secret | Yes |
| `LINE_NOTIFICATION_ENABLED` | Enable LINE notifications | Yes |
| `GOOGLE_SHEETS_WEBHOOK_URL` | Google Apps Script URL | Optional |

See `backend/.env.example` for full list.

---

## 📱 LINE Setup

### Messaging API
1. Create LINE Official Account
2. Enable Messaging API
3. Get Channel Access Token
4. Configure in `.env`

See [LINE-MESSAGING-API-SETUP.md](docs/LINE-MESSAGING-API-SETUP.md)

### LIFF (LINE Login)
1. Create LINE Login Channel
2. Add LIFF App
3. Link to Official Account

See [LIFF-SETUP.md](docs/LIFF-SETUP.md)

---

## 🚀 Deployment

See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed deployment guide.

### Quick Deploy to Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template)

---

## 📊 API Endpoints

### Orders
```
POST   /api/v1/orders              Create order
GET    /api/v1/orders              Get all orders
GET    /api/v1/orders/:id          Get order by ID
PATCH  /api/v1/orders/:id/status   Update order status
```

### Products
```
GET    /api/v1/products            Get all products
GET    /api/v1/products/:id        Get product by ID
```

### Notifications
```
POST   /api/v1/notifications/test  Send test notification
POST   /api/v1/notifications/broadcast  Broadcast message
```

---

## 🎨 Screenshots

### Customer App
![Customer App](docs/screenshots/customer-app.png)

### Success Modal with LINE OA Invite
![Success Modal](docs/screenshots/success-modal.png)

### LINE Notifications
![LINE Notifications](docs/screenshots/line-notification.png)

---

## 📄 License

MIT License - See [LICENSE](LICENSE)

---

## 👨‍💻 Author

**Saramondā Team**

---

*Made with ❤️ in Thailand 🇹🇭*
