# 🚀 Quick Reference Card - Growth Guru Backend

## 3 New Features at a Glance

### 1️⃣ JWT Token Auth (`auth.py`)
```
Frontend: POST /api/auth/telegram (with Telegram login data)
↓
Backend: Verifies + creates JWT token
↓
Response: {token: "eyJ...", user: {...}}
↓
Frontend: Save token → use in all requests via Authorization header
```

### 2️⃣ Time Parsing (`time_utils.py`)
```
When accepting a request with:
  daySelected: "Wednesday"
  timeSelected: "14:00 - 15:00 UTC"
  duration: 6 hours

Backend calculates:
  • Next Wednesday at 14:00 UTC = start_at
  • Next Wednesday at 20:00 UTC = end_at (start + 6 hours)
  • Scheduler posts at start_at, deletes at end_at
```

### 3️⃣ Protected /api/me (`app.py` + `auth.py`)
```
Frontend: GET /api/me
  Header: Authorization: Bearer <token>
↓
Backend: Validates token → looks up user in MongoDB
↓
Response: Real user profile {name, cpcBalance, channels[], ...}
```

---

## 🔧 Installation (Copy-Paste)

```powershell
cd "backend"
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
# Edit .env with your TELEGRAM_BOT_TOKEN, MONGO_URI, JWT_SECRET
python app.py
```

---

## 📞 API Cheat Sheet

| Endpoint | Method | Token? | Returns |
|----------|--------|--------|---------|
| `/api/auth/telegram` | POST | ❌ | token, user |
| `/api/me` | GET | ✅ | {name, cpcBalance, channels} |
| `/api/partners` | GET | ❌ | [{id, name, topic, ...}] |
| `/api/request` | POST | ❌ | {id} |
| `/api/request/<id>/accept` | POST | ❌ | {campaign_id} (auto-schedules!) |
| `/api/campaigns` | GET | ❌ | [{status, start_at, end_at, ...}] |

Token goes in header: `Authorization: Bearer eyJ0eX...`

---

## 🎯 Frontend Integration Checklist

- [ ] 1. Save JWT token after Telegram login: `localStorage.setItem('authToken', data.token)`
- [ ] 2. Fetch real user instead of mock: `GET /api/me` with token
- [ ] 3. Add token to all API calls: `Authorization: Bearer ${token}`
- [ ] 4. Test: Login → Token saved → Refresh → /api/me works

**See `FRONTEND_INTEGRATION_GUIDE.md` for detailed code examples**

---

## 🛠️ File Legend

| File | Purpose |
|------|---------|
| `app.py` | Flask API + endpoints |
| `auth.py` | JWT token logic + @token_required decorator |
| `time_utils.py` | Parse "Monday 14:00 UTC" → UTC datetime |
| `models.py` | MongoDB collections setup |
| `scheduler.py` | Background jobs for posting/cleanup |
| `bot.py` | Telegram Bot API calls |
| `config.py` | Environment config |
| `requirements.txt` | Python dependencies |
| `.env.example` | Template for environment variables |

---

## 🔍 Verify It Works

```bash
# Terminal 1: Start app
python app.py
# Should see: "Running on http://localhost:5000"

# Terminal 2: Test endpoint
curl http://localhost:5000/api/partners
# Should return: [{id: "p1", name: "Daily Motivation", ...}]
```

---

## ⚡ Key Differences from MVP

| What | MVP | Now |
|------|-----|-----|
| Auth | None | JWT tokens with 24hr expiry |
| User Profile | Hardcoded MOCK_USER | Real data from MongoDB |
| Scheduling | Hardcoded 10 seconds | Smart parsing: "Monday 14:00 UTC" → exact datetime |
| /api/me | Public, returns mock | Protected, returns real user |

---

## 💡 Pro Tips

1. **Save token on login, include it everywhere:**
   ```javascript
   const token = localStorage.getItem('authToken');
   const headers = { 'Authorization': `Bearer ${token}` };
   ```

2. **Test time parsing:** Accept a request for "Monday 14:00 UTC", check `/api/campaigns` to see `start_at` calculated correctly

3. **MongoDB tip:** If testing without DB, backend returns demo user for /api/me anyway

4. **Telegram bot tip:** Need valid TELEGRAM_BOT_TOKEN in .env for actual bot posting to work

---

## 📚 Full Docs

- `README.md` — Setup + API reference + examples
- `FRONTEND_INTEGRATION_GUIDE.md` — Complete frontend code integration
- `IMPLEMENTATION_SUMMARY.md` — Architecture + flow diagrams + security notes

**All files syntax-validated and ready to run! ✓**
