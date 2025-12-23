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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Channel Moderation</h1>
          <p className="text-grey-400">Review and approve channel submissions</p>
        </div>

        {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}
        
        {success && (
          <div className="mb-6 bg-green-600/10 border border-green-600/30 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="text-green-400" size={20} />
              <p className="text-green-400">{success}</p>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-darkBlue-800 border border-grey-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-grey-400 text-sm font-medium">Pending</p>
                <p className="text-3xl font-bold text-yellow-400 mt-2">{stats.pending}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                <Calendar className="text-yellow-400" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-darkBlue-800 border border-grey-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-grey-400 text-sm font-medium">Approved</p>
                <p className="text-3xl font-bold text-green-400 mt-2">{stats.approved}</p>
              </div>
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                <CheckCircle className="text-green-400" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-darkBlue-800 border border-grey-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-grey-400 text-sm font-medium">Rejected</p>
                <p className="text-3xl font-bold text-red-400 mt-2">{stats.rejected}</p>
              </div>
              <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center">
                <XCircle className="text-red-400" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-darkBlue-800 border border-grey-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-grey-400 text-sm font-medium">Total</p>
                <p className="text-3xl font-bold text-white mt-2">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="text-blue-400" size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-darkBlue-800 border border-grey-700 rounded-lg p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-grey-400" size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search channels, owners, topics..."
                className="w-full bg-darkBlue-700 border border-grey-600 rounded-lg pl-10 pr-4 py-3 text-white placeholder-grey-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-grey-400" size={20} />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full bg-darkBlue-700 border border-grey-600 rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Channels</option>
                <option value="pending">Pending Only</option>
                <option value="approved">Approved Only</option>
                <option value="rejected">Rejected Only</option>
                <option value="paused">Paused Only</option>
              </select>
            </div>
          </div>
        </div>

        {/* Channels List */}
        <div className="space-y-6">
          {filteredChannels.length === 0 ? (
            <div className="bg-darkBlue-800 border border-grey-700 rounded-lg p-12 text-center">
              <p className="text-grey-400 text-lg">No channels found</p>
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
                  className="bg-darkBlue-800 border border-grey-700 rounded-lg p-6 hover:border-blue-500 transition-all"
                >
                  <div className="flex items-start gap-6">
                    {/* Channel Avatar */}
                    <ChannelAvatar
                      src={channel.avatar || ''}
                      alt={channel.name || 'Channel'}
                      className="w-24 h-24 flex-shrink-0"
                      channelName={channel.name || 'Unknown'}
                    />

                    {/* Channel Info */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-2xl font-bold text-white">{channel.name || 'Unknown Channel'}</h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              channel.status === 'approved' ? 'bg-green-500/20 text-green-300' :
                              channel.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' :
                              channel.status === 'paused' ? 'bg-blue-500/20 text-blue-300' :
                              'bg-red-500/20 text-red-300'
                            }`}>
                              {(channel.status || 'PENDING').toUpperCase()}
                            </span>
                          </div>
                          <p className="text-grey-400 mb-1">{channel.username || 'N/A'}</p>
                          <p className="text-blue-400 text-sm">Topic: {channel.topic || 'N/A'}</p>
                        </div>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-4 gap-4 mb-4 bg-darkBlue-700 p-4 rounded-lg">
                        <div>
                          <p className="text-grey-400 text-xs mb-1">Subscribers</p>
                          <p className="text-white font-bold text-lg">{safeNumber(channel.subscribers).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-grey-400 text-xs mb-1">Avg 24h Views</p>
                          <p className="text-white font-bold text-lg">{safeNumber(channel.avgViews24h).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-grey-400 text-xs mb-1">Language</p>
                          <p className="text-white font-bold text-lg">{channel.language || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-grey-400 text-xs mb-1">Promos/Day</p>
                          <p className="text-white font-bold text-lg">{safeNumber(channel.promosPerDay)}</p>
                        </div>
                      </div>

                      {/* Owner Info */}
                      {owner && (
                        <div className="bg-darkBlue-700 p-4 rounded-lg mb-4">
                          <p className="text-grey-400 text-xs mb-2">CHANNEL OWNER</p>
                          <div className="flex items-center gap-3">
                            <div>
                              <p className="text-white font-medium">
                                {safeString(owner.first_name)} {safeString(owner.last_name)}
                              </p>
                              {owner.username && (
                                <p className="text-grey-400 text-sm">@{owner.username}</p>
                              )}
                              <p className="text-grey-500 text-xs">ID: {owner.telegram_id || 'N/A'}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Quick Info */}
                      <div className="flex flex-wrap gap-4 text-sm mb-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="text-grey-400" size={16} />
                          <span className="text-grey-400">
                            Days: {acceptedDays.length}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="text-grey-400" size={16} />
                          <span className="text-grey-400">
                            Time Slots: {timeSlots.length}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <TrendingUp className="text-grey-400" size={16} />
                          <span className="text-grey-400">
                            Promos: {promoMaterials.length}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-3">
                        <button
                          onClick={() => setSelectedChannel(channel)}
                          className="flex-1 bg-darkBlue-700 hover:bg-darkBlue-600 border border-grey-600 hover:border-blue-600 text-white font-medium py-2 rounded-lg transition-all flex items-center justify-center gap-2"
                        >
                          <Eye size={18} />
                          View Details
                        </button>

                        {channel.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleAction(channel, 'approve')}
                              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-lg transition-all flex items-center justify-center gap-2"
                            >
                              <CheckCircle size={18} />
                              Approve
                            </button>
                            <button
                              onClick={() => handleAction(channel, 'reject')}
                              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded-lg transition-all flex items-center justify-center gap-2"
                            >
                              <XCircle size={18} />
                              Reject
                            </button>
                          </>
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
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-darkBlue-800 border border-grey-700 rounded-lg p-6 max-w-md w-full">
              <h3 className="text-xl font-bold text-white mb-4">
                {actionType === 'approve' ? 'Approve' : 'Reject'} Channel
              </h3>
              
              <p className="text-grey-400 mb-4">
                Are you sure you want to {actionType} "<span className="text-white">{selectedChannel.name}</span>"?
              </p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-grey-300 mb-2">
                  Reason (Optional)
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={`Add a ${actionType === 'approve' ? 'note' : 'reason for rejection'}...`}
                  rows={3}
                  className="w-full bg-darkBlue-700 border border-grey-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedChannel(null);
                    setActionType(null);
                    setReason('');
                  }}
                  disabled={processing}
                  className="flex-1 bg-grey-700 hover:bg-grey-600 text-white font-bold py-2 rounded-lg transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmAction}
                  disabled={processing}
                  className={`flex-1 ${
                    actionType === 'approve'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  } text-white font-bold py-2 rounded-lg transition-all disabled:opacity-50`}
                >
                  {processing ? 'Processing...' : `Confirm ${actionType === 'approve' ? 'Approval' : 'Rejection'}`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Details Modal */}
        {selectedChannel && !showModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-darkBlue-800 border border-grey-700 rounded-lg p-6 max-w-3xl w-full my-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white">Channel Details</h3>
                <button
                  onClick={() => setSelectedChannel(null)}
                  className="text-grey-400 hover:text-white"
                >
                  <XCircle size={24} />
                </button>
              </div>

              <div className="space-y-6">
                {/* Basic Info - Always Show */}
                <div className="bg-darkBlue-700 p-4 rounded-lg">
                  <h4 className="text-white font-bold mb-3">Channel Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-grey-400 text-xs mb-1">Channel Name</p>
                      <p className="text-white font-bold">{selectedChannel.name}</p>
                    </div>
                    <div>
                      <p className="text-grey-400 text-xs mb-1">Username</p>
                      <p className="text-white font-bold">@{selectedChannel.username}</p>
                    </div>
                    <div>
                      <p className="text-grey-400 text-xs mb-1">Topic</p>
                      <p className="text-white font-bold">{selectedChannel.topic}</p>
                    </div>
                    <div>
                      <p className="text-grey-400 text-xs mb-1">Language</p>
                      <p className="text-white font-bold">{selectedChannel.language}</p>
                    </div>
                    <div>
                      <p className="text-grey-400 text-xs mb-1">Subscribers</p>
                      <p className="text-white font-bold">{selectedChannel.subscribers.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-grey-400 text-xs mb-1">Status</p>
                      <p className="text-white font-bold">{selectedChannel.status.toUpperCase()}</p>
                    </div>
                  </div>
                </div>

                {/* Prices */}
                {selectedChannel.durationPrices && Object.keys(selectedChannel.durationPrices).length > 0 && (
                  <div>
                    <h4 className="text-white font-bold mb-3">Pricing</h4>
                    <div className="grid grid-cols-3 gap-3">
                      {Object.entries(selectedChannel.durationPrices).map(([hours, price]) => (
                        <div key={hours} className="bg-darkBlue-700 p-3 rounded-lg">
                          <p className="text-grey-400 text-sm">{hours} hours</p>
                          <p className="text-white font-bold">{price} CP</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Days */}
                {safeArray<string>(selectedChannel?.acceptedDays).length > 0 && (
                  <div>
                    <h4 className="text-white font-bold mb-3">Accepted Days</h4>
                    <div className="flex flex-wrap gap-2">
                      {safeArray<string>(selectedChannel.acceptedDays).map(day => (
                        <span key={day} className="bg-blue-600/20 text-blue-300 px-3 py-1 rounded-lg text-sm">
                          {day}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Time Slots */}
                {safeArray(selectedChannel?.availableTimeSlots).length > 0 && (
                  <div>
                    <h4 className="text-white font-bold mb-3">Available Time Slots</h4>
                    <div className="flex flex-wrap gap-2">
                      {safeArray(selectedChannel.availableTimeSlots).map((slot, index) => (
                        <span key={index} className="bg-darkBlue-700 text-grey-300 px-3 py-1 rounded-lg text-sm">
                          {safeString(slot)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Promo Materials */}
                {safeArray<Channel['promoMaterials'][0]>(selectedChannel?.promoMaterials).length > 0 && (
                  <div>
                    <h4 className="text-white font-bold mb-3">Promo Materials ({safeArray<Channel['promoMaterials'][0]>(selectedChannel.promoMaterials).length})</h4>
                    <div className="space-y-3">
                      {safeArray<Channel['promoMaterials'][0]>(selectedChannel.promoMaterials).map((promo) => (
                        <div key={promo.id} className="bg-darkBlue-700 p-4 rounded-lg">
                          <h5 className="text-white font-bold mb-2">{promo.name}</h5>
                          <p className="text-grey-300 text-sm mb-2">{promo.text}</p>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-grey-400">CTA:</span>
                            <span className="text-blue-400">{promo.cta}</span>
                          </div>
                          {promo.link && (
                            <a
                              href={promo.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300 text-sm"
                            >
                              {promo.link}
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {selectedChannel.status === 'pending' && (
                <div className="flex gap-3 mt-6 pt-6 border-t border-grey-700">
                  <button
                    onClick={() => {
                      handleAction(selectedChannel, 'approve');
                    }}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={18} />
                    Approve Channel
                  </button>
                  <button
                    onClick={() => {
                      handleAction(selectedChannel, 'reject');
                    }}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
                  >
                    <XCircle size={18} />
                    Reject Channel
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