// User Types
export interface TelegramUser {
  id: string | number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
  isAdmin: boolean;
}

export interface User {
  telegram_id: string;
  name: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  cpcBalance: number;
  channels: Channel[];
  isAdmin: boolean;
}

export interface Channel {
  id: string;
  name: string;
  topic: string;
  subs: number;
  xPromos?: number;
  status: 'Active' | 'Paused' | 'approved' | 'rejected' | 'pending';
  avatar: string;
  promos: Promo[];
}

export interface Promo {
  id: string;
  name: string;
  link: string;
  text: string;
  image?: string;
  cta?: string;
}

// Partner Types
export interface Partner {
  id: string;
  name: string;
  topic: string;
  subs: number;
  lang: string;
  xExchanges: number;
  avatar: string;
  acceptedDays: string[];
  availableTimeSlots: string[];
  durationPrices: Record<string, number>;
  telegram_chat: string;
  telegram_user_id?: string;
  promosPerDay?: number;
}

// Request Types
export interface CrossPromoRequest {
  id?: string;
  fromChannel: string;
  fromChannelId: string;
  toChannel: string;
  toChannelId: string;
  daySelected: string;
  timeSelected: string;
  duration: number;
  cpcCost: number;
  promo: Promo;
  status: 'Pending' | 'Accepted' | 'Rejected';
  created_at?: string;
  accepted_at?: string;
}

// Campaign Types



// Campaign Types - Updated for Manual Posting System
export interface Campaign {
  id: string;
  fromChannelId?: string;
  toChannelId?: string;
  chat_id: string;
  promo: {
    id?: string;
    name: string;
    text: string;
    link: string;
    image?: string;
    cta?: string;
  };
  duration_hours: number;
  
  // Status now includes manual posting workflow
  status: 'pending_posting' | 'active' | 'completed';
  
  // Scheduling info
  scheduled_start_at: string;  // When it was originally scheduled
  scheduled_end_at: string;    // Original scheduled end
  
  // Actual posting times (set by user)
  actual_start_at?: string;    // When user actually posted
  actual_end_at?: string;      // When user ended the campaign
  
  // Verification
  post_verification_link?: string;  // URL user submits as proof
  partner_verified?: boolean;       // Has partner confirmed they posted?
  
  // User role in this campaign
  user_role: 'requester' | 'acceptor';  // Who is viewing this campaign
  
  // Partner info
  partner_channel_name?: string;
  partner_posted?: boolean;  // Has partner posted their side?
  
  // Metadata
  created_at?: string;
  updated_at?: string;
  request_id?: string;  // Link back to original request
  
  // Legacy fields (keep for backward compatibility)
  start_at?: string;
  end_at?: string;
  posted_at?: string;
  ended_at?: string;
  message_id?: string | number;
  error?: string;
}

// Auth Response
export interface AuthResponse {
  ok: boolean;
  user: User;
  token: string;
  error?: string;
}
