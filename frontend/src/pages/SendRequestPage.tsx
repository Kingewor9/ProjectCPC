import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';
import ChannelAvatar from '../components/ChannelAvatar';
import { useAuth } from '../hooks/useAuth';
import apiService from '../services/api';
import { Partner, CrossPromoRequest } from '../types';
import { Send, AlertCircle, ExternalLink, Users, Compass } from 'lucide-react';

// Define partner type
type PartnerType = 'existing' | 'discover';

export default function SendRequestPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [allChannels, setAllChannels] = useState<Partner[]>([]);
  const [existingPartners, setExistingPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [partnerType, setPartnerType] = useState<PartnerType | null>(null);
  const [fromChannelId, setFromChannelId] = useState('');
  const [toChannelId, setToChannelId] = useState('');
  const [daySelected, setDaySelected] = useState('Monday');
  const [timeSelected, setTimeSelected] = useState('09:00 - 10:00 UTC');
  const [duration, setDuration] = useState('8');
  const [selectedPromoId, setSelectedPromoId] = useState('');

  const fromChannel = user?.channels.find(c => c.id === fromChannelId);
  const fromChannelTopic = fromChannel?.topic;
  
  // Filter channels by partner type and topic
  const availableChannels = partnerType === 'existing' 
    ? existingPartners 
    : allChannels.filter(ch => ch.topic === fromChannelTopic);
  
  const toPartner = availableChannels.find(p => p.id === toChannelId);
  const selectedPromo = fromChannel?.promos.find(p => p.id === selectedPromoId);
  const cpcCost = toPartner?.durationPrices[duration] || 0;

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    // Check if user has any channels - this will trigger the empty state render below
    if (!user.channels || user.channels.length === 0) {
      setLoading(false);
      return; // Don't fetch data if no channels
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null); // Clear any previous errors
        
        // Fetch all channels (for discover)
        const allData = await apiService.listAllChannels();
        setAllChannels(allData);
        
        // Fetch user's existing partners (channels they've cross-promoted with)
        const partnersData = await apiService.listPartners();
        setExistingPartners(partnersData);
        
        // CHANGED: Select first APPROVED/ACTIVE channel instead of just first channel
        if (user.channels.length > 0) {
          const activeChannel = user.channels.find(
            ch => (ch.status || '').toLowerCase() === 'active' || (ch.status || '').toLowerCase() === 'approved'
          );
          if (activeChannel) {
            setFromChannelId(activeChannel.id);
          } else {
            // No active channels, still set first one but user will see warning
            setFromChannelId(user.channels[0].id);
          }
        }
      } catch (err) {
        setError('Failed to load channels');
        console.error('Error loading data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, navigate]);

  // CHANGED: Set initial values when partner is selected
  useEffect(() => {
    if (toPartner) {
      // Set first accepted day
      const firstDay = toPartner.acceptedDays?.[0];
      if (firstDay) {
        setDaySelected(firstDay);
      }
      
      // Set first time slot
      const firstSlot = toPartner.availableTimeSlots?.[0];
      if (firstSlot) {
        setTimeSelected(firstSlot);
      }
      
      // Set first available duration
      const durations = Object.keys(toPartner.durationPrices || {});
      if (durations.length > 0) {
        setDuration(durations[0]);
      }
    }
  }, [toPartner]);

  // Auto-select first available channel when filtered list changes
  useEffect(() => {
    if (availableChannels.length > 0 && !toChannelId) {
      setToChannelId(availableChannels[0].id);
    }
  }, [availableChannels, toChannelId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !fromChannel || !selectedPromo || !toPartner) {
      setError('Please fill in all required fields');
      return;
    }

    if (!partnerType) {
      setError('Please select a partner type');
      return;
    }

    // Validate channel status
    if ((fromChannel.status || '').toLowerCase() !== 'active') {
      setError(`Your channel "${fromChannel.name}" status is ${fromChannel.status}. Only approved channels can send cross-promotion requests.`);
      return;
    }

    // Validate CP coins balance
    if (user.cpcBalance <= 0) {
      setError('You have 0 CP coins balance. Please top up your account to send cross-promotion requests.');
      return;
    }

    if (user.cpcBalance < cpcCost) {
      setError(`Insufficient balance. You need ${cpcCost} CPC but have ${user.cpcBalance}.`);
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const request: Omit<CrossPromoRequest, 'id' | 'status' | 'created_at'> = {
        fromChannel: fromChannel.name,
        fromChannelId: fromChannel.id,
        toChannel: toPartner.name,
        toChannelId: toPartner.id,
        daySelected,
        timeSelected,
        duration: parseInt(duration),
        cpcCost,
        promo: selectedPromo,
      };

      const result = await apiService.createRequest(request);

      if (result.ok) {
        navigate('/requests');
      }
    } catch (err) {
      setError('Failed to send request');
      console.error('Error creating request:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Show loading spinner while fetching data
  if (loading) {
    return (
      <Layout>
        <LoadingSpinner />
      </Layout>
    );
  }

  // Redirect to login if no user
  if (!user) {
    return null;
  }

  // Show empty state if no channels
  if (!user.channels || user.channels.length === 0) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-darkBlue-800 border border-grey-700 rounded-lg p-12 text-center">
            <Send size={48} className="mx-auto mb-4 text-grey-600" />
            <h2 className="text-2xl font-bold text-white mb-2">No Channels Found</h2>
            <p className="text-grey-400 mb-6">You need to add a channel before you can send promotions</p>
            <button
              onClick={() => navigate('/add-channel')}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3 px-6 rounded-lg transition-all"
            >
              Add Your First Channel
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  // Main form render - user has channels
  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Send Cross-Promotion</h1>
          <p className="text-grey-400">Create a new promotional request to partner channels</p>
        </div>

        {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* From Channel Selection */}
          <div className="bg-darkBlue-800 border border-grey-700 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">From Your Channel</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-grey-300 mb-2">
                  Select Channel
                </label>
                <select
                  value={fromChannelId}
                  onChange={(e) => {
                    setFromChannelId(e.target.value);
                    setSelectedPromoId('');
                    setPartnerType(null); // Reset partner type when channel changes
                  }}
                  className="w-full bg-darkBlue-700 border border-grey-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  {user.channels.map((channel) => (
                    <option 
                      key={channel.id} 
                      value={channel.id}
                      disabled={(channel.status || '').toLowerCase() !== 'active'}
                    >
                      {channel.name} ({(channel.subs || 0).toLocaleString()} subs) - {channel.status}
                    </option>
                  ))}
                </select>
              </div>

              {fromChannel && (
                <div>
                  <label className="block text-sm font-medium text-grey-300 mb-2">
                    Promo to Share
                  </label>
                  {(!fromChannel.promos || fromChannel.promos.length === 0) ? (
                    <div className="bg-yellow-600/10 border border-yellow-600/30 rounded-lg p-4 text-center">
                      <p className="text-yellow-300 text-sm">
                        No promos found for this channel. Please add promos in the channel settings.
                      </p>
                    </div>
                  ) : (
                    <select
                      value={selectedPromoId}
                      onChange={(e) => setSelectedPromoId(e.target.value)}
                      className="w-full bg-darkBlue-700 border border-grey-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="">Select a promo</option>
                      {fromChannel.promos.map((promo) => (
                        <option key={promo.id} value={promo.id}>
                          {promo.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>

            {selectedPromo && (
              <div className="mt-6 p-4 bg-darkBlue-700 rounded-lg border border-blue-600/30">
                <h3 className="text-white font-bold mb-2">{selectedPromo.name}</h3>
                <p className="text-grey-300 text-sm mb-3">{selectedPromo.text}</p>
                <a
                  href={selectedPromo.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 text-sm"
                >
                  {selectedPromo.link}
                </a>
              </div>
            )}
          </div>

          {/* Channel Status Warning */}
          {fromChannel && (fromChannel.status || '').toLowerCase() !== 'active' && (
            <div className="bg-red-600/10 border border-red-600/30 rounded-lg p-4">
              <p className="text-red-300 font-medium">
                ⚠️ Your channel "{fromChannel.name}" status is {fromChannel.status}. Only approved channels can send cross-promotion requests.
              </p>
            </div>
          )}

          {/* Balance Warning */}
          {user.cpcBalance === 0 && (
            <div className="bg-red-600/10 border border-red-600/30 rounded-lg p-4">
              <p className="text-red-300 font-medium">
                ⚠️ You have 0 CP coins balance. Please top up your account to send cross-promotion requests.
              </p>
            </div>
          )}

          {/* Partner Type Selection */}
          <div className="bg-darkBlue-800 border border-grey-700 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">Choose Partner Type</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setPartnerType('existing')}
                className={`p-6 rounded-lg border-2 transition-all text-left ${
                  partnerType === 'existing'
                    ? 'border-blue-500 bg-blue-600/10'
                    : 'border-grey-600 bg-darkBlue-700 hover:border-grey-500'
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    partnerType === 'existing' ? 'bg-blue-600' : 'bg-grey-600'
                  }`}>
                    <Users className="text-white" size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-white">Existing Partners</h3>
                </div>
                <p className="text-grey-400 text-sm">
                  Send requests to channels you've previously worked with
                </p>
              </button>

              <button
                type="button"
                onClick={() => setPartnerType('discover')}
                className={`p-6 rounded-lg border-2 transition-all text-left ${
                  partnerType === 'discover'
                    ? 'border-blue-500 bg-blue-600/10'
                    : 'border-grey-600 bg-darkBlue-700 hover:border-grey-500'
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    partnerType === 'discover' ? 'bg-blue-600' : 'bg-grey-600'
                  }`}>
                    <Compass className="text-white" size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-white">Discover New Partners</h3>
                </div>
                <p className="text-grey-400 text-sm">
                  Find new channels in the <span className="text-blue-400 font-medium">{fromChannelTopic || 'same'}</span> category
                </p>
              </button>
            </div>
          </div>

          {/* Partner Selection - Shows after partner type is chosen */}
          {partnerType && (
            <div className="bg-darkBlue-800 border border-grey-700 rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-4">
                {partnerType === 'existing' ? 'To Existing Partner' : 'To New Partner'}
              </h2>

              {availableChannels.length === 0 ? (
                <div className="bg-yellow-600/10 border border-yellow-600/30 rounded-lg p-6 text-center">
                  <AlertCircle className="mx-auto mb-3 text-yellow-400" size={32} />
                  <p className="text-yellow-300 font-medium mb-2">
                    {partnerType === 'existing' 
                      ? 'No existing partners found' 
                      : `No channels found in ${fromChannelTopic} category`}
                  </p>
                  <p className="text-yellow-200 text-sm">
                    {partnerType === 'existing' 
                      ? 'Try discovering new partners instead.' 
                      : 'Check back later for new channels.'}
                  </p>
                </div>
              ) : (
                <>
                  <label className="block text-sm font-medium text-grey-300 mb-2">
                    Select Partner Channel
                  </label>
                  <select
                    value={toChannelId}
                    onChange={(e) => setToChannelId(e.target.value)}
                    className="w-full bg-darkBlue-700 border border-grey-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  >
                    {availableChannels.map((partner) => (
                      <option key={partner.id} value={partner.id}>
                        {partner.name} ({partner.subs.toLocaleString()} subs) - {partner.topic}
                      </option>
                    ))}
                  </select>

                  {toPartner && (
                    <div className="mt-6 p-4 bg-darkBlue-700 rounded-lg border border-blue-600/30 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-white font-bold">{toPartner.name}</h3>
                          <p className="text-grey-400 text-sm">{toPartner.topic}</p>
                        </div>
                        <ChannelAvatar 
                          src={toPartner.avatar} 
                          alt={toPartner.name} 
                          className="w-12 h-12"
                          channelName={toPartner.name}
                        />
                      </div>
                      <div className="grid grid-cols-2 text-sm">
                        <div>
                          <span className="text-grey-400">Subscribers:</span>
                          <p className="text-white font-medium">{toPartner.subs.toLocaleString()}</p>
                        </div>
                        <div>
                          <span className="text-grey-400">Language:</span>
                          <p className="text-white font-medium">{toPartner.lang}</p>
                        </div>
                      </div>
                      
                      {/* CHANGED: Only show accepted days */}
                      <div>
                        <span className="text-grey-400 text-sm">Accepted Days:</span>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {(toPartner?.acceptedDays || []).map((day) => (
                            <span key={day} className="bg-blue-600/20 text-blue-300 text-xs px-2 py-1 rounded">
                              {String(day).slice(0, 3)}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* ADDED: Cross-promotions per day */}
                      <div>
                        <span className="text-grey-400 text-sm">Cross-Promotions Per Day:</span>
                        <p className="text-white font-medium">{toPartner.promosPerDay || 1}</p>
                      </div>

                      {/* View Channel Button */}
                      <a
                        href={`https://t.me/${toPartner.telegram_chat.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-grey-700 hover:bg-grey-600 text-white font-medium px-4 py-2 rounded-lg transition-all text-sm"
                      >
                        <ExternalLink size={16} />
                        View Channel on Telegram
                      </a>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Scheduling - Only show if partner is selected */}
          {partnerType && toPartner && (
            <div className="bg-darkBlue-800 border border-grey-700 rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-4">Schedule</h2>
              
              {(!toPartner.acceptedDays || toPartner.acceptedDays.length === 0) ||
               (!toPartner.availableTimeSlots || toPartner.availableTimeSlots.length === 0) ||
               (!toPartner.durationPrices || Object.keys(toPartner.durationPrices).length === 0) ? (
                <div className="bg-yellow-600/10 border border-yellow-600/30 rounded-lg p-6 text-center">
                  <p className="text-yellow-300 text-sm">
                    This channel's schedule information is not fully configured. Please contact the channel owner.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-grey-300 mb-2">
                      Day
                    </label>
                    <select
                      value={daySelected}
                      onChange={(e) => setDaySelected(e.target.value)}
                      className="w-full bg-darkBlue-700 border border-grey-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                    >
                      {toPartner.acceptedDays.map((day) => (
                        <option key={day} value={day}>
                          {day}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-grey-300 mb-2">
                      Time Slot
                    </label>
                    <select
                      value={timeSelected}
                      onChange={(e) => setTimeSelected(e.target.value)}
                      className="w-full bg-darkBlue-700 border border-grey-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                    >
                      {toPartner.availableTimeSlots.map((slot) => (
                        <option key={slot} value={slot}>
                          {slot}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-grey-300 mb-2">
                      Duration (hours)
                    </label>
                    <select
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      className="w-full bg-darkBlue-700 border border-grey-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                    >
                      {Object.keys(toPartner.durationPrices).map((d) => (
                        <option key={d} value={d}>
                          {d} hours
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Summary & Cost - Only show if partner is selected */}
          {partnerType && toPartner && (
            <>
              <div className="bg-gradient-to-r from-blue-600/20 to-blue-500/20 border border-blue-600/30 rounded-lg p-6">
                <div className="space-y-3">
                  <div className="flex justify-between text-grey-300">
                    <span>Duration Cost:</span>
                    <span className="text-white font-bold">{cpcCost} CPC</span>
                  </div>
                  <div className="flex justify-between text-grey-300">
                    <span>Current Balance:</span>
                    <span className={`font-bold ${user.cpcBalance >= cpcCost ? 'text-green-400' : 'text-red-400'}`}>
                      {user.cpcBalance} CPC
                    </span>
                  </div>
                  {user.cpcBalance < cpcCost && (
                    <div className="flex items-center gap-2 text-red-400 text-sm mt-4">
                      <AlertCircle size={16} />
                      <span>Insufficient balance. Please top up your account.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={
                  submitting || 
                  user.cpcBalance <= 0 || 
                  user.cpcBalance < cpcCost || 
                  !selectedPromo || 
                  !toPartner ||
                  (fromChannel?.status || '').toLowerCase() !== 'active'
                }
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-grey-600 disabled:to-grey-700 disabled:cursor-not-allowed text-white font-bold py-4 rounded-lg transition-all flex items-center justify-center gap-2"
              >
                <Send size={20} />
                {submitting ? 'Sending...' : 'Send Promotion Request'}
              </button>
            </>
          )}
        </form>
      </div>
    </Layout>
  );
}