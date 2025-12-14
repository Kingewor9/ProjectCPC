# Growth Guru - Frontend Integration Guide

This guide explains how to integrate the frontend with your Flask backend.

## Quick Start (5 minutes)

### 1. Install Frontend Dependencies

```powershell
cd frontend
npm install
```

### 2. Start Frontend Dev Server

```powershell
npm run dev
```

The frontend will start on `http://localhost:3000` and automatically proxy API requests to `http://localhost:5000`.

### 3. Ensure Backend is Running

In another PowerShell terminal:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python app.py
```

### 4. Open in Browser

Visit `http://localhost:3000` and start using the app!

---

## Frontend Structure Overview

The frontend is built with:
- **Vite** - Modern build tool
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling (dark blue/grey theme with white fonts)
- **React Router** - Client-side routing
- **Axios** - API client

### Key Directories

```
frontend/src/
├── pages/           - Page components (one per route)
├── components/      - Reusable UI components
├── services/        - API client (api.ts)
├── hooks/          - Custom React hooks
├── types/          - TypeScript type definitions
└── styles/         - Global CSS
```

---

## API Integration

### Automatic Token Management

The frontend automatically:
1. Stores JWT tokens from backend login
2. Includes tokens in all protected requests via `Authorization: Bearer <token>` header
3. Redirects to login on 401 errors
4. Handles token expiration gracefully

### API Client Usage

All API calls go through `src/services/api.ts`:

```typescript
import apiService from '../services/api';

// Example: Get user profile
const user = await apiService.getMe();

// Example: List campaigns
const campaigns = await apiService.listCampaigns();

// Example: Create request
const result = await apiService.createRequest({
  fromChannel: 'My Channel',
  fromChannelId: 'c1',
  // ... other fields
});
```

---

## Authentication Flow

### 1. Telegram Login Widget
```
User clicks "Login with Telegram"
  ↓
Telegram Web App initializes
  ↓
User completes Telegram login
  ↓
Frontend sends userData to `/api/auth/telegram`
```

### 2. Backend Response
```
Backend verifies Telegram signature
  ↓
Backend creates user in MongoDB
  ↓
Backend generates JWT token
  ↓
Returns: {ok: true, user, token}
```

### 3. Frontend Storage
```
Frontend saves token to localStorage
  ↓
Frontend redirects to dashboard
  ↓
All future API calls include token in header
```

---

## Features Matching Backend

### ✅ Implemented Features

1. **JWT Authentication**
   - Login with Telegram
   - Token stored in localStorage
   - Automatic header injection for protected routes
   - Auto-redirect on token expiration

2. **User Profile**
   - Fetch authenticated user from `/api/me`
   - Display channels, CPC balance, promos
   - Show user avatar and name

3. **Cross-Promotion Requests**
   - Create requests with form: `POST /api/request`
   - List requests: `GET /api/requests`
   - Accept requests: `POST /api/request/<id>/accept`
   - Update status (Pending → Accepted)

4. **Campaign Management**
   - List campaigns: `GET /api/campaigns`
   - Track status: scheduled, running, ended
   - Monitor duration and timing
   - Display auto-deletion schedule

5. **Partner Management**
   - List partners: `GET /api/partners`
   - Filter by topic
   - Show pricing, availability, requirements
   - Display contact information

6. **Smart Time Parsing**
   - Sends `daySelected` and `timeSelected` to backend
   - Backend parses to UTC datetime
   - Frontend displays scheduled times

---

## Page-by-Page Integration

### Login Page (`/login`)
- **Component**: `src/pages/LoginPage.tsx`
- **API**: `POST /api/auth/telegram`
- **Features**:
  - Telegram login widget integration
  - Demo login fallback for testing
  - Redirects to dashboard on success

### Dashboard (`/dashboard`)
- **Component**: `src/pages/DashboardPage.tsx`
- **API**: `GET /api/me`
- **Features**:
  - User profile overview
  - Channel cards with stats
  - Quick action buttons
  - CPC balance display

### Send Request (`/send-request`)
- **Component**: `src/pages/SendRequestPage.tsx`
- **API**: 
  - `GET /api/partners`
  - `POST /api/request`
- **Features**:
  - Select from-channel and to-partner
  - Schedule day/time
  - Choose duration
  - Shows cost calculation
  - Validates sufficient balance

### Requests (`/requests`)
- **Component**: `src/pages/RequestsPage.tsx`
- **API**: 
  - `GET /api/requests`
  - `POST /api/request/<id>/accept`
- **Features**:
  - View pending, accepted, rejected requests
  - Accept/decline requests
  - Shows request details and promo
  - Updates status in real-time

### Campaigns (`/campaigns`)
- **Component**: `src/pages/CampaignsPage.tsx`
- **API**: `GET /api/campaigns`
- **Features**:
  - List by status: scheduled, running, ended
  - Shows timing and duration
  - Links to promotional content
  - Auto-refresh every 30 seconds

### Partners (`/partners`)
- **Component**: `src/pages/PartnersPage.tsx`
- **API**: `GET /api/partners`
- **Features**:
  - Browse all partners
  - Filter by topic
  - Show pricing tiers
  - Display availability/accepted days
  - Links to contact

---

## Styling & Design

### Color Scheme

All colors defined in `tailwind.config.js`:

```javascript
darkBlue: {
  900: '#0a1628',  // Main background
  800: '#1a2f4a',  // Secondary background
  700: '#2a4568',  // Cards/inputs
}
blue: {
  600: '#0078d4',  // Primary actions
  500: '#1084d7',  // Hover states
}
grey: {
  200: '#e5e7eb',  // Default text (white-ish)
  400: '#9ca3af',  // Secondary text
  700: '#374151',  // Borders
}
```

### Typography

- **Font**: Inter (system-ui fallback)
- **Default Color**: `text-white` or `text-grey-200`
- **Secondary Color**: `text-grey-400`
- **Headings**: `font-bold text-white`

### Responsive Design

- Mobile-first approach
- Breakpoints: `sm:` (640px), `md:` (768px), `lg:` (1024px)
- All pages are mobile-responsive
- Sidebar hides on mobile in future updates

---

## Environment Variables

Create `.env.local` in `frontend/` (optional):

```env
VITE_API_URL=http://localhost:5000
```

If not set, defaults to `http://localhost:5000`.

For production, change to your backend URL.

---

## Error Handling

### API Errors

All API errors are caught and can be displayed:

```typescript
try {
  await apiService.getMe();
} catch (error) {
  console.error('Failed to fetch user:', error);
  // Display error to user via ErrorAlert component
}
```

### Protected Routes

Routes are protected with `ProtectedRoute` component in `src/App.tsx`:
- Checks for valid token in localStorage
- Redirects to `/login` if missing
- Shows loading spinner while checking

### Error Display

Use `ErrorAlert` component:

```typescript
<ErrorAlert 
  message="Failed to load data"
  onDismiss={() => setError(null)}
/>
```

---

## Development Workflow

### Adding a New Page

1. Create component in `src/pages/NewPage.tsx`
2. Add route in `src/App.tsx`:
   ```typescript
   <Route path="/newpage" element={<ProtectedRoute><NewPage /></ProtectedRoute>} />
   ```
3. Add navigation link in `src/components/Sidebar.tsx`

### Calling a New Backend Endpoint

1. Add method to `src/services/api.ts`:
   ```typescript
   async newEndpoint(): Promise<ReturnType> {
     const response = await this.api.get('/api/endpoint');
     return response.data;
   }
   ```

2. Use in component:
   ```typescript
   const data = await apiService.newEndpoint();
   ```

### Adding New Types

Add to `src/types/index.ts`:

```typescript
export interface NewType {
  id: string;
  // ... fields
}
```

---

## Testing & Debugging

### Browser DevTools

1. Open DevTools (F12)
2. Check Network tab for API calls
3. Check Console for errors
4. Check Application tab for localStorage tokens

### Local Storage

Token and user data are stored in localStorage:
- Key: `authToken` - JWT token
- Key: `user` - User profile JSON

Clear with:
```javascript
localStorage.clear();
```

### API Debugging

Add logging to `src/services/api.ts` to debug requests:

```typescript
this.api.interceptors.request.use((config) => {
  console.log('Request:', config);
  return config;
});
```

---

## Production Build

### Build Command

```powershell
npm run build
```

### Output

- Generates `dist/` folder with optimized files
- Production-ready bundle (~150KB gzipped)
- All assets minified and code-split

### Deployment

The built files in `dist/` can be served by any static host:
- Vercel, Netlify (recommended)
- GitHub Pages
- Your own server (nginx, Apache, etc.)

---

## Troubleshooting

### Q: Frontend won't connect to backend
**A**: 
- Check backend is running on `http://localhost:5000`
- Check no CORS errors in browser console
- Verify API URL in environment

### Q: Tokens not saving
**A**:
- Check browser localStorage (DevTools → Application → Storage)
- Check for browser extensions blocking storage
- Verify token in login response

### Q: Pages won't load
**A**:
- Check user is authenticated (token in localStorage)
- Check network tab for API errors
- Verify backend endpoints respond correctly

### Q: Build fails
**A**:
- Clear `node_modules` and reinstall: `npm install`
- Clear Vite cache: `rm -r .vite`
- Check TypeScript errors: `npx tsc --noEmit`

---

## Next Steps

1. ✅ Install and start frontend: `npm run dev`
2. ✅ Start backend: `python app.py`
3. ✅ Open `http://localhost:3000`
4. ✅ Test login flow
5. ✅ Test creating cross-promo request
6. ✅ Test accepting request and campaign scheduling

---

## Additional Resources

- **Vite Docs**: https://vitejs.dev/
- **React Docs**: https://react.dev/
- **Tailwind CSS**: https://tailwindcss.com/
- **TypeScript**: https://www.typescriptlang.org/
- **Axios**: https://axios-http.com/

---

## Support

For issues:
1. Check frontend console (F12)
2. Check backend logs
3. Review this guide for common issues
4. Email: support@growthguru.io
