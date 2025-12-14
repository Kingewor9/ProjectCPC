# Growth Guru - Complete Project Summary

## 📋 Project Overview

Growth Guru is a **Telegram Mini App for Cross-Promotion Management** that allows channel owners to:
- Share promotional content with partner channels
- Schedule campaigns with smart UTC time parsing
- Manage CPC balance and track performance
- Discover and connect with partner channels
- Monitor live campaign status

The project consists of a **Flask backend** (backend/) and a **Vite+React frontend** (frontend/).

---

## 🏗️ Project Structure

```
Project CP Gram/
├── backend/                 # Flask backend
│   ├── app.py              # Main Flask app + API endpoints
│   ├── auth.py             # JWT authentication
│   ├── bot.py              # Telegram bot integration
│   ├── config.py           # Configuration & environment
│   ├── models.py           # MongoDB collections & helpers
│   ├── scheduler.py        # Campaign scheduling & cleanup
│   ├── time_utils.py       # UTC time parsing
│   ├── requirements.txt    # Python dependencies
│   ├── README.md           # Backend documentation
│   ├── IMPLEMENTATION_SUMMARY.md
│   └── FRONTEND_INTEGRATION_GUIDE.md
│
└── frontend/               # Vite + React frontend (NEW!)
    ├── src/
    │   ├── pages/          # 9 page components
    │   ├── components/     # 5 reusable components
    │   ├── services/       # API client
    │   ├── hooks/          # Custom React hooks
    │   ├── types/          # TypeScript definitions
    │   ├── styles/         # Global CSS
    │   ├── App.tsx         # Main app with routing
    │   └── main.tsx        # React entry point
    ├── index.html
    ├── vite.config.ts
    ├── tailwind.config.js
    ├── tsconfig.json
    ├── package.json
    ├── README.md           # Frontend documentation
    ├── SETUP.md            # Setup instructions
    ├── INTEGRATION.md      # Integration guide
    └── .gitignore

```

---

## 🎯 Features Implemented

### Backend Features ✅

1. **JWT Authentication**
   - Telegram login verification
   - 24-hour JWT tokens
   - Protected endpoints with `@token_required` decorator
   - Token stored in localStorage (frontend)

2. **User Management**
   - User registration via Telegram
   - Profile storage in MongoDB
   - Channel ownership tracking
   - CPC balance management

3. **Cross-Promo Requests**
   - Create requests with scheduling
   - Accept/decline requests
   - Status tracking (Pending → Accepted)
   - Request notifications via Telegram bot

4. **Smart Time Parsing**
   - Convert day names + time slots to UTC
   - Calculate end times based on duration
   - Handle timezone conversions
   - Schedule next occurrence automatically

5. **Campaign Management**
   - Auto-schedule campaigns on approval
   - Post promotional content via bot
   - Auto-delete messages after duration
   - Track campaign status

6. **Partner Management**
   - Partner database with details
   - Availability/pricing information
   - Topic filtering
   - Contact information

### Frontend Features ✅

1. **Pages (9 total)**
   - **LoginPage**: Telegram login + demo login
   - **DashboardPage**: User overview + channels
   - **SendRequestPage**: Create cross-promo requests
   - **RequestsPage**: Manage incoming/outgoing requests
   - **CampaignsPage**: Track campaign status
   - **PartnersPage**: Browse partners with filters
   - **AnalyticsPage**: Performance metrics
   - **HelpPage**: FAQs and support
   - **SettingsPage**: User preferences

2. **Components (5 reusable)**
   - **Layout**: Wrapper with header and sidebar
   - **Header**: User info, logout, balance display
   - **Sidebar**: Navigation menu
   - **LoadingSpinner**: Loading indicator
   - **ErrorAlert**: Error message display

3. **Authentication**
   - Telegram login widget integration
   - JWT token management
   - Protected routes
   - Auto-logout on token expiration

4. **API Integration**
   - Axios client with interceptors
   - Automatic token injection in headers
   - Error handling and redirects
   - Request/response logging

5. **Styling & Design**
   - **Dark Blue Theme**: `#0a1628`, `#1a2f4a`, `#2a4568`
   - **Blue Accents**: `#0078d4` for actions
   - **Grey Text**: On dark backgrounds
   - **White Fonts**: For readability
   - **Responsive**: Works on desktop and mobile

---

## 📦 Technology Stack

### Backend
- **Python 3.8+**
- **Flask 2.x** - Web framework
- **MongoDB** - Database
- **PyJWT** - JWT token generation
- **APScheduler** - Background jobs
- **Telegram Bot API** - Bot integration
- **python-dateutil** - Date/time utilities

### Frontend
- **Node.js 16+**
- **Vite** - Build tool
- **React 18** - UI framework
- **TypeScript** - Type safety
- **React Router v6** - Routing
- **Tailwind CSS** - Styling
- **Axios** - HTTP client
- **Lucide React** - Icons

---

## 🚀 Getting Started

### Backend Setup

```powershell
# 1. Create and activate virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# 2. Install dependencies
pip install -r backend/requirements.txt

# 3. Set up environment
copy backend\.env.example backend\.env
# Edit .env with your credentials:
#   - TELEGRAM_BOT_TOKEN
#   - MONGO_URI
#   - JWT_SECRET

# 4. Start MongoDB (if local)
mongod.exe

# 5. Run backend
cd backend
python app.py
# Backend runs on http://localhost:5000
```

### Frontend Setup

```powershell
# 1. Navigate to frontend
cd frontend

# 2. Install dependencies
npm install

# 3. Start dev server
npm run dev
# Frontend runs on http://localhost:3000
# API calls auto-proxy to http://localhost:5000
```

### Testing

1. Open `http://localhost:3000` in browser
2. Click "Login with Telegram" or "Demo Login"
3. Navigate through dashboard, send requests, view campaigns

---

## 📡 API Endpoints

### Authentication
- `POST /api/auth/telegram` - Login with Telegram
  - Request: Telegram user payload
  - Response: `{ok: true, user, token}`

### User (Protected)
- `GET /api/me` - Get authenticated user
  - Header: `Authorization: Bearer <token>`
  - Response: User profile with channels

### Partners
- `GET /api/partners` - List partner channels
  - Response: Array of partner objects

### Requests
- `GET /api/requests` - List all requests
- `POST /api/request` - Create new request
  - Body: fromChannel, toChannel, daySelected, timeSelected, duration, cpcCost, promo
- `POST /api/request/<id>/accept` - Accept request
  - Body: optional chat_id
  - **Smart Feature**: Backend automatically parses day/time to UTC!

### Campaigns
- `GET /api/campaigns` - List campaigns
  - Response: Array of campaign objects with status

---

## 🎨 Design System

### Colors
- **darkBlue-900**: `#0a1628` - Main background
- **darkBlue-800**: `#1a2f4a` - Secondary background
- **darkBlue-700**: `#2a4568` - Cards/inputs
- **blue-600**: `#0078d4` - Primary actions
- **blue-500**: `#1084d7` - Hover states
- **grey-200**: `#e5e7eb` - Default text
- **grey-400**: `#9ca3af` - Secondary text
- **grey-700**: `#374151` - Borders

### Typography
- **Font**: Inter (system fallback)
- **Colors**: White (#fff) for primary, grey-400 for secondary

### Components
- **Cards**: Dark backgrounds with grey borders
- **Buttons**: Blue for primary, grey for secondary
- **Inputs**: Dark backgrounds with focus states
- **Alerts**: Color-coded (green/yellow/red/blue)

---

## 📊 Data Models

### User
```typescript
{
  telegram_id: string,
  name: string,
  first_name: string,
  username: string,
  photo_url: string,
  cpcBalance: number,
  channels: Channel[],
}
```

### Channel
```typescript
{
  id: string,
  name: string,
  topic: string,
  subs: number,
  status: 'Active' | 'Paused',
  avatar: string,
  promos: Promo[],
}
```

### Partner
```typescript
{
  id: string,
  name: string,
  topic: string,
  subs: number,
  lang: string,
  xExchanges: number,
  avatar: string,
  acceptedDays: string[],
  availableTimeSlots: string[],
  durationPrices: {hours: cost},
  telegram_chat: string,
}
```

### CrossPromoRequest
```typescript
{
  id: string,
  fromChannel: string,
  toChannel: string,
  daySelected: string,        // e.g., "Monday"
  timeSelected: string,       // e.g., "14:00 - 15:00 UTC"
  duration: number,           // hours
  cpcCost: number,
  promo: Promo,
  status: 'Pending' | 'Accepted' | 'Rejected',
}
```

### Campaign
```typescript
{
  id: string,
  request_id: string,
  chat_id: string,
  promo: Promo,
  duration_hours: number,
  status: 'scheduled' | 'running' | 'ended',
  start_at: datetime,  // UTC from smart parsing
  end_at: datetime,
  message_id?: string, // Telegram message ID
  posted_at?: datetime,
  ended_at?: datetime,
}
```

---

## 🔄 Workflow Examples

### Example 1: Send Cross-Promo Request

```
1. User on SendRequestPage selects:
   - From: "My Crypto Channel"
   - To: "Daily Motivation"
   - Day: "Wednesday"
   - Time: "14:00 - 15:00 UTC"
   - Duration: "6 hours"
   - Promo: "Latest Bitcoin Guide"
   - Cost: 250 CPC

2. Frontend POST /api/request with these details

3. Backend:
   - Stores request with status="Pending"
   - Notifies admin via bot
   - Returns request ID

4. Admin receives notification in Telegram bot
```

### Example 2: Accept Request & Auto-Schedule Campaign

```
1. Admin views RequestsPage with pending requests

2. Admin clicks "Accept Request"

3. Frontend POST /api/request/<id>/accept

4. Backend:
   - Marks request as "Accepted"
   - Parses "Wednesday 14:00 - 15:00 UTC" to next Wednesday 14:00
   - Creates campaign with:
     - start_at: 2025-12-10 14:00 UTC (next Wednesday)
     - end_at: 2025-12-10 20:00 UTC (14:00 + 6 hours)
   - Stores in campaigns collection
   - Returns campaign ID

5. APScheduler checks every 20 seconds:
   - When start_at time arrives: POST ad to Telegram
   - Stores message_id for later deletion

6. APScheduler checks every 30 seconds:
   - When end_at time arrives: DELETE message from Telegram
   - Update campaign status to "ended"

7. Frontend on CampaignsPage auto-refreshes and shows:
   - Campaign scheduled: Tue 14:00-20:00 UTC
   - (Later) Campaign running
   - (Later) Campaign ended
```

### Example 3: Track Campaign Status

```
1. User navigates to /campaigns

2. Frontend GET /api/campaigns

3. Backend returns all campaigns

4. Frontend displays grouped by status:
   - Scheduled (yellow): Upcoming campaigns
   - Running (green): Active campaigns
   - Ended (grey): Completed campaigns

5. Each card shows:
   - Promo name and details
   - Start/end times
   - Duration
   - Status with color coding
```

---

## 🔐 Security

### JWT Authentication
- Tokens expire after 24 hours
- Stored in browser localStorage
- Included in `Authorization: Bearer <token>` header
- Verified on backend with JWT_SECRET

### Telegram Verification
- Telegram login payload verified using HMAC-SHA256
- Bot token used as signing key
- Prevents spoofed login attempts

### Protected Routes
- Frontend checks for token before showing protected pages
- Backend checks `@token_required` decorator on endpoints
- Automatic redirect to login on token expiration

### Environment Variables
- Sensitive data (keys, tokens) in .env file
- Never committed to git
- Required before running app

---

## 📈 Scalability Considerations

### Current Implementation
- Single backend instance
- MongoDB for persistence
- APScheduler in-process (not distributed)
- File-based token storage (localStorage)

### Future Improvements
- Kubernetes deployment
- Redis for token/session management
- Distributed job queue (Celery) for scheduling
- Database connection pooling
- API rate limiting
- WebSocket for real-time updates

---

## 🛠️ Development Tips

### Adding New Feature
1. Add endpoint to `backend/app.py`
2. Add types to `frontend/src/types/index.ts`
3. Add API method to `frontend/src/services/api.ts`
4. Create page component in `frontend/src/pages/`
5. Add route in `frontend/src/App.tsx`
6. Add navigation in `frontend/src/components/Sidebar.tsx`

### Debugging
- Frontend: Press F12 in browser
- Backend: Check Python terminal output
- Database: Use MongoDB Compass for inspection
- Network: Check browser Network tab for API calls

### Common Issues
- **Token not working**: Clear localStorage
- **API 401 errors**: Verify JWT_SECRET in backend
- **MongoDB connection**: Check MONGO_URI in .env
- **Port conflicts**: Change port in vite.config.ts or Flask

---

## 📚 Documentation Files

### Backend
- `backend/README.md` - Setup and usage
- `backend/IMPLEMENTATION_SUMMARY.md` - Features overview
- `backend/FRONTEND_INTEGRATION_GUIDE.md` - Integration steps

### Frontend
- `frontend/README.md` - Complete frontend documentation
- `frontend/SETUP.md` - Installation and startup
- `frontend/INTEGRATION.md` - Detailed integration guide

---

## 🎓 Key Concepts

### JWT Token Flow
```
User Login → Backend generates JWT → Frontend stores token →
Token included in every request → Backend verifies token →
Route executed → Response returned
```

### Smart Time Parsing
```
User inputs: "Wednesday" + "14:00 - 15:00 UTC"
↓
Backend parse_day_time_to_utc() function
↓
Calculates next occurrence of Wednesday 14:00 UTC
↓
Stores as UTC datetime (e.g., 2025-12-10T14:00:00Z)
↓
APScheduler monitors and posts at exact time
```

### Campaign Lifecycle
```
Created (Pending) → Accepted (Scheduled) → Posted (Running) → Deleted (Ended)
     ↓                  ↓                      ↓                  ↓
  User view      Scheduled in DB         Posted on TG      Auto-deleted
```

---

## ✅ Checklist for Complete Setup

- [ ] Backend virtual environment created and activated
- [ ] Backend dependencies installed (`pip install -r requirements.txt`)
- [ ] MongoDB running locally or connection string set
- [ ] `.env` file created with required variables
- [ ] Backend started (`python app.py`)
- [ ] Frontend dependencies installed (`npm install`)
- [ ] Frontend started (`npm run dev`)
- [ ] Can login on `http://localhost:3000`
- [ ] Can view dashboard with user info
- [ ] Can send a cross-promo request
- [ ] Backend recognizes the request

---

## 📞 Support & Resources

- **Issues**: Check console (F12) for errors
- **Backend Logs**: Terminal where `python app.py` runs
- **Frontend Logs**: Browser DevTools Console
- **Documentation**: See individual README.md files

---

## 🎉 Conclusion

You now have a **fully functional** cross-promotion platform with:
- ✅ Beautiful dark blue/grey UI with white fonts
- ✅ Full authentication with JWT
- ✅ Cross-promo request management
- ✅ Smart UTC time parsing and scheduling
- ✅ Live campaign tracking
- ✅ Partner discovery
- ✅ Type-safe TypeScript codebase
- ✅ Modern Vite build setup

Start building and customizing for your needs!
