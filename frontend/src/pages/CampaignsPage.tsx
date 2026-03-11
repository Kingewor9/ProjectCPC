import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';
import PromoImage from '../components/PromoImage';
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
  posting_deadline?: string;
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
    if (selectedCampaign) return;

    const calculateDeadlines = () => {
      const newDeadlines: {[key: string]: number} = {};
      
      campaigns.forEach(campaign => {
        if (campaign.status === 'pending_posting' && campaign.posting_deadline) {
          const deadline = new Date(campaign.posting_deadline).getTime();
          const now = Date.now();
          const remaining = Math.max(0, deadline - now);
          newDeadlines[campaign.id] = remaining;
          
          // ADDED: If deadline reached, trigger refresh to get updated status
          if (remaining === 0 && !campaign.status.includes('expired')) {
            // Debounce the refresh to avoid too many calls
            setTimeout(() => fetchCampaigns(), 1000);
          }
        }
      });
      
      setDeadlineTimeLeft(newDeadlines);
    };

    calculateDeadlines();
    const timer = setInterval(calculateDeadlines, 1000);
    return () => clearInterval(timer);
  }, [campaigns, selectedCampaign]);

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
    const totalSeconds = Math.ceil(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  const formatDeadline = (ms: number) => {
    const totalSeconds = Math.ceil(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m left to post`;
    } else if (minutes > 0) {
      return `${minutes}m left to post`;
    } else {
      return 'Expired';
    }
  };

  const getStatusBadge = (status: Campaign['status']) => {
    const configs = {
      pending_posting: { bg: 'bg-yellow-500/10 border border-yellow-500/30', text: 'text-yellow-400', icon: Clock, label: 'Pending' },
      active: { bg: 'bg-neon-emerald/10 border border-neon-emerald/30', text: 'text-neon-emerald', icon: Zap, label: 'Active' },
      completed: { bg: 'bg-surface border border-surfaceBorder', text: 'text-contentMuted', icon: CheckCircle, label: 'Completed' },
      expired: { bg: 'bg-red-500/10 border border-red-500/30', text: 'text-red-400', icon: AlertCircle, label: 'Expired' }
    };
    const config = configs[status];
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wide ${config.bg} ${config.text}`}>
        <Icon size={14} />
        {config.label}
      </span>
    );
  };

  const CampaignCard = ({ campaign }: { campaign: Campaign }) => (
    <div 
      onClick={() => setSelectedCampaign(campaign)}
      className="glass-panel p-6 group hover:border-neon-cyan/50 hover:shadow-glow-cyan transition-all duration-300 cursor-pointer"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 text-left pr-4">
          <h3 className="text-xl font-heading font-bold text-white mb-1 group-hover:text-neon-cyan transition-colors">{campaign.promo.name}</h3>
          <p className="text-contentMuted text-sm font-sans mb-1">Partner: {campaign.partner_channel_name}</p>
          <p className="text-neon-violet/80 text-xs font-mono tracking-wide font-bold">
            {campaign.user_role === 'requester' ? '👉 YOU REQUESTED' : '✅ YOU ACCEPTED'}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          {getStatusBadge(campaign.status)}
          
          {campaign.status === 'pending_posting' && campaign.posting_deadline && deadlineTimeLeft[campaign.id] !== undefined && deadlineTimeLeft[campaign.id] > 0 && (
            <div className="text-xs text-yellow-400 font-mono font-bold bg-yellow-500/10 border border-yellow-500/30 px-2 py-1 rounded-md">
              ⏰ {formatDeadline(deadlineTimeLeft[campaign.id])}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2 text-sm font-mono mt-5 pt-4 border-t border-surfaceBorder">
        <div className="flex items-center gap-2 text-contentMuted">
          <Clock size={16} />
          <span>Duration: {campaign.duration_hours}h</span>
        </div>
        {campaign.status === 'active' && campaign.actual_start_at && (
          <div className="flex items-center gap-2 text-neon-emerald font-bold">
            <Zap size={16} className="animate-pulse" />
            <span>Running for {Math.floor((Date.now() - new Date(campaign.actual_start_at).getTime()) / (1000 * 60 * 60))}h</span>
          </div>
        )}
        {campaign.status === 'expired' && (
          <div className="flex items-center gap-2 text-red-500 font-bold">
            <AlertCircle size={16} />
            <span>Failed to post within 48 hours</span>
          </div>
        )}
      </div>
    </div>
  );

  const CampaignDetailModal = ({ campaign }: { campaign: Campaign }) => (
    <div className="fixed inset-0 bg-obsidian/90 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="glass-panel max-w-2xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar animate-fade-in-up border-neon-cyan/30 shadow-[0_0_30px_rgba(0,240,255,0.1)]">
        <div className="p-8">
          <div className="flex items-start justify-between mb-8">
            <div>
              <h2 className="text-3xl font-heading font-bold text-white mb-2">{campaign.promo.name}</h2>
              <p className="text-contentMuted font-sans">Partner: {campaign.partner_channel_name}</p>
              <p className="text-neon-violet/80 text-sm mt-3 font-mono font-bold tracking-wide">
                {campaign.user_role === 'requester' ? '👉 YOU REQUESTED THIS' : '✅ YOU ACCEPTED THIS'}
              </p>
            </div>
            <button 
              onClick={() => setSelectedCampaign(null)}
              className="w-10 h-10 rounded-full bg-surface border border-surfaceBorder flex items-center justify-center text-contentMuted hover:text-white hover:border-white transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="mb-8">
            {getStatusBadge(campaign.status)}
          </div>

          <div className="space-y-8">
            {/* Promo Preview */}
            <div className="bg-charcoal border border-surfaceBorder rounded-xl p-6">
              <h3 className="text-white font-heading font-bold mb-4 text-lg">Promo to Post</h3>
              
              <PromoImage 
                src={campaign.promo.image} 
                alt={campaign.promo.name}
              />
              
              <p className="text-contentMuted text-sm mb-4 leading-relaxed mt-4">{campaign.promo.text}</p>
              {campaign.promo.link && (
                <a 
                  href={campaign.promo.link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-neon-cyan/80 hover:text-neon-cyan text-sm font-bold tracking-wide transition-colors"
                >
                  <ExternalLink size={16} />
                  {campaign.promo.link}
                </a>
              )}
            </div>

            {/* Actions based on status */}
            {campaign.status === 'pending_posting' && (
              <div className="space-y-6">
                <button
                  onClick={() => handleSendToTelegram(campaign)}
                  disabled={actionLoading}
                  className="w-full bg-neon-cyan/20 border border-neon-cyan/50 hover:bg-neon-cyan hover:text-charcoal text-neon-cyan py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-3 font-mono tracking-wide disabled:opacity-50"
                >
                  <Send size={20} />
                  GET PROMO IN TELEGRAM
                </button>
                
                <div className="bg-charcoal border border-surfaceBorder rounded-xl p-6">
                  <h4 className="text-white font-bold mb-4 font-heading flex items-center gap-2">
                    <Zap className="text-neon-violet" size={18} />
                    Next Steps
                  </h4>
                  <ol className="text-contentMuted text-sm space-y-4 font-sans list-none">
                    <li className="flex gap-3"><span className="text-neon-violet font-mono font-bold">1</span> Click "Get Promo in Telegram"</li>
                    <li className="flex gap-3"><span className="text-neon-violet font-mono font-bold">2</span> Forward the message to your channel</li>
                    <li className="flex gap-3"><span className="text-neon-violet font-mono font-bold">3</span> Copy the post link from your channel</li>
                    <li className="flex gap-3"><span className="text-neon-violet font-mono font-bold">4</span> Submit the link below to start your timer</li>
                  </ol>
                </div>

                <div className="space-y-3">
                  <label className="text-contentMuted text-xs font-bold tracking-widest uppercase ml-1">Post Link (after you've posted)</label>
                  <input
                    type="url"
                    value={postLink}
                    onChange={(e) => setPostLink(e.target.value)}
                    placeholder="https://t.me/yourchannel/123"
                    className="input-glass w-full"
                  />
                  <button
                    onClick={handleVerifyAndStart}
                    disabled={!postLink.trim() || actionLoading}
                    className="w-full bg-neon-emerald/20 border border-neon-emerald/50 hover:bg-neon-emerald hover:text-charcoal text-neon-emerald py-4 rounded-xl font-bold transition-all mt-4 disabled:opacity-50 disabled:cursor-not-allowed font-mono tracking-wide"
                  >
                    ✓ START MY CAMPAIGN
                  </button>
                </div>
              </div>
            )}

            {campaign.status === 'active' && (
              <div className="space-y-8">
                <div className="bg-neon-emerald/10 border border-neon-emerald/30 shadow-[0_0_20px_rgba(0,255,157,0.15)] rounded-2xl p-10 text-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-neon-emerald/5 mix-blend-overlay animate-pulse-glow"></div>
                  <Zap className="w-16 h-16 text-neon-emerald mx-auto mb-6 drop-shadow-[0_0_10px_rgba(0,255,157,0.8)]" />
                  <h4 className="text-white text-2xl font-heading font-bold mb-4 relative z-10">Campaign Active!</h4>
                  <div className="text-5xl font-mono font-bold neon-text-emerald mb-3 tracking-tight relative z-10">
                    {formatTimeLeft(timeLeft)}
                  </div>
                  <p className="text-contentMuted font-mono text-sm tracking-widest uppercase relative z-10">Time remaining</p>
                </div>

                {campaign.post_verification_link && (
                  <a 
                    href={campaign.post_verification_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 text-neon-cyan/80 hover:text-neon-cyan text-sm font-bold tracking-wide transition-colors mb-6"
                  >
                    <ExternalLink size={16} />
                    View Your Post
                  </a>
                )}

                <button
                  onClick={() => handleEndCampaign(campaign)}
                  disabled={timeLeft > 0 || actionLoading}
                  className={`w-full py-5 rounded-xl font-bold font-mono tracking-wide transition-all flex items-center justify-center gap-3 ${
                    timeLeft > 0
                      ? 'bg-surface border border-surfaceBorder text-contentMuted cursor-not-allowed'
                      : 'bg-red-500/20 border border-red-500/50 hover:bg-red-500 hover:text-white text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)]'
                  }`}
                >
                  <StopCircle size={20} />
                  {timeLeft > 0 ? 'WAIT FOR TIMER TO COMPLETE' : 'END CAMPAIGN & CLAIM REWARD'}
                </button>
              </div>
            )}

            {campaign.status === 'completed' && (
              <div className="bg-surface border border-surfaceBorder rounded-2xl p-8 text-center">
                <CheckCircle className="w-16 h-16 text-contentMuted mx-auto mb-4" />
                <h4 className="text-white font-heading font-bold text-xl mb-2">Campaign Completed</h4>
                <p className="text-contentMuted text-sm">
                  Reward has been added to your balance
                </p>
              </div>
            )}

            {campaign.status === 'expired' && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-8 text-center">
                <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                <h4 className="text-white font-heading font-bold text-xl mb-3">Your Campaign Expired</h4>
                <p className="text-red-400/80 text-sm mb-6">
                  You failed to post the promo within 48 hours
                </p>
                <div className="bg-charcoal border border-surfaceBorder rounded-xl p-4 mb-4">
                  <p className="text-red-400 font-mono font-bold text-sm">
                    Penalty: -250 CP Coins deducted from your balance
                  </p>
                </div>
                <div className="bg-neon-cyan/5 border border-neon-cyan/20 rounded-xl p-4">
                  <p className="text-contentMuted text-sm leading-relaxed text-left">
                    💡 <strong className="text-white">Note:</strong> Your partner's campaign continues normally if they posted on time.
                    Each user's campaign is independent.
                  </p>
                </div>
              </div>
            )}
          </div>
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8 animate-fade-in-up">
        <div className="mb-10 text-center sm:text-left">
          <h1 className="text-4xl md:text-5xl font-heading font-extrabold text-white mb-3 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">Campaigns</h1>
          <p className="text-contentMuted text-lg font-sans">Manage your cross-promotion campaigns</p>
        </div>

        {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

        {campaigns.length === 0 ? (
          <div className="glass-panel p-16 text-center">
            <Zap className="w-20 h-20 text-contentMuted mx-auto mb-6 opacity-50" />
            <p className="text-white font-heading text-2xl font-bold mb-3">No campaigns yet</p>
            <p className="text-contentMuted text-lg">
              Accept a cross-promo request to start your first campaign.
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {pendingCampaigns.length > 0 && (
              <div>
                <h2 className="text-2xl font-heading font-bold text-white mb-6 flex items-center gap-3">
                  <Clock className="text-yellow-400" size={28} />
                  Pending <span className="text-contentMuted font-mono text-lg font-normal mb-1">({pendingCampaigns.length})</span>
                </h2>
                <div className="grid gap-6 md:grid-cols-2">
                  {pendingCampaigns.map(campaign => (
                    <CampaignCard key={campaign.id} campaign={campaign} />
                  ))}
                </div>
              </div>
            )}

            {activeCampaigns.length > 0 && (
              <div>
                <h2 className="text-2xl font-heading font-bold text-white mb-6 flex items-center gap-3">
                  <Zap className="text-neon-emerald" size={28} />
                  Active <span className="text-contentMuted font-mono text-lg font-normal mb-1">({activeCampaigns.length})</span>
                </h2>
                <div className="grid gap-6 md:grid-cols-2">
                  {activeCampaigns.map(campaign => (
                    <CampaignCard key={campaign.id} campaign={campaign} />
                  ))}
                </div>
              </div>
            )}

            {completedCampaigns.length > 0 && (
              <div>
                <h2 className="text-2xl font-heading font-bold text-white mb-6 flex items-center gap-3 opacity-90">
                  <CheckCircle className="text-contentMuted" size={28} />
                  Completed <span className="text-contentMuted font-mono text-lg font-normal mb-1">({completedCampaigns.length})</span>
                </h2>
                <div className="grid gap-6 md:grid-cols-2">
                  {completedCampaigns.map(campaign => (
                    <CampaignCard key={campaign.id} campaign={campaign} />
                  ))}
                </div>
              </div>
            )}

            {expiredCampaigns.length > 0 && (
              <div>
                <h2 className="text-2xl font-heading font-bold text-white mb-6 flex items-center gap-3 opacity-90">
                  <AlertCircle className="text-red-500" size={28} />
                  Expired <span className="text-contentMuted font-mono text-lg font-normal mb-1">({expiredCampaigns.length})</span>
                </h2>
                <div className="grid gap-6 md:grid-cols-2">
                  {expiredCampaigns.map(campaign => (
                    <CampaignCard key={campaign.id} campaign={campaign} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {selectedCampaign && <CampaignDetailModal campaign={selectedCampaign} />}
      </div>
    </Layout>
  );
}