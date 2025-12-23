import axios, { AxiosInstance } from 'axios';
import {
  AuthResponse,
  User,
  Partner,
  CrossPromoRequest,
  Campaign,
  TelegramUser
} from '../types';

// New Interfaces for Channel Management
interface ChannelValidationResponse {
  ok: boolean;
  channel: {
    name: string;
    username: string;
    avatar: string;
    subscribers: number;
    avgViews24h: number;
    language: string;
    telegram_id: string;
  };
}

interface ChannelSubmission {
  channel_info: {
    name: string;
    username: string;
    avatar: string;
    subscribers: number;
    avgViews24h: number;
    language: string;
    telegram_id: string;
  };
  topic: string;
  selected_days: string[];
  promos_per_day: number;
  price_settings: {
    [key: string]: {
      enabled: boolean;
      price: number;
    };
  };
  time_slots: string[];
  promo_materials: Array<{
    id: string;
    name: string;
    text: string;
    image: string;
    link: string;
    cta: string;
  }>;
  bot_connected: boolean;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include token
    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

     // UPDATED: Response interceptor
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
          window.location.href = '/'; // FIXED: redirect to root
        }
        return Promise.reject(error);
      }
    );
  }

  // UPDATED: Authentication method
  async authenticateWithTelegram(userData: TelegramUser): Promise<AuthResponse> {
    try {
      console.log('Authenticating with data:', userData); // DEBUG
      
      const response = await this.api.post('/api/auth/telegram', userData);
      
      console.log('Auth response:', response.data); // DEBUG
      
      // Validate response
      if (!response.data.ok || !response.data.user || !response.data.token) {
        throw new Error('Invalid response from server');
      }
      
      // Store token (Axios interceptor will use it automatically)
      this.setToken(response.data.token);
      
      return response.data;
    } catch (error: any) {
      console.error('Auth error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Authentication failed';
      throw new Error(errorMessage);
    }
  }

  // --- User ---
  async getMe(): Promise<User> {
    const response = await this.api.get('/api/me');
    return response.data;
  }

  // --- Partners ---
  async listPartners(): Promise<Partner[]> {
    const response = await this.api.get('/api/partners');
    return response.data;
  }

  // --- Requests ---
  async listRequests(): Promise<CrossPromoRequest[]> {
    const response = await this.api.get('/api/requests');
    return response.data;
  }

  async createRequest(request: Omit<CrossPromoRequest, 'id' | 'status' | 'created_at'>): Promise<{ ok: boolean; id: string }> {
    const response = await this.api.post('/api/request', request);
    return response.data;
  }

  async acceptRequest(requestId: string, selectedPromo?: any): Promise<{ ok: boolean; campaign_id: string }> {
    const response = await this.api.post(`/api/request/${requestId}/accept`, { selected_promo: selectedPromo });
    return response.data;
  }

  // --- Campaigns ---
  async listCampaigns(): Promise<Campaign[]> {
    const response = await this.api.get('/api/campaigns');
    return response.data;
  }

  // --- Channel Management ---
  async validateChannel(channelInput: string): Promise<ChannelValidationResponse> {
    // Axios automatically handles the headers and base URL
    const response = await this.api.post('/api/channels/validate', { channel_input: channelInput });
    return response.data;
  }

  async submitChannel(channelData: ChannelSubmission): Promise<any> {
    const response = await this.api.post('/api/channels', channelData);
    return response.data;
  }

  async getUserChannels(): Promise<any> {
    const response = await this.api.get('/api/channels');
    return response.data;
  }

  async getChannel(channelId: string): Promise<any> {
    const response = await this.api.get(`/api/channels/${channelId}`);
    return response.data;
  }

  async updateChannel(channelId: string, updates: Partial<ChannelSubmission>): Promise<any> {
    const response = await this.api.put(`/api/channels/${channelId}`, updates);
    return response.data;
  }

  async updateChannelStatus(
  channelId: string,
  status: 'approved' | 'paused'
): Promise<any> {
  const response = await this.api.put(
    `/api/channels/${channelId}/status`,
    { status }
  );
  return response.data;
}

  async pauseChannel(channelId: string, is_paused: boolean): Promise<any> {
    const response = await this.api.put(`/api/channels/${channelId}/pause`, { is_paused });
    return response.data;
  }

  async deleteChannel(channelId: string): Promise<any> {
    const response = await this.api.delete(`/api/channels/${channelId}`);
    return response.data;
  }

  // Admin endpoints

async getAllChannels(): Promise<any> {
  const response = await this.api.get('/api/admin/channels');
  return response.data;
}

async moderateChannel(
  channelId: string,
  action: 'approve' | 'reject',
  reason?: string
): Promise<any> {
  const response = await this.api.post(
    `/api/admin/channels/${channelId}/moderate`,
    { action, reason }
  );
  return response.data;
}

async getAdminStats(): Promise<any> {
  const response = await this.api.get('/api/admin/stats');
  return response.data;
}

// CP Coins / Tasks endpoints

async getTasks(): Promise<any> {
  const response = await this.api.get('/api/tasks');
  return response.data;
}

async claimWelcomeBonus(): Promise<any> {
  const response = await this.api.post('/api/tasks/claim-welcome');
  return response.data;
}

async verifyChannelJoin(): Promise<any> {
  const response = await this.api.post('/api/tasks/verify-channel-join');
  return response.data;
}

async createInviteTask(channelId: string): Promise<any> {
  const response = await this.api.post('/api/tasks/create-invite', {
    channel_id: channelId,
  });
  return response.data;
}

async previewPromo(channelId: string, promoId: string): Promise<any> {
  const response = await this.api.post(
    `/channels/${channelId}/preview-promo`,
    { promo_id: promoId }
  );

  return response.data;
}


// Purchase / Transactions endpoints

async getExchangeRate(): Promise<any> {
  const response = await this.api.get('/api/purchase/rates');
  return response.data;
}

async listAllChannels(): Promise<any> {
  const response = await this.api.get('/api/channels/all');
  return response.data;
}

async initiatePurchase(cpcAmount: number): Promise<any> {
  const response = await this.api.post('/api/purchase/stars', {
    cpc_amount: cpcAmount,
  });
  return response.data;
}

async getTransactions(): Promise<any> {
  const response = await this.api.get('/api/transactions');
  return response.data;
}

async getTransaction(transactionId: string): Promise<any> {
  const response = await this.api.get(`/api/transactions/${transactionId}`);
  return response.data;
}


  // --- Auth Utilities ---

  // Get token
  getToken(): string | null {
    return localStorage.getItem('authToken');
  }

  // Set token
  setToken(token: string): void {
    localStorage.setItem('authToken', token);
  }

  // Clear auth
  clearAuth(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  }

  // Check if authenticated
  isAuthenticated(): boolean {
    return !!this.getToken();
  }
}

export default new ApiService();