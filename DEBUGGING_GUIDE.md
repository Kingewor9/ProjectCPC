# Debugging & Verification Guide

## Quick Verification Checklist

After deploying the fixes, verify these points:

### ✅ Browser DevTools Checks

1. **Local Storage Check**:
   - DevTools → Application → Local Storage
   - After login, should see:
     - `authToken`: JWT token string
     - `user`: JSON user object
   - These should NOT clear when navigating between pages

2. **Network Tab Analysis**:
   - Open DevTools → Network tab
   - Refresh page while logged in
   - **Expected**: 
     - 1 GET /api/me (on load only)
     - Regular API calls for features (GET /api/partners, etc.)
   - **NOT Expected**:
     - Multiple POST /api/auth/telegram
     - Repetitive GET /api/me (every second)
     - Infinite OPTIONS requests

3. **Console Check**:
   - Should see: "Attempting login..." (once)
   - Should see: "Login successful" (once)
   - Should NOT see: Login messages repeating

### ✅ Functional Tests

1. **Fresh Login Test**:
   ```
   1. Clear all data: DevTools → Application → Clear All
   2. Reload page
   3. Complete Telegram login
   4. Verify: Redirected to dashboard ✓
   5. Network: Should see ~3-5 requests total ✓
   6. Check localStorage: authToken + user present ✓
   ```

2. **Persistence Test**:
   ```
   1. After login, press F5 (refresh)
   2. Should stay logged in (no loading spinner)
   3. Should NOT see login screen
   4. Network tab: Only normal page load requests ✓
   ```

3. **Navigation Test**:
   ```
   1. Click any nav button (Partners, Campaigns, etc.)
   2. Page should load normally
   3. Should NOT see login screen
   4. Network tab: Only requested endpoint, NO /api/me repeating ✓
   ```

4. **Different User Test**:
   ```
   1. Login as User A
   2. Clear localStorage (simulate Telegram app switch)
   3. Reload page
   4. Should trigger new login (not cached from User A) ✓
   ```

## Common Issues & Solutions

### Issue 1: Still seeing multiple GET /api/me requests

**Symptoms**: 
- Console shows "Attempting login..." multiple times
- Network shows 10+ GET /api/me requests per second

**Solution**:
- Check if `useAuth` is being used in multiple components
- Verify no parent component is updating state that causes re-renders
- Check: Do you have StrictMode enabled in React?
  ```tsx
  // If you see duplicate logs, StrictMode is intentional
  <React.StrictMode>
    <App />
  </React.StrictMode>
  ```

### Issue 2: Login redirects but then shows login screen again

**Symptoms**:
- Login completes → Redirected to dashboard → Instantly shows login screen
- User disappears from localStorage

**Solution**:
- Check if token is being saved: DevTools → Application → Local Storage → authToken
- Verify backend returns proper token: Check response in Network tab
- Check useAuth login method: Is it calling `apiService.setToken()`?

### Issue 3: Dashboard loads but says "Loading..." forever

**Symptoms**:
- Dashboard shows LoadingSpinner indefinitely
- ProtectedRoute never renders children

**Solution**:
- Check ProtectedRoute: `loading` state should become false
- Verify `initialized` flag in useAuth becomes true
- Check network: Did /api/me request complete or timeout?

### Issue 4: Clicking nav buttons triggers login again

**Symptoms**:
- User data appears to be lost after navigation
- Redirected to login screen

**Solution**:
- Check isAuthenticated logic: Should check localStorage.getItem('authToken')
- Verify localStorage isn't being cleared
- Check if useAuth is in dependency array of useEffect (it shouldn't be)

## Debug Logging

Add these temporary logs to diagnose issues:

### In useAuth.ts:
```typescript
useEffect(() => {
  console.log('useAuth mounted');
  
  const initializeAuth = async () => {
    console.log('Initializing auth...');
    console.log('isAuthenticated:', apiService.isAuthenticated());
    console.log('user state:', user);
    
    if (apiService.isAuthenticated() && !user) {
      console.log('Fetching user data...');
      try {
        const userData = await apiService.getMe();
        console.log('User fetched:', userData);
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
      } catch (err) {
        console.error('Failed to fetch user:', err);
        apiService.clearAuth();
        setUser(null);
      } finally {
        setInitialized(true);
      }
    } else {
      console.log('Auth init skipped - already logged in or no token');
      setInitialized(true);
    }
  };

  initializeAuth();
}, []);
```

### In TelegramAuth.tsx:
```typescript
useEffect(() => {
  console.log('TelegramAuth mounted');
  console.log('Already authenticated?', isAuthenticated);
  
  if (isAuthenticated) {
    console.log('Already logged in, redirecting to dashboard');
    navigate('/dashboard', { replace: true });
    return;
  }
  
  // ... rest of auth code
}, [isAuthenticated, navigate]);
```

## Production Monitoring

### Metrics to Track:

1. **Authentication Success Rate**:
   - Track: POST /api/auth/telegram responses
   - Alert if success rate drops below 95%

2. **Auth API Performance**:
   - Track: POST /api/auth/telegram response time
   - Alert if > 2 seconds

3. **ME Endpoint Load**:
   - Track: GET /api/me request count
   - Alert if requests > 10 per user per minute
   - Before fix: Could see 1000+ per minute
   - After fix: Should be < 5 per minute

4. **Login Error Messages**:
   - Track: Error responses from /api/auth/telegram
   - Monitor for patterns (token invalid, user not found, etc.)

### Sample Monitoring Query (if using logs):
```
# Count GET /api/me requests per user per minute
GET /api/me | stats count by telegram_id

# Before fix: 100-1000+ per minute per user
# After fix: 0-5 per minute per user
```

## Testing the Fix on Staging

Before deploying to production:

1. **Deploy backend**: No changes needed
2. **Deploy frontend**: Push the modified files
3. **Clear CDN cache**: If using Vercel, clear cache
4. **Test in incognito**: Avoid browser cache issues
5. **Test on mobile**: Original issue reported on mobile
6. **Monitor logs**: Watch for the request patterns improving

## Rollback Plan

If issues occur:

1. **Revert changes**:
   ```bash
   git revert <commit-hash>
   ```

2. **The old code is still functional**, just inefficient:
   - It will make more API calls
   - But app will still work
   - Users just experience slower login

## Performance Before & After

### Before Fix (Issues):
- Login time: 10-15 seconds (due to repeated auth checks)
- API calls during login: 100-500 requests
- Network bandwidth: High
- User experience: Freezing, slow loading

### After Fix (Expected):
- Login time: 2-3 seconds (direct + one sync)
- API calls during login: 3-5 requests
- Network bandwidth: Normal
- User experience: Smooth, responsive

## Additional Improvements (Optional)

### 1. Add timeout handling:
```typescript
const loginWithTimeout = async (data: any) => {
  return Promise.race([
    login(data),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Login timeout')), 10000)
    )
  ];
};
```

### 2. Implement retry logic:
```typescript
const loginWithRetry = async (data: any, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await login(data);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
};
```

### 3. Add session expiration handling:
```typescript
// Check token expiry
if (token && isTokenExpired(token)) {
  clearAuth();
  navigate('/');
}
```
