# Growth Guru - Full Stack Project

A **Telegram Mini App** for cross-promotional channel management with a Flask backend and modern React frontend.

## 🚀 Quick Start (5 minutes)

### Prerequisites
- Python 3.8+
- Node.js 16+
- MongoDB (local or cloud)

### Terminal 1: Start Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Copy and edit .env
copy .env.example .env
# Edit .env with your credentials (TELEGRAM_BOT_TOKEN, MONGO_URI, JWT_SECRET)

python app.py
# Backend running on http://localhost:5000
```

### Terminal 2: Start Frontend

```powershell
cd frontend
npm install
npm run dev
# Frontend running on http://localhost:3000
```

### Open Browser
Visit `http://localhost:3000` and login with Telegram or demo credentials!

---

## 📁 Project Structure

```
Project CP Gram/
├── backend/                 # Flask backend API
│   ├── app.py              # Main Flask application
│   ├── auth.py             # JWT authentication
│   ├── models.py           # MongoDB collections
│   ├── scheduler.py        # Campaign scheduling
│   ├── bot.py              # Telegram bot integration
│   └── requirements.txt     # Python dependencies
│
└── frontend/               # Vite + React frontend
    ├── src/
    │   ├── pages/          # Page components
    │   ├── components/     # Reusable components
    │   ├── services/       # API client
    │   └── types/          # TypeScript definitions
    └── package.json        # Node dependencies
```

---

## ✨ Features

### 🔐 Authentication
- Telegram login widget integration
- JWT token-based authentication
- 24-hour token expiry
- Auto-redirect on expiration

### 📤 Cross-Promotion
- Create promotional requests
- Schedule with smart UTC time parsing
- Send to partner channels
- Track request status

### ⚡ Campaigns
- Auto-schedule campaigns on approval
- Monitor campaign status (scheduled, running, ended)
- Auto-delete messages after duration
- Real-time status updates

### 🤝 Partner Discovery
- Browse available partner channels
- Filter by topic
- View pricing and availability
- Direct contact links

### 📊 Dashboard
- User profile and channels overview
- CPC balance tracking
- Quick action buttons
- Channel statistics

---

## 🎨 Design

**Dark Blue & Grey Theme**
- Background: Dark blue (`#0a1628`)
- Accents: Bright blue (`#0078d4`)
- Text: White (`#ffffff`)
- Responsive on desktop and mobile

---

## 📡 API Endpoints

| Method | Endpoint | Protected | Description |
|--------|----------|-----------|-------------|
| POST | `/api/auth/telegram` | ❌ | Telegram login |
| GET | `/api/me` | ✅ | User profile |
| GET | `/api/partners` | ❌ | List partners |
| GET | `/api/requests` | ❌ | List requests |
| POST | `/api/request` | ❌ | Create request |
| POST | `/api/request/<id>/accept` | ❌ | Accept & schedule |
| GET | `/api/campaigns` | ❌ | List campaigns |

---

## 📚 Documentation

- **Backend**: See `backend/README.md`
- **Frontend**: See `frontend/README.md`
- **Integration**: See `frontend/INTEGRATION.md`
- **Full Summary**: See `PROJECT_SUMMARY.md`

---

## 🛠️ Technology Stack

**Backend**
- Flask 2.x
- MongoDB
- JWT
- APScheduler
- Telegram Bot API

**Frontend**
- React 18
- TypeScript
- Vite
- Tailwind CSS
- React Router v6
- Axios

---

## 🔧 Configuration

### Backend (.env)
```env
MONGO_URI=mongodb://localhost:27017/growthguru
TELEGRAM_BOT_TOKEN=your_bot_token_here
JWT_SECRET=your-secret-key-change-in-production
BOT_ADMIN_CHAT_ID=your_chat_id_here
APP_URL=http://localhost:5000
JWT_EXPIRY_HOURS=24
```

### Frontend (.env.local) - Optional
```env
VITE_API_URL=http://localhost:5000
```

---

## 🚢 Production Deployment

### Backend (Python)
1. Create production environment
2. Set environment variables securely
3. Use production WSGI server (Gunicorn)
4. Deploy to cloud (Heroku, AWS, Google Cloud, etc.)

### Frontend (Node)
1. Run `npm run build`
2. Upload `dist/` folder to static host
3. Deploy to Vercel, Netlify, or your server

---

## 📖 Key Workflows

### Workflow 1: User Login
```
User clicks "Login with Telegram" →
Telegram widget verifies identity →
Backend creates JWT token →
Frontend stores token & redirects to dashboard
```

### Workflow 2: Send Promotion
```
User selects channel, partner, schedule, promo →
Frontend sends POST /api/request →
Backend stores request & notifies admin →
Admin can accept/decline request
```

### Workflow 3: Campaign Execution
```
Admin accepts request →
Backend creates campaign with UTC datetime →
APScheduler posts at exact time →
Message auto-deletes after duration →
Frontend shows campaign status
```

---

## 🐛 Troubleshooting

### "Cannot connect to API"
- Ensure backend is running on port 5000
- Check CORS is enabled
- Verify no firewall blocking localhost

### "Login not working"
- Check Telegram bot token in `.env`
- Verify backend is receiving the request
- Clear browser localStorage

### "Campaigns not posting"
- Ensure Telegram bot has permissions
- Check BOT_ADMIN_CHAT_ID is correct
- Verify APScheduler is running in backend logs

### "TypeScript errors"
```powershell
# Clean install
rm -r node_modules package-lock.json
npm install
```

---

## 🎓 Next Steps

1. ✅ Start both backend and frontend
2. ✅ Test login with demo credentials
3. ✅ Create a test cross-promo request
4. ✅ Accept the request in admin view
5. ✅ Monitor campaign scheduling in database
6. ✅ Customize branding and colors
7. ✅ Deploy to production

---

## 📞 Support

- **Telegram**: @growthguruofficial
- **Email**: support@growthguru.io
- **Documentation**: See README.md in each folder

---

## 📄 License

MIT License - See LICENSE file for details

---

**Made with ❤️ for Telegram Communities**
