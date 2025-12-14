# Growth Guru - Backend (Flask + MongoDB)

This backend implements the API and Telegram bot integration for the Growth Guru Telegram mini app frontend.

## Features

- **Telegram Login + JWT Tokens**: `/api/auth/telegram` verifies login widget payload and returns a short-lived JWT token (24hr expiry) + user profile
- **Protected User Endpoint**: `/api/me` returns authenticated user's real profile from MongoDB (requires valid JWT token in `Authorization: Bearer <token>` header)
- **Smart Time Parsing**: When a request is accepted, day/time slots are converted to UTC datetimes and campaigns are scheduled to post at exact times (e.g., "Monday 14:00-15:00 UTC" → next Monday at 14:00 UTC)
- **Campaign Scheduler**: Posts ads via Telegram bot on schedule and auto-deletes them after duration expires
- **Cross-Promo Requests**: Users can create, list, and accept cross-promotion requests
- **Partner Management**: List available partners by topic
- **MongoDB Persistence**: Collections for users, partners, requests, campaigns

## API Endpoints

### Authentication
- `POST /api/auth/telegram` — Verify Telegram login payload, create user, return JWT token
  - Request: Telegram login widget payload (id, first_name, username, hash, auth_date, etc.)
  - Response: `{ok: true, user: {...}, token: "jwt_token_here"}`

### User (Protected with JWT)
- `GET /api/me` — Get authenticated user's profile (requires `Authorization: Bearer <token>`)
  - Response: User doc with name, cpcBalance, channels, promos, etc.

### Partners
- `GET /api/partners` — List available partners for cross-promotion

### Requests
- `GET /api/requests` — List all requests
- `POST /api/request` — Create new cross-promo request (notify admin/recipient via bot)
  - Body: fromChannel, toChannel, daySelected, timeSelected, duration, cpcCost, promo
- `POST /api/request/<id>/accept` — Accept request and schedule campaign
  - Body: optional chat_id for posting
  - Smart time parsing: Converts day name + time slot to exact UTC datetime and schedules campaign

### Campaigns
- `GET /api/campaigns` — List all campaigns with their status

## Quick Start (Windows PowerShell)

1. Create a Python virtual environment and activate it:

```powershell
python -m venv .venv; .\.venv\Scripts\Activate.ps1
```

2. Install dependencies:

```powershell
pip install -r requirements.txt
```

3. Copy `.env.example` to `.env` and set your values (Mongo URI, Telegram bot token, JWT secret):

```powershell
copy backend\.env.example backend\.env
# then edit backend\.env in an editor and set:
#   - TELEGRAM_BOT_TOKEN (your Telegram bot API token)
#   - MONGO_URI (your MongoDB connection string, e.g., mongodb://localhost:27017/growthguru)
#   - JWT_SECRET (change to something secure!)
```

4. Start MongoDB (if running locally):

```powershell
# On Windows with MongoDB installed:
# mongod.exe
```

5. Run the app:

```powershell
cd backend
python app.py
```

The app will start on `http://localhost:5000`

## Usage Examples

### 1. Authenticate with Telegram (from frontend)
Frontend calls this after user completes Telegram login widget:

```javascript
const telegramPayload = { id: 123, first_name: "John", hash: "...", auth_date: 1702000000, ... };
const res = await fetch('/api/auth/telegram', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(telegramPayload)
});
const { token, user } = await res.json();
// Save token to localStorage or session
localStorage.setItem('token', token);
```

### 2. Get authenticated user's profile
With the token, frontend can now fetch the user's real profile:

```javascript
const token = localStorage.getItem('token');
const res = await fetch('/api/me', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const user = await res.json(); // Real user data from DB
```

### 3. Create and accept a cross-promo request
The backend automatically parses `daySelected` + `timeSelected` into UTC datetimes:

```javascript
// Accept a request
const res = await fetch('/api/request/req_123/accept', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ chat_id: '@my_channel' })
});
const { campaign_id } = await res.json();
// Campaign is now scheduled to post on the selected day/time in UTC
```

The scheduler will post the ad at the exact scheduled time and auto-delete it after the campaign duration.

## Implementation Details

### Time Parsing
- **Input**: day name (e.g., "Wednesday") + time slot (e.g., "14:00 - 15:00 UTC")
- **Output**: next occurrence of that day at that time in UTC
- **Logic**: In `time_utils.py`, `parse_day_time_to_utc()` calculates weekday offset and sets exact time

### JWT Tokens
- Issued by `/api/auth/telegram` after successful Telegram verification
- 24-hour expiry (configurable via `JWT_EXPIRY_HOURS` in `config.py`)
- Required for protected endpoints like `/api/me`
- Decoded and validated by the `@token_required` decorator in `auth.py`

### Campaign Scheduling & Posting
- When a request is accepted, a campaign is created with `status: 'scheduled'`
- Background scheduler (`scheduler.py`) checks every 20 seconds for scheduled campaigns whose `start_at` time has arrived
- Posts the promo via Telegram Bot API with the message id recorded
- Another scheduler job runs every 30 seconds to cleanup finished campaigns (deletes message from Telegram)

## Notes

- The scheduler runs in-process (APScheduler background scheduler). For production, use a dedicated task queue (Celery + Redis) or process manager with multiple workers.
- Bot API requires a valid `TELEGRAM_BOT_TOKEN` — get one from @BotFather on Telegram.
- MongoDB must be running and accessible at the URI in `.env`.
- All times are in UTC internally; frontend should handle timezone conversion for display.
- This is a minimal starting backend to match the provided frontend mocks; add more validation, error handling, and unit tests for production.
