# Growth Guru Backend - Integration Guide for Frontend

This guide explains how the frontend should integrate with the 3 new backend features.

## Feature 1: JWT Token Authentication

### What changed
The `/api/auth/telegram` endpoint now returns a JWT token that must be used for all authenticated requests.

### Frontend Integration Steps

1. **After Telegram Login Widget Success** — send the payload to backend:
```javascript
// In your Telegram login widget callback
const handleTelegramCallback = async (user) => {
  const response = await fetch('http://localhost:5000/api/auth/telegram', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user) // user payload from Telegram widget
  });
  
  const data = await response.json();
  if (data.ok) {
    // Save the token
    localStorage.setItem('authToken', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    // Now authenticated! Redirect to app
  } else {
    console.error('Auth failed:', data.error);
  }
};
```

2. **Use token for all protected endpoints** — add to Authorization header:
```javascript
const getAuthHeaders = () => {
  const token = localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};
```

## Feature 2: Real User Profile from /api/me

### What changed
`/api/me` is now protected and returns the authenticated user's actual profile from MongoDB instead of a mock.

### Frontend Integration Steps

1. **Replace mock data fetch** — call /api/me with token:
```javascript
// In your useEffect or on app init
useEffect(() => {
  const fetchUser = async () => {
    const response = await fetch('http://localhost:5000/api/me', {
      headers: getAuthHeaders()
    });
    const user = await response.json();
    setUser(user); // Replace MOCK_USER with real user from DB
  };
  
  const token = localStorage.getItem('authToken');
  if (token) {
    fetchUser();
  }
}, []);
```

2. **Fallback for demo/testing** — if no token or user not in DB, backend returns demo user structure matching your MOCK_USER:
```javascript
// This still works during testing if you need it
const response = await fetch('http://localhost:5000/api/me', {
  headers: getAuthHeaders() // Still need token
});
```

## Feature 3: Smart Time Parsing for Campaigns

### What changed
When accepting a request, the day/time slots are automatically converted to UTC datetimes. No more guessing — campaigns post at the exact scheduled time.

### Frontend Integration Steps

1. **No change needed!** — your frontend already sends `daySelected` and `timeSelected` to the backend:
```javascript
// Your SendRequestPage already does this correctly
const handleSendRequest = () => {
  fetch('/api/request', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      fromChannel: ...,
      daySelected: 'Wednesday',      // ← Backend will parse this
      timeSelected: '14:00 - 15:00 UTC', // ← and this
      duration: 6,
      cpcCost: 250,
      promo: {...}
    })
  });
};
```

2. **When accepting a request** — the backend automatically calculates the exact datetime:
```javascript
const handleAccept = () => {
  fetch(`/api/request/${requestId}/accept`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      selectedPromoId: selectedPromo
      // The backend uses daySelected + timeSelected from the request
      // to calculate: next Wednesday at 14:00 UTC
      // Then schedules the campaign to post at that exact time
    })
  });
};
```

### How it works
- **Input**: "Wednesday" + "14:00 - 15:00 UTC" 
- **Processing**: Backend calculates next occurrence of Wednesday at 14:00 UTC
- **Output**: Campaign scheduled to post at that exact datetime
- **Demo**: With test config, campaigns post within 10 seconds for testing. Change `start_at` logic in `app.py:accept_request()` if needed

## Complete Frontend Changes Checklist

- [ ] Add `localStorage.setItem('authToken', token)` after Telegram auth
- [ ] Create `getAuthHeaders()` helper that includes `Authorization: Bearer` for all API calls
- [ ] Replace MOCK_USER with `/api/me` fetch (add to `useEffect` in App.jsx)
- [ ] Update all fetch calls to use `getAuthHeaders()` instead of default headers
- [ ] Test: Login → verify token saved → refresh page → verify /api/me still works

## Example: Complete Flow

```javascript
// 1. User logs in with Telegram
const handleTelegramLogin = async (telegramUser) => {
  const res = await fetch('/api/auth/telegram', {
    method: 'POST',
    body: JSON.stringify(telegramUser)
  });
  const { token, user } = await res.json();
  localStorage.setItem('authToken', token);
};

// 2. App loads, fetch real user profile
useEffect(() => {
  const token = localStorage.getItem('authToken');
  if (token) {
    fetch('/api/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(r => r.json()).then(user => setUser(user));
  }
}, []);

// 3. User accepts a cross-promo request
const handleAccept = async (requestId, selectedPromo) => {
  const res = await fetch(`/api/request/${requestId}/accept`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('authToken')}`
    },
    body: JSON.stringify({ selectedPromoId: selectedPromo })
  });
  // Backend automatically schedules campaign posting based on day/time in request
};
```

## Backend Files Added/Modified

- `auth.py` — JWT token creation and verification
- `time_utils.py` — day/time parsing to UTC datetime
- `app.py` — updated endpoints with token requirement and time parsing
- `config.py` — JWT_SECRET and expiry config
- `requirements.txt` — added PyJWT and python-dateutil

All Python files pass syntax validation. Ready to run!
