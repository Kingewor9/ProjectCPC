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
      const refreshInterval = setInterval(() => {
    fetchData();
  }, 5 * 60 * 1000);
  
  return () => clearInterval(refreshInterval);
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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-24 animate-fade-in-up flex flex-col items-center justify-center">
          <div className="glass-panel p-12 text-center border-dashed border-2 max-w-lg w-full relative overflow-hidden group">
            <div className="absolute inset-0 bg-blue-500/10 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            
            <div className="w-20 h-20 bg-surface border border-surfaceBorder rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(0,0,0,0.3)] mx-auto mb-6 relative z-10 group-hover:border-neon-cyan/50 transition-colors duration-500">
              <Send size={32} className="text-contentMuted group-hover:text-neon-cyan group-hover:translate-x-1 group-hover:-translate-y-1 transition-all duration-500" />
            </div>
            
            <h2 className="text-2xl sm:text-3xl font-heading font-extrabold text-white mb-3 relative z-10">No Channels Found</h2>
            <p className="text-contentMuted mb-8 font-sans relative z-10">You need to add a channel to your portfolio before you can send cross-promotion requests to other creators.</p>
            
            <button
              onClick={() => navigate('/add-channel')}
              className="btn-primary w-full sm:w-auto px-8 py-4 relative z-10 group overflow-hidden"
            >
              <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-neon-emerald via-neon-cyan to-neon-violet group-hover:h-full opacity-10 transition-all duration-300 pointer-events-none"></div>
              <span className="relative z-10 flex items-center justify-center gap-2">
                ADD YOUR FIRST CHANNEL
                <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </span>
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  // Main form render - user has channels
  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 pb-32 animate-fade-in-up">
        <div className="mb-10 sm:mb-12">
          <h1 className="text-4xl sm:text-5xl font-heading font-extrabold text-white mb-3 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">Send Cross-Promotion</h1>
          <p className="text-contentMuted text-lg font-sans">Create a new promotional request to partner channels</p>
        </div>

        {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* From Channel Selection */}
          <div className="glass-panel p-6 sm:p-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-neon-cyan/5 rounded-full blur-3xl pointer-events-none group-hover:bg-neon-cyan/10 transition-colors duration-1000"></div>
            
            <h2 className="text-xl sm:text-2xl font-heading font-bold text-white mb-6 flex items-center gap-3 relative z-10">
              <span className="w-2 h-6 bg-neon-cyan rounded-full"></span>
              From Your Channel
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
              <div>
                <label className="block text-xs font-bold tracking-widest uppercase text-contentMuted mb-2 ml-1">
                  Select Channel
                </label>
                <div className="relative">
                  <select
                    value={fromChannelId}
                    onChange={(e) => {
                      setFromChannelId(e.target.value);
                      setSelectedPromoId('');
                      setPartnerType(null); // Reset partner type when channel changes
                    }}
                    className="input-glass w-full appearance-none pr-10 font-sans"
                  >
                    {user.channels.map((channel) => (
                      <option 
                        key={channel.id} 
                        value={channel.id}
                        disabled={(channel.status || '').toLowerCase() !== 'active'}
                        className="bg-charcoal text-white"
                      >
                        {channel.name} ({(channel.subs || 0).toLocaleString()} subs) - {channel.status}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-contentMuted">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>

              {fromChannel && (
                <div>
                  <label className="block text-xs font-bold tracking-widest uppercase text-contentMuted mb-2 ml-1">
                    Promo to Share
                  </label>
                  {(!fromChannel.promos || fromChannel.promos.length === 0) ? (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 text-center">
                      <p className="text-yellow-500 text-xs font-bold tracking-wide">
                        No promos found. Please add promos in channel settings.
                      </p>
                    </div>
                  ) : (
                    <div className="relative">
                      <select
                        value={selectedPromoId}
                        onChange={(e) => setSelectedPromoId(e.target.value)}
                        className="input-glass w-full appearance-none pr-10 font-sans"
                      >
                        <option value="" className="bg-charcoal text-white">Select a promo</option>
                        {fromChannel.promos.map((promo) => (
                          <option key={promo.id} value={promo.id} className="bg-charcoal text-white">
                            {promo.name}
                          </option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-contentMuted">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {selectedPromo && (
              <div className="mt-6 p-5 bg-surface/50 rounded-xl border border-neon-cyan/20 shadow-[0_0_15px_rgba(0,240,255,0.05)] relative z-10 transition-all">
                <span className="inline-block bg-neon-cyan/10 text-neon-cyan text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded mb-2 border border-neon-cyan/20">Selected Promo</span>
                <h3 className="text-white font-heading font-bold text-lg mb-2">{selectedPromo.name}</h3>
                <p className="text-contentMuted text-sm font-sans mb-3 line-clamp-2">{selectedPromo.text}</p>
                <a
                  href={selectedPromo.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-neon-cyan hover:text-white text-xs font-mono truncate hover:underline transition-colors"
                >
                  <ExternalLink size={14} />
                  {selectedPromo.link}
                </a>
              </div>
            )}
          </div>

          {/* Channel Status Warning */}
          {fromChannel && (fromChannel.status || '').toLowerCase() !== 'active' && (
            <div className="glass-panel border-yellow-500/30 bg-yellow-500/5 p-5 flex items-start gap-4">
              <AlertCircle className="text-yellow-500 shrink-0 mt-0.5" size={20} />
              <div>
                <p className="text-white font-bold mb-1">Channel not active</p>
                <p className="text-yellow-500/80 text-sm font-sans">
                  Your channel "<span className="text-yellow-400">{fromChannel.name}</span>" status is {fromChannel.status}. Only approved channels can send requests.
                </p>
              </div>
            </div>
          )}

          {/* Balance Warning */}
          {user.cpcBalance === 0 && (
            <div className="glass-panel border-red-500/30 bg-red-500/5 p-5 flex items-start gap-4">
              <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={20} />
              <div>
                <p className="text-white font-bold mb-1">Zero Balance</p>
                <p className="text-red-400 text-sm font-sans">
                  You have 0 CP coins balance. Please top up your account to send requests.
                </p>
              </div>
            </div>
          )}

          {/* Partner Type Selection */}
          <div className="glass-panel p-6 sm:p-8">
            <h2 className="text-xl sm:text-2xl font-heading font-bold text-white mb-6 flex items-center gap-3">
              <span className="w-2 h-6 bg-neon-violet rounded-full"></span>
              Choose Partner Type
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setPartnerType('existing')}
                className={`p-6 rounded-xl border-2 transition-all text-left relative overflow-hidden group ${
                  partnerType === 'existing'
                    ? 'border-neon-violet bg-neon-violet/10 shadow-[0_0_20px_rgba(138,43,226,0.15)]'
                    : 'border-surfaceBorder bg-surface/30 hover:border-contentMuted hover:bg-surface/50'
                }`}
              >
                {partnerType === 'existing' && (
                  <div className="absolute top-0 right-0 w-16 h-16 bg-neon-violet/20 blur-xl pointer-events-none"></div>
                )}
                <div className="flex items-center gap-4 mb-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                    partnerType === 'existing' ? 'bg-neon-violet text-charcoal' : 'bg-surface border border-surfaceBorder text-contentMuted group-hover:text-white'
                  }`}>
                    <Users size={24} />
                  </div>
                  <h3 className={`text-lg font-heading font-bold ${partnerType === 'existing' ? 'text-neon-violet' : 'text-white'}`}>Existing Partners</h3>
                </div>
                <p className="text-contentMuted text-sm font-sans line-clamp-2">
                  Send requests to channels you've previously worked with
                </p>
              </button>

              <button
                type="button"
                onClick={() => setPartnerType('discover')}
                className={`p-6 rounded-xl border-2 transition-all text-left relative overflow-hidden group ${
                  partnerType === 'discover'
                    ? 'border-neon-emerald bg-neon-emerald/10 shadow-[0_0_20px_rgba(0,255,157,0.15)]'
                    : 'border-surfaceBorder bg-surface/30 hover:border-contentMuted hover:bg-surface/50'
                }`}
              >
                {partnerType === 'discover' && (
                  <div className="absolute top-0 right-0 w-16 h-16 bg-neon-emerald/20 blur-xl pointer-events-none"></div>
                )}
                <div className="flex items-center gap-4 mb-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                    partnerType === 'discover' ? 'bg-neon-emerald text-charcoal' : 'bg-surface border border-surfaceBorder text-contentMuted group-hover:text-white'
                  }`}>
                    <Compass size={24} />
                  </div>
                  <h3 className={`text-lg font-heading font-bold ${partnerType === 'discover' ? 'text-neon-emerald' : 'text-white'}`}>Discover New</h3>
                </div>
                <p className="text-contentMuted text-sm font-sans line-clamp-2">
                  Find new channels in the <span className="text-neon-emerald font-mono font-bold">{fromChannelTopic || 'same'}</span> category
                </p>
              </button>
            </div>
          </div>

          {/* Partner Selection - Shows after partner type is chosen */}
          {partnerType && (
            <div className="glass-panel p-6 sm:p-8 animate-fade-in-up">
              <h2 className="text-xl sm:text-2xl font-heading font-bold text-white mb-6 flex items-center gap-3">
                <span className={`w-2 h-6 rounded-full ${partnerType === 'existing' ? 'bg-neon-violet' : 'bg-neon-emerald'}`}></span>
                {partnerType === 'existing' ? 'To Existing Partner' : 'To New Partner'}
              </h2>

              {availableChannels.length === 0 ? (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-8 text-center mix-blend-screen">
                  <div className="w-16 h-16 bg-surface border border-surfaceBorder rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="text-yellow-500" size={28} />
                  </div>
                  <p className="text-white font-heading font-bold text-lg mb-2">
                    {partnerType === 'existing' 
                      ? 'No existing partners found' 
                      : `No channels found in ${fromChannelTopic} category`}
                  </p>
                  <p className="text-yellow-500/80 text-sm font-sans">
                    {partnerType === 'existing' 
                      ? 'Try discovering new partners instead.' 
                      : 'Check back later for new channels.'}
                  </p>
                </div>
              ) : (
                <>
                  <label className="block text-xs font-bold tracking-widest uppercase text-contentMuted mb-2 ml-1">
                    Select Partner Channel
                  </label>
                  <div className="relative">
                    <select
                      value={toChannelId}
                      onChange={(e) => setToChannelId(e.target.value)}
                      className="input-glass w-full appearance-none pr-10 font-sans"
                    >
                      {availableChannels.map((partner) => (
                        <option key={partner.id} value={partner.id} className="bg-charcoal text-white">
                          {partner.name} ({partner.subs.toLocaleString()} subs) - {partner.topic}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-contentMuted">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>

                  {toPartner && (
                    <div className="mt-6 p-5 sm:p-6 bg-surface/30 rounded-xl border border-surfaceBorder shadow-inner">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
                        <div className="flex items-center gap-4">
                          <ChannelAvatar 
                            src={toPartner.avatar} 
                            alt={toPartner.name} 
                            className="w-16 h-16 sm:w-20 sm:h-20 shadow-[0_0_15px_rgba(255,255,255,0.1)] border-2 border-surfaceBorder"
                            channelName={toPartner.name}
                          />
                          <div>
                            <h3 className="text-white font-heading font-bold text-xl sm:text-2xl mb-1">{toPartner.name}</h3>
                            <span className="inline-block px-2.5 py-1 rounded bg-surface border border-surfaceBorder text-contentMuted text-[10px] font-bold tracking-widest uppercase truncate max-w-[150px] sm:max-w-full">
                              {toPartner.topic}
                            </span>
                          </div>
                        </div>
                        
                        {/* View Channel Button */}
                        <a
                          href={`https://t.me/${toPartner.telegram_chat.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-2 bg-charcoal hover:bg-surface border border-surfaceBorder hover:border-contentMuted text-white font-bold px-4 py-2.5 rounded-lg transition-all text-sm shrink-0 uppercase tracking-widest"
                        >
                          <ExternalLink size={16} />
                          VIEW
                        </a>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 pt-6 border-t border-surfaceBorder">
                        <div>
                          <span className="block text-contentMuted text-[10px] font-bold tracking-widest uppercase mb-1.5">Subscribers</span>
                          <p className="text-white font-mono font-bold text-base sm:text-lg">{toPartner.subs.toLocaleString()}</p>
                        </div>
                        <div>
                          <span className="block text-contentMuted text-[10px] font-bold tracking-widest uppercase mb-1.5">Language</span>
                          <p className="text-white font-mono font-bold text-base sm:text-lg">{toPartner.lang}</p>
                        </div>
                        
                        {/* ACCEPTED DAYS */}
                        <div className="md:col-span-2">
                          <span className="block text-contentMuted text-[10px] font-bold tracking-widest uppercase mb-2">Accepted Days</span>
                          <div className="flex flex-wrap gap-2">
                            {(toPartner?.acceptedDays || []).map((day) => (
                              <span key={day} className="bg-neon-cyan/10 border border-neon-cyan/20 text-neon-cyan text-xs px-2.5 py-1 rounded font-mono font-bold">
                                {String(day).slice(0, 3)}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* CROSS-PROMOTIONS PER DAY */}
                        <div className="md:col-span-4">
                          <span className="block text-contentMuted text-[10px] font-bold tracking-widest uppercase mb-1.5">Cross-Promos Per Day</span>
                          <p className="text-white font-mono font-bold text-base sm:text-lg">{toPartner.promosPerDay || 1}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Scheduling - Only show if partner is selected */}
          {partnerType && toPartner && (
            <div className="glass-panel p-6 sm:p-8 animate-fade-in-up filter drop-shadow-lg">
              <h2 className="text-xl sm:text-2xl font-heading font-bold text-white mb-6 flex items-center gap-3">
                <span className="w-2 h-6 bg-yellow-500 rounded-full"></span>
                Schedule Time Slot
              </h2>
              
              {(!toPartner.acceptedDays || toPartner.acceptedDays.length === 0) ||
               (!toPartner.availableTimeSlots || toPartner.availableTimeSlots.length === 0) ||
               (!toPartner.durationPrices || Object.keys(toPartner.durationPrices).length === 0) ? (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6 text-center">
                  <p className="text-yellow-500 text-sm font-bold tracking-wide">
                    This channel's schedule information is not fully configured. Please contact the channel owner.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-xs font-bold tracking-widest uppercase text-contentMuted mb-2 ml-1">
                      Day
                    </label>
                    <div className="relative">
                      <select
                        value={daySelected}
                        onChange={(e) => setDaySelected(e.target.value)}
                        className="input-glass w-full appearance-none pr-10 font-sans"
                      >
                        {toPartner.acceptedDays.map((day) => (
                          <option key={day} value={day} className="bg-charcoal text-white">
                            {day}
                          </option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-contentMuted">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold tracking-widest uppercase text-contentMuted mb-2 ml-1">
                      Time Slot
                    </label>
                    <div className="relative">
                      <select
                        value={timeSelected}
                        onChange={(e) => setTimeSelected(e.target.value)}
                        className="input-glass w-full appearance-none pr-10 font-sans tracking-widest text-neon-cyan"
                      >
                        {toPartner.availableTimeSlots.map((slot) => (
                          <option key={slot} value={slot} className="bg-charcoal text-white tracking-widest">
                            {slot}
                          </option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-contentMuted">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold tracking-widest uppercase text-contentMuted mb-2 ml-1">
                      Duration (hours)
                    </label>
                    <div className="relative">
                      <select
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        className="input-glass w-full appearance-none pr-10 font-sans"
                      >
                        {Object.keys(toPartner.durationPrices).map((d) => (
                          <option key={d} value={d} className="bg-charcoal text-white">
                            {d} hours
                          </option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-contentMuted">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Summary & Cost - Only show if partner is selected */}
          {partnerType && toPartner && (
            <div className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
              <div className="bg-gradient-to-r from-neon-emerald/10 via-neon-cyan/5 to-transparent border border-neon-cyan/20 rounded-xl p-6 sm:p-8 mb-8 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-neon-cyan/10 to-transparent pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity"></div>
                <div className="space-y-4 relative z-10">
                  <div className="flex items-end justify-between border-b border-surfaceBorder/50 pb-4">
                    <span className="text-contentMuted text-xs font-bold tracking-widest uppercase">Duration Cost</span>
                    <span className="text-white font-mono font-bold text-2xl"><span className="text-yellow-500">{cpcCost}</span> CP</span>
                  </div>
                  <div className="flex items-end justify-between pt-2">
                    <span className="text-contentMuted text-xs font-bold tracking-widest uppercase">Current Balance</span>
                    <span className={`font-mono font-bold text-xl ${user.cpcBalance >= cpcCost ? 'text-neon-emerald' : 'text-red-500'}`}>
                      {user.cpcBalance} CP
                    </span>
                  </div>
                  {user.cpcBalance < cpcCost && (
                    <div className="flex items-center gap-2 text-red-500 bg-red-500/10 p-3 rounded-lg border border-red-500/20 text-sm font-bold mt-4">
                      <AlertCircle size={18} />
                      <span className="font-sans">Insufficient balance. Please top up your account.</span>
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
                className="btn-primary w-full py-5 text-lg group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-neon-cyan/0 via-neon-cyan/20 to-neon-cyan/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                {submitting ? (
                  <div className="flex items-center justify-center gap-3 relative z-10">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                    <span className="tracking-widest">SENDING REQUEST...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-3 relative z-10">
                    <span className="tracking-widest">SEND PROMOTION REQUEST</span>
                    <Send size={20} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  </div>
                )}
              </button>
            </div>
          )}
        </form>
      </div>
    </Layout>
  );
}