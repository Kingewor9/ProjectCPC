# Frontend Integration Guide - Channel Pause/Unpause

## Overview
The backend now supports pausing and unpausing approved channels. This guide shows how to integrate the pause/unpause UI in the Edit Channel settings.

---

## API Endpoint

### Pause/Unpause Channel
**Endpoint:** `PUT /api/channels/<channel_id>/pause`

**Authentication:** Required (token in header)

**Request Body:**
```json
{
  "is_paused": true  // true to pause, false to unpause
}
```

**Success Response (200 OK):**
```json
{
  "ok": true,
  "message": "Channel paused successfully",  // or "activated"
  "is_paused": true
}
```

**Error Responses:**

Channel not found (404):
```json
{
  "error": "Channel not found"
}
```

Channel not approved (400):
```json
{
  "error": "Only approved channels can be paused"
}
```

---

## Frontend Implementation

### 1. Update EditChannelPage Component

Add a pause/unpause toggle in the channel settings. The toggle should only be visible for approved channels.

```jsx
import { useState } from 'react';

// In your EditChannelPage or ChannelSettings component
const EditChannelSettings = ({ channelId, currentStatus, isPaused }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Only show pause toggle for approved channels
  const showPauseControl = currentStatus === 'Active' || currentStatus === 'Paused';

  const handlePauseToggle = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/channels/${channelId}/pause`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          is_paused: !isPaused
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update channel status');
      }

      const data = await response.json();
      
      // Update local state or refetch channel data
      console.log('Channel pause status updated:', data);
      
      // Show success message
      if (data.is_paused) {
        alert('Channel paused successfully');
      } else {
        alert('Channel activated successfully');
      }

      // Refresh channel data or redirect
      // window.location.reload();
      
    } catch (err) {
      setError(err.message);
      console.error('Error updating channel:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* ... other channel settings ... */}
      
      {showPauseControl && (
        <div className="channel-pause-control">
          <label>
            <input
              type="checkbox"
              checked={isPaused}
              onChange={handlePauseToggle}
              disabled={loading}
            />
            Pause Channel
          </label>
          <p className="help-text">
            {isPaused 
              ? "Your channel is paused. It won't appear in discovery and you can't send requests." 
              : "Your channel is active. You can send and receive cross-promotion requests."}
          </p>
          {error && <p className="error">{error}</p>}
        </div>
      )}
    </div>
  );
};

export default EditChannelSettings;
```

---

### 2. Update Channel Status Display

The status field returned from `/api/channels` will now show:
- **"Active"** - approved channel, not paused
- **"Paused"** - approved channel, paused by user
- **"pending"** - awaiting admin review
- **"rejected"** - rejected by admin

Update your status display logic:

```jsx
const getStatusDisplay = (status) => {
  const statusConfig = {
    'Active': { color: 'green', icon: '✓' },
    'Paused': { color: 'orange', icon: '⏸' },
    'pending': { color: 'yellow', icon: '⏳' },
    'rejected': { color: 'red', icon: '✗' }
  };

  const config = statusConfig[status] || { color: 'gray', icon: '?' };
  
  return (
    <span style={{ color: config.color }}>
      {config.icon} {status}
    </span>
  );
};
```

---

### 3. Update Channels List Display

In your "Your Channels" section, the subscriber count should now always show live data:

```jsx
// The 'subs' field in channel object always contains live data from Telegram
<div className="channel-subscribers">
  <strong>Subscribers:</strong> {channel.subs}
</div>
```

No changes needed - the backend now handles live refresh automatically!

---

### 4. Update Send Promotion Logic

When selecting a channel to send a promotion from, check if the channel is not paused:

```jsx
const canSendPromotion = (channel) => {
  // Can only send if approved and not paused
  return channel.status === 'Active';
};

// In your channel selection:
const availableChannels = userChannels.filter(canSendPromotion);
```

If user tries to send from a paused channel, they'll get error:
> "Your channel is currently paused. Please activate it to send cross-promotion requests."

---

## Channel Status Workflow

```
New Channel
    ↓
Submitted (status: "pending")
    ↓
[Admin Review]
    ↓
    ├─→ Approved (status: "approved", is_paused: false) → Shows as "Active"
    │       ↓
    │   User can:
    │   - Send/receive requests
    │   - Pause channel
    │       ↓
    │   Paused (status: "approved", is_paused: true) → Shows as "Paused"
    │       ↓
    │   User can:
    │   - Unpause channel
    │   - Cannot send requests while paused
    │
    └─→ Rejected (status: "rejected") → Shows as "rejected"
```

---

## Examples

### Example 1: Check Current Status in Your Channels

```jsx
// In DashboardPage or YourChannelsPage
useEffect(() => {
  fetchChannels();
}, []);

const fetchChannels = async () => {
  const response = await fetch('/api/channels', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const channels = await response.json();
  
  channels.forEach(ch => {
    console.log(`${ch.name}:`);
    console.log(`  Status: ${ch.status}`);  // "Active", "Paused", "pending", "rejected"
    console.log(`  Subscribers: ${ch.subs}`); // Live count from Telegram
  });
};
```

### Example 2: Discovery Section Shows Only Active Channels

```jsx
// In SendPromotionPage or PartnersPage
useEffect(() => {
  fetchAvailableChannels();
}, []);

const fetchAvailableChannels = async () => {
  const response = await fetch('/api/channels/all', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const channels = await response.json();
  
  // All returned channels are guaranteed to be:
  // - status === "approved"
  // - is_paused === false
  // - subs = live count from Telegram
  
  console.log(`${channels.length} active channels available for discovery`);
};
```

### Example 3: Subscriber Count Always Fresh

```jsx
// No special handling needed!
// Every time you fetch a channel, subs is refreshed

// Old (stale data problem):
// Channel submitted with 1387 subs
// Displayed as 1387 forever ❌

// New (live data):
// Channel submitted with 1387 subs
// Displayed as 1387 → 1388 → 1390 ✓
// Refreshed on every fetch from backend
```

---

## Testing Checklist for Frontend

- [ ] Pause toggle appears for approved channels only
- [ ] Clicking pause updates channel status to "Paused"
- [ ] Clicking unpause updates channel status to "Active"
- [ ] Paused channels disappear from discovery section
- [ ] Paused channels show "Paused" status in your channels
- [ ] Cannot send requests from paused channels (error shown)
- [ ] Subscriber counts update on page refresh
- [ ] All sections (dashboard, discovery, partners) show consistent data

---

## No Changes Needed For:

✓ Avatar display - Still handles fresh URLs
✓ Channel validation section - Already shows live data (no change)
✓ Promo materials display - Works as before
✓ Time slots and pricing - No changes
✓ Analytics and stats - Use existing data

---

## Questions?

Refer to the main implementation summary: `IMPLEMENTATION_FIXES_SUMMARY.md`

