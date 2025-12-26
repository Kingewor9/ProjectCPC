import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';
import { useAuth } from '../hooks/useAuth';
import apiService from '../services/api';
import { Zap, Clock, CheckCircle, Send, ExternalLink, StopCircle, AlertCircle } from 'lucide-react';

interface Campaign {
  id: string;
  fromChannelId?: string;
  toChannelId?: string;
  partner_channel_name?: string;
  promo: {
    name: string;
    text: string;
    link: string;
    image?: string;
    cta?: string;
  };
  duration_hours: number;
  status: 'pending_posting' | 'active' | 'completed' | 'expired';
  actual_start_at?: string;
  actual_end_at?: string;
  post_verification_link?: string;
  user_role: 'requester' | 'acceptor';
  cpc_cost?: number;
  posting_deadline?: string;  // NEW: 48-hour deadline
}

export default function CampaignsPage() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [postLink, setPostLink] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [deadlineTimeLeft, setDeadlineTimeLeft] = useState<{[key: string]: number}>({});

  useEffect(() => {
    if (user) {
      fetchCampaigns();
      const interval = setInterval(fetchCampaigns, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Timer for campaign deadlines (48 hours)
  useEffect(() => {
    const calculateDeadlines = () => {
      const newDeadlines: {[key: string]: number} = {};
      
      campaigns.forEach(campaign => {
        if (campaign.status === 'pending_posting' && campaign.posting_deadline) {
          const deadline = new Date(campaign.posting_deadline).getTime();
          const now = Date.now();
          const remaining = Math.max(0, deadline - now);
          newDeadlines[campaign.id] = remaining;
        }
      });
      
      setDeadlineTimeLeft(newDeadlines);
    };

    calculateDeadlines();
    const timer = setInterval(calculateDeadlines, 1000);
    return () => clearInterval(timer);
  }, [campaigns]);

  // Timer for active campaigns
  useEffect(() => {
    if (selectedCampaign?.status === 'active' && selectedCampaign.actual_start_at) {
      const calculateTimeLeft = () => {
        const start = new Date(selectedCampaign.actual_start_at!).getTime();
        const duration = selectedCampaign.duration_hours * 60 * 60 * 1000;
        const end = start + duration;
        const now = Date.now();
        const remaining = Math.max(0, end - now);
        setTimeLeft(remaining);
      };

      calculateTimeLeft();
      const timer = setInterval(calculateTimeLeft, 1000);
      return () => clearInterval(timer);
    }
  }, [selectedCampaign]);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.listCampaigns();
      
      if (!Array.isArray(data)) {
        console.error('Invalid campaigns data:', data);
        setError('Invalid data received from server');
        setCampaigns([]);
        return;
      }
      
      setCampaigns(data);
    } catch (err: any) {
      const errorMessage = err?.response?.data?.error || err?.message || 'Failed to load campaigns';
      setError(errorMessage);
      console.error('Error loading campaigns:', err);
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendToTelegram = async (campaign: Campaign) => {
    setActionLoading(true);
    try {
      await apiService.sendCampaignToTelegram(campaign.id);
      alert('Promo sent to your Telegram! Check your messages and forward it to your channel.');
    } catch (err: any) {
      const errorMsg = err?.response?.data?.error || 'Failed to send to Telegram';
      alert(errorMsg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyAndStart = async () => {
    if (!postLink.trim() || !selectedCampaign) return;
    
    setActionLoading(true);
    try {
      await apiService.verifyAndStartCampaign(selectedCampaign.id, postLink);
      alert('Campaign started! Your timer is now running.');
      setPostLink('');
      fetchCampaigns();
      setSelectedCampaign(null);
    } catch (err: any) {
      const errorMsg = err?.response?.data?.error || 'Failed to start campaign';
      alert(errorMsg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEndCampaign = async (campaign: Campaign) => {
    // Check if time is up
    if (timeLeft > 0) {
      alert(`Please wait for the campaign to complete. Time remaining: ${formatTimeLeft(timeLeft)}`);
      return;
    }

    if (!confirm('Campaign duration has ended. Click OK to claim your reward!')) return;
    
    setActionLoading(true);
    try {
      const result = await apiService.endCampaign(campaign.id);
      alert(`Campaign completed! You earned ${result.reward} CP Coins!`);
      fetchCampaigns();
      setSelectedCampaign(null);
    } catch (err: any) {
      const errorMsg = err?.response?.data?.error || 'Failed to end campaign';
      alert(errorMsg);
    } finally {
      setActionLoading(false);
    }
  };

  const formatTimeLeft = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  const formatDeadline = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m left to post`;
    } else if (minutes > 0) {
      return `${minutes}m left to post`;
    } else {
      return 'Deadline passed';
    }
  };

  const getStatusBadge = (status: Campaign['status']) => {
    const configs = {
      pending_posting: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: Clock, label: 'Pending' },
      active: { bg: 'bg-green-500/20', text: 'text-green-400', icon: Zap, label: 'Active' },
      completed: { bg: 'bg-gray-500/20', text: 'text-gray-400', icon: CheckCircle, label: 'Completed' },
      expired: { bg: 'bg-red-500/20', text: 'text-red-400', icon: AlertCircle, label: 'Expired' }
    };
    const config = configs[status];
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
        <Icon size={16} />
        {config.label}
      </span>
    );
  };

  const CampaignCard = ({ campaign }: { campaign: Campaign }) => (
    <div 
      onClick={() => setSelectedCampaign(campaign)}
      className="bg-darkBlue-800 border border-grey-700 rounded-lg p-6 hover:border-blue-500 transition-colors cursor-pointer"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-white mb-1">{campaign.promo.name}</h3>
          <p className="text-grey-400 text-sm">Partner: {campaign.partner_channel_name}</p>
          <p className="text-grey-500 text-xs mt-1">
            {campaign.user_role === 'requester' ? '👉 You requested' : '✅ You accepted'}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {getStatusBadge(campaign.status)}
          
          {/* 48-hour deadline timer - only show for pending */}
          {campaign.status === 'pending_posting' && campaign.posting_deadline && deadlineTimeLeft[campaign.id] !== undefined && (
            <div className="text-xs text-orange-400 font-medium bg-orange-500/10 px-2 py-1 rounded">
              ⏰ {formatDeadline(deadlineTimeLeft[campaign.id])}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-grey-400">
          <Clock size={16} />
          <span>Duration: {campaign.duration_hours}h</span>
        </div>
        {campaign.status === 'active' && campaign.actual_start_at && (
          <div className="flex items-center gap-2 text-green-400 font-medium">
            <Zap size={16} />
            <span>Running for {Math.floor((Date.now() - new Date(campaign.actual_start_at).getTime()) / (1000 * 60 * 60))}h</span>
          </div>
        )}
        {campaign.status === 'expired' && (
          <div className="flex items-center gap-2 text-red-400 font-medium">
            <AlertCircle size={16} />
            <span>Failed to post within 48 hours</span>
          </div>
        )}
      </div>
    </div>
  );

  const CampaignDetailModal = ({ campaign }: { campaign: Campaign }) => (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-darkBlue-800 border border-grey-700 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">{campaign.promo.name}</h2>
            <p className="text-grey-400">Partner: {campaign.partner_channel_name}</p>
            <p className="text-grey-500 text-sm mt-1">
              {campaign.user_role === 'requester' ? '👉 You requested this' : '✅ You accepted this'}
            </p>
          </div>
          <button 
            onClick={() => setSelectedCampaign(null)}
            className="text-grey-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {getStatusBadge(campaign.status)}

        <div className="mt-6 space-y-6">
          {/* Promo Preview */}
          <div className="bg-darkBlue-900 rounded-lg p-4 border border-grey-700">
            <h3 className="text-white font-semibold mb-3">Promo to Post</h3>
            {campaign.promo.image && (
              <img src={campaign.promo.image} alt={campaign.promo.name} className="w-full h-48 object-cover rounded-lg mb-3" />
            )}
            <p className="text-grey-300 text-sm mb-3">{campaign.promo.text}</p>
            {campaign.promo.link && (
              <a 
                href={campaign.promo.link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm"
              >
                <ExternalLink size={16} />
                {campaign.promo.link}
              </a>
            )}
          </div>

          {/* Actions based on status */}
          {campaign.status === 'pending_posting' && (
            <div className="space-y-4">
              {/* 48-hour deadline warning */}
              {campaign.posting_deadline && deadlineTimeLeft[campaign.id] !== undefined && (
                <div className={`rounded-lg p-4 border ${
                  deadlineTimeLeft[campaign.id] < 24 * 60 * 60 * 1000 
                    ? 'bg-red-500/10 border-red-500/30' 
                    : 'bg-orange-500/10 border-orange-500/30'
                }`}>
                  <div className="flex items-start gap-3">
                    <AlertCircle className={
                      deadlineTimeLeft[campaign.id] < 24 * 60 * 60 * 1000 
                        ? 'text-red-400' 
                        : 'text-orange-400'
                    } size={20} />
                    <div>
                      <p className={`font-medium mb-1 ${
                        deadlineTimeLeft[campaign.id] < 24 * 60 * 60 * 1000 
                          ? 'text-red-400' 
                          : 'text-orange-400'
                      }`}>
                        ⏰ {formatDeadline(deadlineTimeLeft[campaign.id])}
                      </p>
                      <p className="text-grey-300 text-sm">
                        You have 48 hours from campaign creation to post the promo. 
                        Failure to post will result in campaign expiry and a 250 CP penalty.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={() => handleSendToTelegram(campaign)}
                disabled={actionLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Send size={20} />
                Get Promo in Telegram
              </button>
              
              <div className="bg-darkBlue-900 rounded-lg p-4 border border-grey-700">
                <h4 className="text-white font-medium mb-2">📋 Next Steps:</h4>
                <ol className="text-grey-300 text-sm space-y-2 list-decimal list-inside">
                  <li>Click "Get Promo in Telegram"</li>
                  <li>Forward the message to your channel</li>
                  <li>Copy the post link from your channel</li>
                  <li>Submit the link below to start your timer</li>
                </ol>
              </div>

              <div className="space-y-2">
                <label className="text-white text-sm font-medium">Post Link (after you've posted)</label>
                <input
                  type="url"
                  value={postLink}
                  onChange={(e) => setPostLink(e.target.value)}
                  placeholder="https://t.me/yourchannel/123"
                  className="w-full bg-darkBlue-900 border border-grey-700 rounded-lg px-4 py-3 text-white"
                />
                <button
                  onClick={handleVerifyAndStart}
                  disabled={!postLink.trim() || actionLoading}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium disabled:opacity-50"
                >
                  ✓ Start My Campaign
                </button>
              </div>
            </div>
          )}

          {campaign.status === 'active' && (
            <div className="space-y-4">
              <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-6 text-center">
                <Zap className="w-12 h-12 text-green-400 mx-auto mb-3" />
                <h4 className="text-white text-xl font-bold mb-2">Campaign Active!</h4>
                <div className="text-3xl font-mono text-green-400 mb-2">
                  {formatTimeLeft(timeLeft)}
                </div>
                <p className="text-grey-400 text-sm">Time remaining</p>
              </div>

              {campaign.post_verification_link && (
                <a 
                  href={campaign.post_verification_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 text-blue-400 hover:text-blue-300 text-sm"
                >
                  <ExternalLink size={16} />
                  View Your Post
                </a>
              )}

              <button
                onClick={() => handleEndCampaign(campaign)}
                disabled={timeLeft > 0 || actionLoading}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <StopCircle size={20} />
                {timeLeft > 0 ? 'Wait for Timer to Complete' : 'End Campaign & Claim Reward'}
              </button>

              {timeLeft > 0 && (
                <p className="text-grey-400 text-xs text-center">
                  Button will activate when timer reaches 0
                </p>
              )}
            </div>
          )}

          {campaign.status === 'completed' && (
            <div className="bg-gray-500/20 border border-gray-500/30 rounded-lg p-4 text-center">
              <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h4 className="text-white font-medium mb-2">Campaign Completed</h4>
              <p className="text-grey-400 text-sm">
                Reward has been added to your balance
              </p>
            </div>
          )}

          {campaign.status === 'expired' && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 text-center">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
              <h4 className="text-white font-medium mb-2">Campaign Expired</h4>
              <p className="text-red-300 text-sm mb-3">
                You failed to post the promo within 48 hours
              </p>
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-red-400 text-sm font-medium">
                  Penalty: -250 CP Coins deducted from your balance
                </p>
              </div>
              <p className="text-grey-400 text-xs mt-3">
                Your partner will still receive their reward if they completed their side
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const pendingCampaigns = campaigns.filter(c => c.status === 'pending_posting');
  const activeCampaigns = campaigns.filter(c => c.status === 'active');
  const completedCampaigns = campaigns.filter(c => c.status === 'completed');
  const expiredCampaigns = campaigns.filter(c => c.status === 'expired');

  if (loading || !user) {
    return (
      <Layout>
        <LoadingSpinner />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Campaigns</h1>
          <p className="text-grey-400">Manage your cross-promotion campaigns</p>
        </div>

        {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

        {campaigns.length === 0 ? (
          <div className="bg-darkBlue-800 border border-grey-700 rounded-lg p-12 text-center">
            <Zap className="w-16 h-16 text-grey-600 mx-auto mb-4" />
            <p className="text-grey-400 text-lg mb-2">No campaigns yet</p>
            <p className="text-grey-500 text-sm">
              Accept a cross-promo request to start your first campaign
            </p>
          </div>
        ) : (
          <>
            {pendingCampaigns.length > 0 && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <Clock className="text-yellow-400" />
                  Pending ({pendingCampaigns.length})
                </h2>
                <div className="grid gap-4">
                  {pendingCampaigns.map(campaign => (
                    <CampaignCard key={campaign.id} campaign={campaign} />
                  ))}
                </div>
              </div>
            )}

            {activeCampaigns.length > 0 && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <Zap className="text-green-400" />
                  Active ({activeCampaigns.length})
                </h2>
                <div className="grid gap-4">
                  {activeCampaigns.map(campaign => (
                    <CampaignCard key={campaign.id} campaign={campaign} />
                  ))}
                </div>
              </div>
            )}

            {completedCampaigns.length > 0 && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <CheckCircle className="text-grey-400" />
                  Completed ({completedCampaigns.length})
                </h2>
                <div className="grid gap-4">
                  {completedCampaigns.map(campaign => (
                    <CampaignCard key={campaign.id} campaign={campaign} />
                  ))}
                </div>
              </div>
            )}

            {expiredCampaigns.length > 0 && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <AlertCircle className="text-red-400" />
                  Expired ({expiredCampaigns.length})
                </h2>
                <div className="grid gap-4">
                  {expiredCampaigns.map(campaign => (
                    <CampaignCard key={campaign.id} campaign={campaign} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {selectedCampaign && <CampaignDetailModal campaign={selectedCampaign} />}
      </div>
    </Layout>
  );
}