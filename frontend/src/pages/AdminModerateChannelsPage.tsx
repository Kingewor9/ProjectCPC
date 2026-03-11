import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';
import ChannelAvatar from '../components/ChannelAvatar';
import { useAuth } from '../hooks/useAuth';
import apiService from '../services/api';
import { CheckCircle, XCircle, Eye, Search, Filter, Calendar, Users, TrendingUp } from 'lucide-react';

// Helper functions to safely handle potentially undefined/null values
const safeArray = <T,>(value: any): T[] => {
  return Array.isArray(value) ? value : [];
};

const safeNumber = (value: any): number => {
  const num = Number(value);
  return isNaN(num) ? 0 : num;
};

const safeString = (value: any): string => {
  return value ? String(value) : '';
};

const safeObject = (value: any): { [key: string]: any } => {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
};

interface Channel {
  id: string;
  name: string;
  username: string;
  telegram_id: string;
  avatar: string;
  subscribers: number;
  avgViews24h: number;
  language: string;
  topic: string;
  acceptedDays: string[];
  promosPerDay: number;
  durationPrices: { [key: string]: number };
  availableTimeSlots: string[];
  promoMaterials: Array<{
    id: string;
    name: string;
    text: string;
    image: string;
    link: string;
    cta: string;
  }>;
  owner_id: string;
  status: string;
  xExchanges: number;
  created_at: string;
  updated_at: string;
}

interface Owner {
  telegram_id: string;
  first_name: string;
  last_name: string;
  username: string;
}

export default function AdminModerateChannelsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [channels, setChannels] = useState<Channel[]>([]);
  const [owners, setOwners] = useState<{ [key: string]: Owner }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'paused'>('pending');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal state
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [reason, setReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    fetchChannels();
  }, [user, navigate]);

  const fetchChannels = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getAllChannels();
      
      // Validate and normalize channel data
      const validatedChannels = safeArray<Channel>(data?.channels).map(channel => ({
        ...channel,
        name: safeString(channel.name),
        username: safeString(channel.username),
        telegram_id: safeString(channel.telegram_id),
        avatar: safeString(channel.avatar),
        subscribers: safeNumber(channel.subscribers),
        avgViews24h: safeNumber(channel.avgViews24h),
        language: safeString(channel.language),
        topic: safeString(channel.topic),
        acceptedDays: safeArray<string>(channel.acceptedDays),
        promosPerDay: safeNumber(channel.promosPerDay),
        durationPrices: safeObject(channel.durationPrices),
        availableTimeSlots: safeArray<string>(channel.availableTimeSlots),
        promoMaterials: safeArray<Channel['promoMaterials'][0]>(channel.promoMaterials),
        owner_id: safeString(channel.owner_id),
        status: safeString(channel.status) || 'pending',
        xExchanges: safeNumber(channel.xExchanges),
        created_at: safeString(channel.created_at),
        updated_at: safeString(channel.updated_at)
      }));
      
      setChannels(validatedChannels);
      setOwners(safeObject(data?.owners));
    } catch (err: any) {
      console.error('Error fetching channels:', err);
      setError(err.message || 'Failed to load channels');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (channel: Channel, action: 'approve' | 'reject') => {
    setSelectedChannel(channel);
    setActionType(action);
    setShowModal(true);
    setReason('');
  };

  const confirmAction = async () => {
    if (!selectedChannel || !actionType) return;

    setProcessing(true);
    setError(null);

    try {
      await apiService.moderateChannel(selectedChannel.id, actionType, reason);
      
      // Update local state
      setChannels(prev =>
        prev.map(ch =>
          ch.id === selectedChannel.id
            ? { ...ch, status: actionType === 'approve' ? 'approved' : 'rejected' }
            : ch
        )
      );

      setSuccess(`Channel ${actionType === 'approve' ? 'approved' : 'rejected'} successfully!`);
      setShowModal(false);
      setSelectedChannel(null);
      setActionType(null);
      setReason('');
    } catch (err: any) {
      setError(err.message || 'Failed to moderate channel');
    } finally {
      setProcessing(false);
    }
  };

  const filteredChannels = channels.filter(channel => {
    try {
      // Status filter
      if (statusFilter !== 'all' && channel.status !== statusFilter) {
        return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const owner = owners[channel.owner_id];
        return (
          safeString(channel.name).toLowerCase().includes(query) ||
          safeString(channel.username).toLowerCase().includes(query) ||
          safeString(channel.topic).toLowerCase().includes(query) ||
          safeString(owner?.first_name).toLowerCase().includes(query) ||
          safeString(owner?.username).toLowerCase().includes(query)
        );
      }

      return true;
    } catch (err) {
      console.error('Error filtering channel:', err);
      return false;
    }
  });

  const stats = {
    pending: channels.filter(ch => ch.status === 'pending').length,
    approved: channels.filter(ch => ch.status === 'approved').length,
    rejected: channels.filter(ch => ch.status === 'rejected').length,
    total: channels.length
  };

  if (loading) {
    return (
      <Layout>
        <LoadingSpinner />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 pb-32 animate-fade-in-up">
        {/* Header */}
        <div className="mb-10 sm:mb-12">
          <h1 className="text-4xl sm:text-5xl font-heading font-extrabold text-white mb-3 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">Channel Moderation</h1>
          <p className="text-contentMuted text-lg font-sans">Review and approve channel submissions</p>
        </div>

        {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}
        
        {success && (
          <div className="mb-8 bg-neon-emerald/10 border border-neon-emerald/30 rounded-xl p-5 shadow-[0_0_15px_rgba(0,255,157,0.1)] flex items-start gap-3">
            <CheckCircle className="text-neon-emerald flex-shrink-0 mt-0.5" size={24} />
            <p className="text-neon-emerald font-bold tracking-wide">{success}</p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <div className="glass-panel p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-500/5 rounded-full blur-xl -translate-y-1/2 translate-x-1/2 group-hover:bg-yellow-500/10 transition-colors pointer-events-none"></div>
            <div className="flex items-center justify-between relative z-10">
              <div>
                <p className="text-contentMuted text-xs font-bold tracking-widest uppercase mb-2">Pending</p>
                <p className="text-4xl font-mono font-bold text-yellow-500 drop-shadow-[0_0_10px_rgba(234,179,8,0.3)]">{stats.pending}</p>
              </div>
              <div className="w-14 h-14 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl flex items-center justify-center shadow-[0_0_10px_rgba(234,179,8,0.1)] group-hover:scale-110 transition-transform">
                <Calendar className="text-yellow-500" size={28} />
              </div>
            </div>
          </div>

          <div className="glass-panel p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-neon-emerald/5 rounded-full blur-xl -translate-y-1/2 translate-x-1/2 group-hover:bg-neon-emerald/10 transition-colors pointer-events-none"></div>
            <div className="flex items-center justify-between relative z-10">
              <div>
                <p className="text-contentMuted text-xs font-bold tracking-widest uppercase mb-2">Approved</p>
                <p className="text-4xl font-mono font-bold text-neon-emerald drop-shadow-[0_0_10px_rgba(0,255,157,0.3)]">{stats.approved}</p>
              </div>
              <div className="w-14 h-14 bg-neon-emerald/10 border border-neon-emerald/30 rounded-2xl flex items-center justify-center shadow-[0_0_10px_rgba(0,255,157,0.1)] group-hover:scale-110 transition-transform">
                <CheckCircle className="text-neon-emerald" size={28} />
              </div>
            </div>
          </div>

          <div className="glass-panel p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-red-400/5 rounded-full blur-xl -translate-y-1/2 translate-x-1/2 group-hover:bg-red-400/10 transition-colors pointer-events-none"></div>
            <div className="flex items-center justify-between relative z-10">
              <div>
                <p className="text-contentMuted text-xs font-bold tracking-widest uppercase mb-2">Rejected</p>
                <p className="text-4xl font-mono font-bold text-red-400 drop-shadow-[0_0_10px_rgba(248,113,113,0.3)]">{stats.rejected}</p>
              </div>
              <div className="w-14 h-14 bg-red-400/10 border border-red-400/30 rounded-2xl flex items-center justify-center shadow-[0_0_10px_rgba(248,113,113,0.1)] group-hover:scale-110 transition-transform">
                <XCircle className="text-red-400" size={28} />
              </div>
            </div>
          </div>

          <div className="glass-panel p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-neon-cyan/5 rounded-full blur-xl -translate-y-1/2 translate-x-1/2 group-hover:bg-neon-cyan/10 transition-colors pointer-events-none"></div>
            <div className="flex items-center justify-between relative z-10">
              <div>
                <p className="text-contentMuted text-xs font-bold tracking-widest uppercase mb-2">Total</p>
                <p className="text-4xl font-mono font-bold text-neon-cyan drop-shadow-[0_0_10px_rgba(0,240,255,0.3)]">{stats.total}</p>
              </div>
              <div className="w-14 h-14 bg-neon-cyan/10 border border-neon-cyan/30 rounded-2xl flex items-center justify-center shadow-[0_0_10px_rgba(0,240,255,0.1)] group-hover:scale-110 transition-transform">
                <TrendingUp className="text-neon-cyan" size={28} />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="glass-panel p-6 mb-8 border-neon-violet/20 bg-gradient-to-r from-surface to-surface/50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-contentMuted group-focus-within:text-neon-cyan transition-colors" size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search channels, owners, topics..."
                className="input-glass w-full pl-12 py-3.5 focus:shadow-[0_0_15px_rgba(0,240,255,0.1)] font-sans"
              />
            </div>

            {/* Status Filter */}
            <div className="relative group">
              <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 text-contentMuted group-focus-within:text-neon-violet transition-colors pointer-events-none" size={20} />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="input-glass w-full pl-12 py-3.5 appearance-none cursor-pointer focus:border-neon-violet focus:shadow-[0_0_15px_rgba(138,43,226,0.1)] font-sans"
              >
                <option value="all" className="bg-charcoal text-white">All Channels</option>
                <option value="pending" className="bg-charcoal text-white">Pending Only</option>
                <option value="approved" className="bg-charcoal text-white">Approved Only</option>
                <option value="rejected" className="bg-charcoal text-white">Rejected Only</option>
                <option value="paused" className="bg-charcoal text-white">Paused Only</option>
              </select>
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <svg className="fill-current h-4 w-4 text-contentMuted group-focus-within:text-neon-violet transition-colors" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>
            </div>
          </div>
        </div>

        {/* Channels List */}
        <div className="space-y-6">
          {filteredChannels.length === 0 ? (
            <div className="glass-panel p-16 text-center border-dashed border-2 flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-surface border border-surfaceBorder flex items-center justify-center mb-4">
                <Search className="text-contentMuted" size={24} />
              </div>
              <p className="text-white font-heading font-bold text-xl mb-2">No channels found</p>
              <p className="text-contentMuted font-sans">Try modifying your search or filters.</p>
            </div>
          ) : (
            filteredChannels.map((channel) => {
              const owner = owners[channel.owner_id];
              const acceptedDays = safeArray(channel.acceptedDays);
              const timeSlots = safeArray(channel.availableTimeSlots);
              const promoMaterials = safeArray(channel.promoMaterials);
              
              return (
                <div
                  key={channel.id}
                  className="glass-panel p-6 sm:p-8 hover:border-neon-cyan/50 hover:shadow-[0_0_20px_rgba(0,240,255,0.05)] transition-all group relative overflow-hidden"
                >
                  <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-transparent via-surfaceBorder to-transparent group-hover:via-neon-cyan transition-colors"></div>
                  
                  <div className="flex flex-col xl:flex-row gap-8 items-start">
                    {/* Channel Avatar & Primary Info */}
                    <div className="flex items-start gap-6 w-full xl:w-1/3 min-w-0">
                      <div className="relative shrink-0">
                        <ChannelAvatar
                          src={channel.avatar || ''}
                          alt={channel.name || 'Channel'}
                          className="w-24 h-24 ring-4 ring-surface shadow-[0_0_15px_rgba(0,0,0,0.5)] group-hover:ring-neon-cyan/20 transition-all rounded-full"
                          channelName={channel.name || 'Unknown'}
                        />
                        <div className={`absolute -bottom-2 -right-2 w-8 h-8 rounded-full border-2 border-charcoal flex items-center justify-center shadow-lg ${
                            channel.status === 'approved' ? 'bg-neon-emerald text-charcoal' :
                            channel.status === 'pending' ? 'bg-yellow-500 text-charcoal' :
                            channel.status === 'paused' ? 'bg-blue-400 text-charcoal' :
                            'bg-red-500 text-white'
                          }`}
                          title={`Status: ${channel.status}`}
                        >
                          {channel.status === 'approved' && <CheckCircle size={14} className="stroke-[3px]" />}
                          {channel.status === 'pending' && <Calendar size={14} className="stroke-[3px]" />}
                          {channel.status === 'rejected' && <XCircle size={14} className="stroke-[3px]" />}
                          {channel.status === 'paused' && <TrendingUp size={14} className="stroke-[3px]" />}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="text-2xl font-bold font-heading text-white truncate drop-shadow-[0_0_8px_rgba(255,255,255,0.1)] mb-1" title={channel.name}>{channel.name || 'Unknown Channel'}</h3>
                        <p className="text-contentMuted font-mono text-sm mb-2 truncate">@{channel.username || 'N/A'}</p>
                        <div className="inline-flex mt-1">
                          <span className="bg-surface border border-surfaceBorder px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase text-neon-cyan">
                            {channel.topic || 'N/A'}
                          </span>
                        </div>
                        
                        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
                          <div className="flex items-center gap-2">
                             <span className="text-contentMuted text-[10px] font-bold tracking-widest uppercase">Subscribers</span>
                             <span className="text-white font-mono font-bold text-sm">{safeNumber(channel.subscribers).toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-2">
                             <span className="text-contentMuted text-[10px] font-bold tracking-widest uppercase">Language</span>
                             <span className="text-white font-mono font-bold text-sm">{channel.language || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Secondary Metrics */}
                    <div className="w-full xl:w-auto xl:flex-1 grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-2 gap-4">
                      <div className="bg-surface/50 border border-surfaceBorder rounded-xl p-4 flex flex-col justify-center">
                        <p className="text-contentMuted text-xs font-bold tracking-widest uppercase mb-1">24h Views</p>
                        <p className="text-white font-mono font-bold text-xl">{safeNumber(channel.avgViews24h).toLocaleString()}</p>
                      </div>
                      <div className="bg-surface/50 border border-surfaceBorder rounded-xl p-4 flex flex-col justify-center">
                        <p className="text-contentMuted text-xs font-bold tracking-widest uppercase mb-1">Promos/Day</p>
                        <p className="text-white font-mono font-bold text-xl">{safeNumber(channel.promosPerDay)}</p>
                      </div>
                      {/* Condensed Quick Info */}
                      <div className="bg-surface/50 border border-surfaceBorder rounded-xl p-4 flex flex-col justify-center">
                        <p className="text-contentMuted text-xs font-bold tracking-widest uppercase mb-1">Settings</p>
                        <div className="flex items-center gap-3">
                           <span className="text-neon-cyan font-mono font-bold text-sm flex items-center gap-1" title="Accepted Days"><Calendar size={14}/> {acceptedDays.length}</span>
                           <span className="text-neon-violet font-mono font-bold text-sm flex items-center gap-1" title="Time Slots"><Users size={14}/> {timeSlots.length}</span>
                        </div>
                      </div>
                      <div className="bg-surface/50 border border-surfaceBorder rounded-xl p-4 flex flex-col justify-center">
                        <p className="text-contentMuted text-xs font-bold tracking-widest uppercase mb-1">Materials</p>
                        <p className="text-neon-emerald font-mono font-bold text-xl flex items-center gap-2">
                           <TrendingUp size={20}/> {promoMaterials.length}
                        </p>
                      </div>
                    </div>

                    {/* Owner & Actions */}
                    <div className="w-full xl:w-1/4 flex flex-col gap-4">
                      {owner && (
                        <div className="bg-charcoal/50 border border-surfaceBorder rounded-xl p-4">
                          <p className="text-contentMuted text-[10px] font-bold tracking-widest uppercase mb-2">Owner Identity</p>
                          <div className="flex flex-col">
                            <p className="text-white font-bold text-sm truncate">
                              {safeString(owner.first_name)} {safeString(owner.last_name)}
                            </p>
                            {owner.username && (
                              <p className="text-contentMuted text-xs font-mono truncate mt-0.5">@{owner.username}</p>
                            )}
                            <p className="text-surfaceBorder/60 text-[10px] font-mono mt-1">ID: {owner.telegram_id || 'N/A'}</p>
                          </div>
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row xl:flex-col gap-2 mt-auto">
                        <button
                          onClick={() => setSelectedChannel(channel)}
                          className="flex-1 btn-secondary py-2.5 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 group/btn"
                        >
                          <Eye size={16} className="text-contentMuted group-hover/btn:text-white" />
                          VIEW DETAILS
                        </button>

                        {channel.status === 'pending' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAction(channel, 'approve')}
                              className="flex-1 bg-neon-emerald/10 hover:bg-neon-emerald/20 border border-neon-emerald/30 hover:border-neon-emerald text-neon-emerald font-bold py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 text-sm"
                            >
                              <CheckCircle size={16} />
                              APPROVE
                            </button>
                            <button
                              onClick={() => handleAction(channel, 'reject')}
                              className="flex-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500 text-red-500 font-bold py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 text-sm"
                            >
                              <XCircle size={16} />
                              REJECT
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Action Modal */}
        {showModal && selectedChannel && actionType && (
          <div className="fixed inset-0 bg-obsidian/90 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="glass-panel p-6 sm:p-8 max-w-md w-full relative overflow-hidden shadow-2xl scale-in-center">
              <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none ${
                actionType === 'approve' ? 'bg-neon-emerald/10' : 'bg-red-500/10'
              }`}></div>
              
              <h3 className="text-2xl font-heading font-extrabold text-white mb-2 flex items-center gap-3 relative z-10">
                {actionType === 'approve' ? (
                  <CheckCircle className="text-neon-emerald" size={28} />
                ) : (
                  <XCircle className="text-red-500" size={28} />
                )}
                {actionType === 'approve' ? 'Approve' : 'Reject'} Channel
              </h3>
              
              <p className="text-contentMuted mb-6 relative z-10 font-sans">
                Are you sure you want to {actionType} <span className="text-white font-bold">"{selectedChannel.name}"</span>?
              </p>

              <div className="mb-6 relative z-10">
                <label className="block text-xs font-bold tracking-widest uppercase text-contentMuted mb-3 ml-1">
                  Reason <span className="normal-case opacity-50">(Optional)</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={`Add a ${actionType === 'approve' ? 'note' : 'reason for rejection'}...`}
                  rows={3}
                  className="input-glass w-full resize-none bg-surface/50"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-3 relative z-10">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedChannel(null);
                    setActionType(null);
                    setReason('');
                  }}
                  disabled={processing}
                  className="w-full sm:w-1/2 bg-surface hover:bg-surface/80 border border-surfaceBorder hover:border-contentMuted text-white font-bold py-3.5 rounded-xl transition-all disabled:opacity-50"
                >
                  CANCEL
                </button>
                <button
                  onClick={confirmAction}
                  disabled={processing}
                  className={`w-full sm:w-1/2 ${
                    actionType === 'approve'
                      ? 'bg-neon-emerald/20 hover:bg-neon-emerald text-neon-emerald hover:text-charcoal border border-neon-emerald'
                      : 'bg-red-500/20 hover:bg-red-500 text-red-500 hover:text-white border border-red-500'
                  } font-extrabold py-3.5 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2`}
                >
                  {processing ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current" />
                  ) : (
                     actionType === 'approve' ? 'CONFIRM APPROVE' : 'CONFIRM REJECT'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Details Modal */}
        {selectedChannel && !showModal && (
          <div className="fixed inset-0 bg-obsidian/90 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto w-full animate-in fade-in duration-200">
            <div className="glass-panel p-6 sm:p-8 max-w-4xl w-full my-8 relative overflow-hidden shadow-2xl border-neon-cyan/20">
              <div className="absolute top-0 right-0 w-64 h-64 bg-neon-cyan/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>

              <div className="flex items-center justify-between mb-8 pb-4 border-b border-surfaceBorder relative z-10">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-neon-cyan/10 rounded-xl border border-neon-cyan/20">
                    <Eye className="text-neon-cyan" size={24} />
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-heading font-extrabold text-white">Channel Details</h3>
                </div>
                <button
                  onClick={() => setSelectedChannel(null)}
                  className="text-contentMuted hover:text-white bg-surface hover:bg-surfaceBorder p-2 rounded-full transition-colors"
                >
                  <XCircle size={28} />
                </button>
              </div>

              <div className="space-y-8 relative z-10">
                {/* Basic Info */}
                <div>
                  <h4 className="text-white font-heading font-bold mb-4 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-neon-cyan rounded-full"></span>
                    Primary Information
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-surface/30 p-5 rounded-2xl border border-surfaceBorder">
                    <div>
                      <p className="text-contentMuted text-[10px] sm:text-xs font-bold tracking-widest uppercase mb-1">Channel Name</p>
                      <p className="text-white font-bold text-sm sm:text-base">{selectedChannel.name}</p>
                    </div>
                    <div>
                      <p className="text-contentMuted text-[10px] sm:text-xs font-bold tracking-widest uppercase mb-1">Username</p>
                      <p className="text-neon-cyan font-mono font-bold text-sm sm:text-base">@{selectedChannel.username}</p>
                    </div>
                    <div>
                      <p className="text-contentMuted text-[10px] sm:text-xs font-bold tracking-widest uppercase mb-1">Topic</p>
                      <p className="text-white font-bold text-sm sm:text-base">{selectedChannel.topic}</p>
                    </div>
                    <div>
                      <p className="text-contentMuted text-[10px] sm:text-xs font-bold tracking-widest uppercase mb-1">Language</p>
                      <p className="text-white font-bold text-sm sm:text-base">{selectedChannel.language}</p>
                    </div>
                    <div>
                      <p className="text-contentMuted text-[10px] sm:text-xs font-bold tracking-widest uppercase mb-1">Subscribers</p>
                      <p className="text-white font-mono font-bold text-sm sm:text-base">{selectedChannel.subscribers.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-contentMuted text-[10px] sm:text-xs font-bold tracking-widest uppercase mb-1">Current Status</p>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-widest ${
                        selectedChannel.status === 'approved' ? 'bg-neon-emerald/20 text-neon-emerald border border-neon-emerald/30' :
                        selectedChannel.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30' :
                        selectedChannel.status === 'paused' ? 'bg-blue-400/20 text-blue-400 border border-blue-400/30' :
                        'bg-red-500/20 text-red-500 border border-red-500/30'
                      }`}>
                        {selectedChannel.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Prices */}
                  {selectedChannel.durationPrices && Object.keys(selectedChannel.durationPrices).length > 0 && (
                    <div>
                      <h4 className="text-white font-heading font-bold mb-4 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-neon-emerald rounded-full"></span>
                        Placement Pricing
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {Object.entries(selectedChannel.durationPrices).map(([hours, price]) => (
                          <div key={hours} className="bg-surface/50 p-4 rounded-xl border border-surfaceBorder/50 flex flex-col items-center justify-center text-center">
                            <p className="text-contentMuted text-xs font-bold tracking-widest uppercase mb-1">{hours} hours</p>
                            <p className="text-neon-emerald font-mono font-bold text-lg">{price} CP</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-8">
                    {/* Days */}
                    {safeArray<string>(selectedChannel?.acceptedDays).length > 0 && (
                      <div>
                        <h4 className="text-white font-heading font-bold mb-4 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                          Accepted Days
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {safeArray<string>(selectedChannel.acceptedDays).map(day => (
                            <span key={day} className="bg-surface border border-surfaceBorder text-contentMuted px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest">
                              {day.slice(0, 3)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Time Slots */}
                    {safeArray(selectedChannel?.availableTimeSlots).length > 0 && (
                      <div>
                        <h4 className="text-white font-heading font-bold mb-4 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-neon-violet rounded-full"></span>
                          Time Slots
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {safeArray(selectedChannel.availableTimeSlots).map((slot, index) => (
                            <span key={index} className="bg-neon-violet/10 border border-neon-violet/20 text-neon-violet px-3 py-1.5 rounded-lg text-xs font-mono font-bold">
                              {safeString(slot)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Promo Materials */}
                {safeArray<Channel['promoMaterials'][0]>(selectedChannel?.promoMaterials).length > 0 && (
                  <div>
                    <h4 className="text-white font-heading font-bold mb-4 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full"></span>
                      Promo Materials <span className="text-contentMuted ml-1 text-sm font-normal">({safeArray<Channel['promoMaterials'][0]>(selectedChannel.promoMaterials).length})</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {safeArray<Channel['promoMaterials'][0]>(selectedChannel.promoMaterials).map((promo, idx) => (
                        <div key={promo.id} className="bg-surface/30 p-5 rounded-2xl border border-surfaceBorder relative">
                          <span className="absolute top-4 right-4 text-[10px] font-bold tracking-widest uppercase text-contentMuted bg-charcoal px-2 py-1 rounded">#{idx + 1}</span>
                          <h5 className="text-white font-bold font-heading mb-3 pr-8">{promo.name}</h5>
                          <div className="bg-charcoal/80 p-3 rounded-xl border border-surfaceBorder mb-4 max-h-32 overflow-y-auto custom-scrollbar">
                             <p className="text-contentMuted text-[13px] leading-relaxed whitespace-pre-wrap font-sans">{promo.text}</p>
                          </div>
                          
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-3 text-sm">
                              <span className="text-contentMuted text-[10px] font-bold tracking-widest uppercase shrink-0">Button CTA</span>
                              <span className="text-white font-bold bg-surface px-2.5 py-1 rounded border border-surfaceBorder truncate">{promo.cta}</span>
                            </div>
                            {promo.link && (
                              <div className="flex items-center gap-3 text-sm">
                                <span className="text-contentMuted text-[10px] font-bold tracking-widest uppercase shrink-0">Link</span>
                                <a
                                  href={promo.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-neon-cyan hover:text-white font-mono truncate hover:underline hover:underline-offset-4 transition-colors"
                                >
                                  {promo.link}
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {selectedChannel.status === 'pending' && (
                <div className="flex flex-col sm:flex-row gap-4 mt-10 pt-8 border-t border-surfaceBorder relative z-10 w-full">
                  <button
                    onClick={() => {
                      handleAction(selectedChannel, 'approve');
                    }}
                    className="flex-1 bg-neon-emerald/10 hover:bg-neon-emerald/20 border-2 border-neon-emerald/30 hover:border-neon-emerald text-neon-emerald font-extrabold py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-2 group tracking-widest shadow-[0_0_15px_rgba(0,255,157,0.1)] hover:shadow-[0_0_20px_rgba(0,255,157,0.3)]"
                  >
                    <CheckCircle size={20} className="group-hover:scale-110 transition-transform" />
                    APPROVE CHANNEL
                  </button>
                  <button
                    onClick={() => {
                      handleAction(selectedChannel, 'reject');
                    }}
                    className="flex-1 bg-red-500/10 hover:bg-red-500/20 border-2 border-red-500/30 hover:border-red-500 text-red-500 font-extrabold py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-2 group tracking-widest shadow-[0_0_15px_rgba(239,68,68,0.1)] hover:shadow-[0_0_20px_rgba(239,68,68,0.3)]"
                  >
                    <XCircle size={20} className="group-hover:scale-110 transition-transform" />
                    REJECT CHANNEL
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}