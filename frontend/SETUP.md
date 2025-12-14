# Growth Guru Frontend - Setup Guide

This guide will help you get the frontend up and running alongside the backend.

## Prerequisites

- Node.js 16.0 or higher
- npm or yarn
- Flask backend running on `http://localhost:5000`

## Installation Steps

### 1. Navigate to Frontend Directory

```powershell
cd "frontend"
```

### 2. Install Dependencies

```powershell
npm install
```

This will install:
- React 18 and React DOM
- React Router for navigation
- Axios for API calls
- Tailwind CSS for styling
- TypeScript for type safety
- Vite build tools

### 3. Configure Environment (Optional)

Create a `.env.local` file if you need to change the API URL:

```
VITE_API_URL=http://localhost:5000
```

If not created, it defaults to `http://localhost:5000`.

### 4. Start Development Server

```powershell
npm run dev
```

The app will start on `http://localhost:3000` and will proxy API calls to the backend.

## Building for Production

```powershell
npm run build
```

This generates an optimized production build in the `dist/` directory.

## Project Features

✅ **Authentication**
- Telegram login integration
- JWT token management
- Protected routes

✅ **Dashboard**
- User profile with channel overview
- CPC balance tracking
- Quick action buttons

✅ **Cross-Promotion**
- Send promotion requests
- View incoming/outgoing requests
- Accept and schedule campaigns

✅ **Campaign Management**
- Schedule campaigns with UTC time parsing
- Track campaign status
- Monitor duration and auto-deletion

✅ **Partner Discovery**
- Browse partner channels
- Filter by topic
- View pricing and availability

✅ **Analytics**
- Performance metrics
- Growth tracking
- Engagement rates

## Design Features

🎨 **Modern UI Theme**
- Dark blue (`#0a1628`, `#1a2f4a`, `#2a4568`)
- Bright blue accents (`#0078d4`)
- Grey text on dark backgrounds
- White fonts for readability

📱 **Responsive Design**
- Works on desktop and mobile
- Responsive navigation
- Touch-friendly buttons

⚡ **Performance**
- Lightning-fast Vite builds
- Code splitting by route
- Optimized bundle size

## File Structure

```
frontend/
├── src/
│   ├── components/      # Reusable UI components
│   ├── pages/          # Page components (one per route)
│   ├── services/       # API client
│   ├── hooks/          # Custom React hooks
│   ├── types/          # TypeScript definitions
│   ├── styles/         # Global CSS
│   ├── App.tsx         # Main app with routing
│   └── main.tsx        # Entry point
├── index.html          # HTML template
├── vite.config.ts      # Vite configuration
├── tailwind.config.js  # Tailwind configuration
├── tsconfig.json       # TypeScript configuration
└── package.json        # Dependencies
```

## API Endpoints

The frontend connects to these backend endpoints:

**Authentication**
- `POST /api/auth/telegram` - Login with Telegram payload

**User**
- `GET /api/me` - Get authenticated user profile

**Requests**
- `GET /api/requests` - List cross-promo requests
- `POST /api/request` - Create new request
- `POST /api/request/<id>/accept` - Accept request

**Campaigns**
- `GET /api/campaigns` - List campaigns

**Partners**
- `GET /api/partners` - List available partners

## Development Commands

```powershell
# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Check for linting errors
npm run lint
```

## Troubleshooting

### Port 3000 Already in Use
Change the port in `vite.config.ts`:
```typescript
server: {
  port: 3001,  // Change this
}
```

### API Connection Issues
1. Ensure Flask backend is running: `python app.py`
2. Check that it's on `http://localhost:5000`
3. Verify CORS is enabled in Flask

### Module Not Found Errors
```powershell
rm -r node_modules
npm install
```

### TypeScript Errors
Check your types:
```powershell
npx tsc --noEmit
```

## Next Steps

1. ✅ Start the frontend: `npm run dev`
2. ✅ Ensure backend is running: `python app.py` (in backend folder)
3. ✅ Open `http://localhost:3000` in your browser
4. ✅ Login with Telegram or use demo credentials
5. ✅ Start creating cross-promo campaigns!

## Support

For issues:
- Check the `README.md` in the frontend folder
- Review backend logs for API errors
- Check browser console for frontend errors

Enjoy using Growth Guru! 🚀
