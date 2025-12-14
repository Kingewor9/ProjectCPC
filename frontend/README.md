# Growth Guru Frontend - Vite + React + TypeScript

A modern, full-featured frontend for the Growth Guru cross-promotion platform built with Vite, React, TypeScript, and Tailwind CSS.

## Features

✨ **Modern UI** - Dark blue and grey theme with white fonts
🔐 **JWT Authentication** - Secure Telegram login integration
📱 **Responsive Design** - Works on desktop and mobile
⚡ **Real-time Updates** - Live campaign tracking and notifications
🎯 **Cross-Promotion** - Send and manage promotional requests
📊 **Analytics** - Track your performance metrics
🧪 **Type-Safe** - Full TypeScript support

## Tech Stack

- **Vite** - Lightning-fast build tool
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first styling
- **React Router v6** - Client-side routing
- **Axios** - HTTP client
- **Lucide React** - Beautiful icons

## Project Structure

```
frontend/
├── src/
│   ├── components/          # Reusable React components
│   │   ├── Layout.tsx
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   ├── LoadingSpinner.tsx
│   │   └── ErrorAlert.tsx
│   ├── pages/               # Page components
│   │   ├── LoginPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── SendRequestPage.tsx
│   │   ├── RequestsPage.tsx
│   │   ├── CampaignsPage.tsx
│   │   ├── PartnersPage.tsx
│   │   ├── AnalyticsPage.tsx
│   │   ├── HelpPage.tsx
│   │   └── SettingsPage.tsx
│   ├── services/            # API services
│   │   └── api.ts          # Axios API client with interceptors
│   ├── hooks/               # Custom React hooks
│   │   ├── useAuth.ts
│   │   └── useAsync.ts
│   ├── types/               # TypeScript type definitions
│   │   └── index.ts
│   ├── styles/              # Global styles
│   │   └── index.css
│   ├── App.tsx              # Main app component with routing
│   └── main.tsx             # React DOM entry point
├── index.html               # HTML entry point
├── vite.config.ts           # Vite configuration
├── tailwind.config.js       # Tailwind CSS configuration
├── tsconfig.json            # TypeScript configuration
└── package.json             # Dependencies and scripts
```

## Installation

### Prerequisites
- Node.js 16.0+
- npm or yarn

### Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Create a `.env.local` file (optional):
```env
VITE_API_URL=http://localhost:5000
```

## Development

Start the development server:

```bash
npm run dev
# or
yarn dev
```

The app will be available at `http://localhost:3000`

The Vite dev server is configured to proxy API requests to `http://localhost:5000` (your Flask backend).

## Production Build

Build the app for production:

```bash
npm run build
# or
yarn build
```

Preview the production build locally:

```bash
npm run preview
```

## Design System

### Colors

**Dark Blue Theme**
- `darkBlue-900`: `#0a1628` - Main background
- `darkBlue-800`: `#1a2f4a` - Secondary background
- `darkBlue-700`: `#2a4568` - Tertiary background

**Blue Accents**
- `blue-600`: `#0078d4` - Primary action
- `blue-500`: `#1084d7` - Hover state

**Grey Text**
- `grey-900`: `#111318` - Darkest text
- `grey-200`: `#e5e7eb` - Default text
- `grey-400`: `#9ca3af` - Secondary text
- `grey-700`: `#374151` - Borders

### Typography
- Font Family: Inter
- Primary: White (`#ffffff`)
- Secondary: Grey 400

## API Integration

The frontend integrates with the Flask backend at `/api/`:

### Authentication
- `POST /api/auth/telegram` - Login with Telegram
- `GET /api/me` - Get authenticated user profile

### Requests
- `GET /api/requests` - List all requests
- `POST /api/request` - Create new request
- `POST /api/request/<id>/accept` - Accept request

### Campaigns
- `GET /api/campaigns` - List campaigns
- `POST /api/partners` - List partner channels

See `src/services/api.ts` for implementation details.

## Features in Detail

### 1. Authentication
- Telegram login widget integration
- JWT token management
- Automatic token refresh
- Protected routes

### 2. Dashboard
- User profile overview
- Channel management
- CPC balance display
- Quick action buttons

### 3. Cross-Promotion Requests
- Create new requests with detailed scheduling
- View incoming and outgoing requests
- Accept/decline requests
- Real-time status updates

### 4. Campaign Management
- Schedule campaigns with UTC time parsing
- Track campaign status (scheduled, running, ended)
- Monitor campaign duration
- Auto-delete messages after duration

### 5. Partner Discovery
- Browse available partner channels
- Filter by topic
- View partner details and pricing
- Direct contact integration

### 6. Analytics
- View performance metrics
- Track impressions and engagement
- Monitor subscriber growth

## Customization

### Adding New Pages
1. Create a new file in `src/pages/YourPage.tsx`
2. Add the route in `src/App.tsx`
3. Update navigation in `src/components/Sidebar.tsx`

### Modifying Colors
Edit the color palette in `tailwind.config.js`:

```js
colors: {
  darkBlue: {
    900: '#0a1628', // Change here
    // ...
  }
}
```

### Extending API
Add new endpoints to `src/services/api.ts`:

```typescript
async yourNewEndpoint(): Promise<YourType> {
  const response = await this.api.get('/api/endpoint');
  return response.data;
}
```

## Error Handling

The API client includes automatic error handling:
- Network errors are logged to console
- 401 (Unauthorized) errors redirect to login
- All errors can be displayed to users via `ErrorAlert` component

## Performance

- Code splitting by route
- Lazy loading with React Router
- Optimized images with CDN URLs
- Minimal bundle size with tree-shaking

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## Troubleshooting

### API Connection Issues
1. Ensure Flask backend is running on `http://localhost:5000`
2. Check CORS settings in Flask app
3. Verify `VITE_API_URL` in environment

### Token Expiration
- Tokens expire after 24 hours
- User will be redirected to login automatically
- Clear localStorage if having auth issues

### Build Errors
1. Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
2. Clear Vite cache: `rm -rf .vite`
3. Check TypeScript errors: `npx tsc --noEmit`

## License

MIT License - See LICENSE file for details

## Support

For issues and questions:
- Email: support@growthguru.io
- Telegram: @growthguruofficial
