import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';
import ChannelAvatar from '../components/ChannelAvatar';
import { useAuth } from '../hooks/useAuth';
import apiService from '../services/api';
import { Plus, X, CheckCircle, Save, Pause, Play, Send } from 'lucide-react';

interface Channel {
  id: string;
  name: string;
  username: string;
  avatar: string;
  subscribers: number;
  is_paused?: boolean;
  topic: string;
  status: string;
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
}

interface PriceSettings {
  [key: string]: { enabled: boolean; price: number };
  '2': { enabled: boolean; price: number };
  '4': { enabled: boolean; price: number };
  '6': { enabled: boolean; price: number };
  '8': { enabled: boolean; price: number };
  '10': { enabled: boolean; price: number };
  '12': { enabled: boolean; price: number };
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const TIME_SLOTS = [
  '00:00 - 01:00 UTC', '01:00 - 02:00 UTC', '02:00 - 03:00 UTC', '03:00 - 04:00 UTC',
  '04:00 - 05:00 UTC', '05:00 - 06:00 UTC', '06:00 - 07:00 UTC', '07:00 - 08:00 UTC',
  '08:00 - 09:00 UTC', '09:00 - 10:00 UTC', '10:00 - 11:00 UTC', '11:00 - 12:00 UTC',
  '12:00 - 13:00 UTC', '13:00 - 14:00 UTC', '14:00 - 15:00 UTC', '15:00 - 16:00 UTC',
  '16:00 - 17:00 UTC', '17:00 - 18:00 UTC', '18:00 - 19:00 UTC', '19:00 - 20:00 UTC',
  '20:00 - 21:00 UTC', '21:00 - 22:00 UTC', '22:00 - 23:00 UTC', '23:00 - 00:00 UTC'
];

const MIN_PRICE = 1000;
const MAX_PRICE = 750000;

export default function EditChannelPage() {
  const navigate = useNavigate();
  const { channelId } = useParams<{ channelId: string }>();
  const { user } = useAuth();

  const [channel, setChannel] = useState<Channel | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Edit state
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [promosPerDay, setPromosPerDay] = useState(1);
  const [priceSettings, setPriceSettings] = useState<PriceSettings>({
    '2': { enabled: false, price: 0 },
    '4': { enabled: false, price: 0 },
    '6': { enabled: false, price: 0 },
    '8': { enabled: false, price: 0 },
    '10': { enabled: false, price: 0 },
    '12': { enabled: false, price: 0 }
  });
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<string[]>([]);
  const [promoMaterials, setPromoMaterials] = useState<any[]>([]);
  const [showPromoForm, setShowPromoForm] = useState(false);
  const [newPromo, setNewPromo] = useState({
    name: '',
    text: '',
    image: '',
    link: '',
    cta: ''
  });

const [selectedPreviewPromo, setSelectedPreviewPromo] = useState<string>('');
const [previewing, setPreviewing] = useState(false);
const [previewSuccess, setPreviewSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    fetchChannel();
  }, [channelId, user, navigate]);

  const fetchChannel = async () => {
    try {
      setLoading(true);
      const data = await apiService.getChannel(channelId!);
      setChannel(data);

      // Check if channel can be edited
    const channelStatus = data.status?.toLowerCase();
    if (channelStatus !== 'approved' && channelStatus !== 'active') {
      setError(`Cannot edit ${channelStatus} channel. Only approved channels can be edited.`);
      setTimeout(() => navigate('/dashboard'), 3000);
      return;
    }

      // Initialize edit state
      setSelectedDays(data.acceptedDays || []);
      setPromosPerDay(data.promosPerDay || 1);
      setSelectedTimeSlots(data.availableTimeSlots || []);
      setPromoMaterials(data.promoMaterials || []);

      // Initialize price settings
      const prices: PriceSettings = {
        '2': { enabled: false, price: 0 },
        '4': { enabled: false, price: 0 },
        '6': { enabled: false, price: 0 },
        '8': { enabled: false, price: 0 },
        '10': { enabled: false, price: 0 },
        '12': { enabled: false, price: 0 }
      };

      Object.keys(data.durationPrices || {}).forEach(hours => {
        prices[hours] = {
          enabled: true,
          price: data.durationPrices[hours]
        };
      });

      setPriceSettings(prices);
    } catch (err: any) {
      setError(err.message || 'Failed to load channel');
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (day: string) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const togglePriceSetting = (hours: keyof PriceSettings) => {
    setPriceSettings(prev => ({
      ...prev,
      [hours]: { ...prev[hours], enabled: !prev[hours].enabled }
    }));
  };

  const updatePrice = (hours: keyof PriceSettings, price: number) => {
    setPriceSettings(prev => ({
      ...prev,
      [hours]: { ...prev[hours], price }
    }));
  };

  const toggleTimeSlot = (slot: string) => {
    if (selectedTimeSlots.includes(slot)) {
      setSelectedTimeSlots(prev => prev.filter(s => s !== slot));
    } else if (selectedTimeSlots.length < promosPerDay) {
      setSelectedTimeSlots(prev => [...prev, slot]);
    }
  };

  const handleAddPromo = () => {
    if (!newPromo.name || !newPromo.text || !newPromo.link || !newPromo.cta) {
      setError('Please fill in all promo fields');
      return;
    }

    // UPDATED: Different validation for private vs public channels
  // Check if channel is private by checking if username is a numeric ID
  const isPrivateChannel = channel?.username && /^-?\d+$/.test(channel.username);
  
  if (isPrivateChannel) {
    // For private channels, just validate it's a Telegram link
    if (!newPromo.link.includes('t.me/')) {
      setError('Promo link must be a valid Telegram link (t.me/c/... or invite link)');
      return;
    }
  } else {
    // For public channels, validate that link matches channel username
    const channelUsername = channel?.username?.replace('@', '') || '';
    if (!newPromo.link.includes(channelUsername)) {
      setError(`Promo link must be from your channel (@${channelUsername})`);
      return;
    }
  }

    if (promoMaterials.length >= 3) {
      setError('Maximum 3 promo materials allowed');
      return;
    }

    const promo = {
      id: `promo_${Date.now()}`,
      ...newPromo
    };

    setPromoMaterials(prev => [...prev, promo]);
    setNewPromo({ name: '', text: '', image: '', link: '', cta: '' });
    setShowPromoForm(false);
    setError(null);
  };

  const removePromo = (id: string) => {
    setPromoMaterials(prev => prev.filter(p => p.id !== id));
  };

  const handleSave = async () => {
    if (selectedDays.length === 0) {
      setError('Please select at least one day');
      return;
    }
    if (!Object.values(priceSettings).some(p => p.enabled)) {
      setError('Please enable at least one duration price');
      return;
    }
    const enabledPrices = Object.values(priceSettings).filter(p => p.enabled);
    const invalidPrices = enabledPrices.filter(
      p => p.price < MIN_PRICE || p.price > MAX_PRICE
    );
    
    if (invalidPrices.length > 0) {
      setError(`All prices must be between ${MIN_PRICE.toLocaleString()} and ${MAX_PRICE.toLocaleString()} CP Coins`);
      return;
    }
    if (selectedTimeSlots.length === 0) {
      setError('Please select at least one time slot');
      return;
    }
    if (promoMaterials.length === 0) {
      setError('Please create at least one promo material');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const updates = {
        selected_days: selectedDays,
        promos_per_day: promosPerDay,
        price_settings: priceSettings as { [key: string]: { enabled: boolean; price: number } },
        time_slots: selectedTimeSlots,
        promo_materials: promoMaterials
      };

      await apiService.updateChannel(channelId!, updates);
      setSuccess('Channel updated successfully!');
      
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to update channel');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!channel) return;
    // Toggle pause state via dedicated endpoint
    const currentlyPaused = !!channel.is_paused;
    try {
      setSubmitting(true);
      const res = await apiService.pauseChannel(channelId!, !currentlyPaused);
      // backend returns { ok, message, is_paused }
      setChannel({ ...channel, is_paused: !!res.is_paused });
      setSuccess(res.message || `Channel ${res.is_paused ? 'paused' : 'activated'} successfully!`);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to update channel status');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePreviewPromo = async () => {
  if (!selectedPreviewPromo) {
    setError('Please select a promo to preview');
    return;
  }

  try {
    setPreviewing(true);
    setError(null);
    setPreviewSuccess(null);

    await apiService.previewPromo(channelId!, selectedPreviewPromo);
    
    setPreviewSuccess('Preview sent to your Telegram! Check your messages.');
    
    // Clear success message after 5 seconds
    setTimeout(() => setPreviewSuccess(null), 5000);
  } catch (err: any) {
    setError(err.message || 'Failed to send preview');
  } finally {
    setPreviewing(false);
  }
};

  if (loading || !channel) {
    return (
      <Layout>
        <LoadingSpinner />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 pb-32 md:pb-12 animate-fade-in-up">
        <div className="mb-10 sm:mb-12 text-center sm:text-left">
          <h1 className="text-4xl sm:text-5xl font-heading font-extrabold text-white mb-3 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">Edit Channel</h1>
          <p className="text-contentMuted text-lg font-sans">Update your channel settings and preferences</p>
        </div>

        {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}
        
        {success && (
          <div className="mb-8 bg-neon-emerald/10 border border-neon-emerald/30 rounded-xl p-5 shadow-[0_0_15px_rgba(0,255,157,0.1)]">
            <div className="flex items-center gap-3">
              <CheckCircle className="text-neon-emerald" size={24} />
              <p className="text-neon-emerald font-bold tracking-wide">{success}</p>
            </div>
          </div>
        )}

        <div className="space-y-8 sm:space-y-12">
          {/* Channel Info (Read-only) */}
          <div className="glass-panel p-6 sm:p-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-neon-cyan/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none group-hover:bg-neon-cyan/10 transition-colors"></div>
            <h2 className="text-xl sm:text-2xl font-heading font-bold text-white mb-6 relative z-10 flex items-center gap-3">
              <span className="text-2xl">ℹ️</span> Channel Information
            </h2>
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10">
              <div className="p-2 bg-surface border border-surfaceBorder rounded-2xl shadow-lg flex-shrink-0">
                <ChannelAvatar 
                  src={channel.avatar} 
                  alt={channel.name}
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl"
                  channelName={channel.name}
                />
              </div>
              <div className="flex-1 w-full text-center sm:text-left mt-2 sm:mt-0">
                <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between mb-4 gap-4">
                  <div>
                    <h3 className="text-2xl sm:text-3xl font-heading font-bold text-white mb-1 group-hover:text-neon-cyan transition-colors">{channel.name}</h3>
                    <p className="text-contentMuted font-mono tracking-wide">{channel.username}</p>
                  </div>
                  {(() => {
                    const isPaused = !!channel.is_paused;
                    const baseStatus = (channel.status || '').toLowerCase();
                    const displayStatus = baseStatus === 'approved' ? (isPaused ? 'Paused' : 'Active') : channel.status;
                    const badgeClass = displayStatus === 'Active' ? 'bg-neon-emerald/20 text-neon-emerald border border-neon-emerald/30 shadow-[0_0_10px_rgba(0,255,157,0.2)]' :
                      displayStatus === 'Paused' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 'bg-surface text-contentMuted border border-surfaceBorder';

                    return (
                      <span className={`px-4 py-1.5 rounded-full text-xs font-mono font-bold tracking-widest ${badgeClass}`}>
                        {String(displayStatus).toUpperCase()}
                      </span>
                    );
                  })()}
                </div>
                <div className="grid grid-cols-2 gap-4 bg-charcoal/50 rounded-xl p-4 border border-surfaceBorder/50 inline-grid sm:flex">
                  <div className="px-4">
                    <p className="text-contentMuted text-xs font-bold tracking-widest uppercase mb-1">Subscribers</p>
                    <p className="text-neon-cyan font-mono font-bold text-lg drop-shadow-[0_0_5px_rgba(0,240,255,0.3)]">{channel.subscribers.toLocaleString()}</p>
                  </div>
                  <div className="px-4 border-l border-surfaceBorder/50">
                    <p className="text-contentMuted text-xs font-bold tracking-widest uppercase mb-1">Topic</p>
                    <p className="text-white font-bold text-base">{channel.topic}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Status Toggle */}
          <div className="glass-panel p-6 sm:p-8">
            <h2 className="text-xl sm:text-2xl font-heading font-bold text-white mb-4 flex items-center gap-3">
              <span className="text-neon-violet">⚡</span> Channel Status
            </h2>
            <p className="text-contentMuted text-sm mb-6 leading-relaxed">
              {channel.is_paused
                ? 'Your channel is paused and hidden from the partner listings.'
                : 'Your channel is active and visible to other users for cross-promotions.'
              }
            </p>
            <button
              onClick={handleToggleStatus}
              disabled={submitting}
              className={`flex items-center justify-center gap-3 w-full sm:w-auto px-8 py-4 rounded-xl font-bold transition-all tracking-wide ${
                channel.is_paused
                  ? 'bg-neon-emerald/20 border border-neon-emerald/50 hover:bg-neon-emerald hover:text-charcoal text-neon-emerald shadow-[0_0_15px_rgba(0,255,157,0.2)]'
                  : 'bg-yellow-500/20 border border-yellow-500/50 hover:bg-yellow-500 hover:text-charcoal text-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.2)]'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {channel.is_paused ? (
                <>
                  <Play size={20} className="fill-current" />
                  ACTIVATE CHANNEL
                </>
              ) : (
                <>
                  <Pause size={20} className="fill-current" />
                  PAUSE CHANNEL
                </>
              )}
            </button>
          </div>

          {/* Days Selection */}
          <div className="glass-panel p-6 sm:p-8">
            <h2 className="text-xl sm:text-2xl font-heading font-bold text-white mb-6 flex items-center gap-3">
              <span className="text-neon-cyan">📅</span> Accepted Days
            </h2>
            <div className="flex flex-wrap gap-3">
              {DAYS.map(day => (
                <button
                  key={day}
                  onClick={() => toggleDay(day)}
                  className={`px-5 py-3 rounded-xl font-mono font-bold tracking-wide transition-all duration-300 ${
                    selectedDays.includes(day)
                      ? 'bg-neon-cyan/20 border border-neon-cyan/50 text-neon-cyan shadow-[0_0_15px_rgba(0,240,255,0.2)]'
                      : 'bg-surface border border-surfaceBorder text-contentMuted hover:border-neon-cyan/30 hover:text-white'
                  }`}
                >
                  {day.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>

          {/* Promos Per Day */}
          <div className="glass-panel p-6 sm:p-8">
            <h2 className="text-xl sm:text-2xl font-heading font-bold text-white mb-6 flex items-center gap-3">
              <span className="text-neon-violet">📈</span> Promotions Per Day
            </h2>
            <select
              value={promosPerDay}
              onChange={(e) => {
                setPromosPerDay(Number(e.target.value));
                setSelectedTimeSlots([]);
              }}
              className="input-glass w-full text-lg cursor-pointer appearance-none"
            >
              {[1, 2, 3, 4, 5].map(num => (
                <option key={num} value={num} className="bg-charcoal text-white">{num}</option>
              ))}
            </select>
          </div>

          {/* Price Settings */}
          <div className="glass-panel p-6 sm:p-8">
            <h2 className="text-xl sm:text-2xl font-heading font-bold text-white mb-6 flex items-center gap-3">
              <span className="text-neon-emerald">💰</span> Duration Prices
            </h2>
            
            {/* Price range info */}
            <div className="bg-neon-emerald/5 border border-neon-emerald/20 rounded-xl p-4 mb-8">
              <p className="text-neon-emerald/80 text-sm font-mono">
                <strong className="text-neon-emerald mr-2">RANGE:</strong> Minimum {MIN_PRICE.toLocaleString()} CP - Maximum {MAX_PRICE.toLocaleString()} CP Coins
              </p>
            </div>
            
            <div className="space-y-4">
              {Object.entries(priceSettings).map(([hours, settings]) => {
                const isInvalidPrice = settings.enabled && (settings.price < MIN_PRICE || settings.price > MAX_PRICE);
                
                return (
                  <div key={hours}>
                    <div className={`flex flex-col sm:flex-row items-start sm:items-center gap-4 p-5 rounded-xl transition-all duration-300 ${settings.enabled ? 'bg-surface border border-neon-emerald/30 shadow-[0_0_15px_rgba(0,255,157,0.05)]' : 'bg-surface/50 border border-surfaceBorder opacity-70'}`}>
                      <div className="flex items-center gap-4 min-w-[120px]">
                        <button
                          onClick={() => togglePriceSetting(hours as keyof PriceSettings)}
                          className={`w-12 h-6 rounded-full transition-all relative flex-shrink-0 border ${
                            settings.enabled ? 'bg-neon-emerald/20 border-neon-emerald text-neon-emerald shadow-[0_0_10px_rgba(0,255,157,0.3)]' : 'bg-charcoal border-surfaceBorder'
                          }`}
                        >
                          <div className={`w-5 h-5 bg-white rounded-full absolute top-[1px] transition-all shadow-md ${
                            settings.enabled ? 'right-[1px] bg-neon-emerald' : 'left-[1px] bg-contentMuted'
                          }`} />
                        </button>
                        <span className={`font-mono font-bold text-lg ${settings.enabled ? 'text-white' : 'text-contentMuted'}`}>{hours}h</span>
                      </div>
                      
                      <div className="flex-1 w-full flex items-center gap-3">
                        <input
                          type="number"
                          value={settings.price}
                          onChange={(e) => updatePrice(hours as keyof PriceSettings, Number(e.target.value))}
                          disabled={!settings.enabled}
                          placeholder={`${MIN_PRICE} - ${MAX_PRICE}`}
                          min={MIN_PRICE}
                          max={MAX_PRICE}
                          className={`flex-1 bg-charcoal border ${
                            isInvalidPrice ? 'border-red-500/50 focus:border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.2)]' : 'border-surfaceBorder focus:border-neon-emerald focus:shadow-[0_0_15px_rgba(0,255,157,0.15)]'
                          } rounded-xl px-4 py-3 text-white font-mono disabled:opacity-50 disabled:cursor-not-allowed`}
                        />
                        <span className="text-neon-emerald font-bold tracking-widest">CP</span>
                      </div>
                    </div>
                    
                    {/* Validation message */}
                    {isInvalidPrice && (
                      <p className="text-red-400 text-xs mt-2 ml-1 font-mono">
                        {settings.price < MIN_PRICE 
                          ? `Minimum price is ${MIN_PRICE.toLocaleString()} CP` 
                          : `Maximum price is ${MAX_PRICE.toLocaleString()} CP`
                        }
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Time Slots */}
          <div className="glass-panel p-6 sm:p-8">
            <h2 className="text-xl sm:text-2xl font-heading font-bold text-white mb-6 flex items-center gap-3">
              <span className="text-neon-cyan">⏰</span> Available Time Slots
            </h2>
            <p className="text-contentMuted text-sm font-bold tracking-widest uppercase mb-4 ml-1">
              Select {promosPerDay} <span className="text-neon-cyan ml-2 text-xs">({selectedTimeSlots.length}/{promosPerDay})</span>
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 p-4 bg-surface border border-surfaceBorder rounded-xl max-h-72 overflow-y-auto custom-scrollbar">
              {TIME_SLOTS.map(slot => (
                <button
                  key={slot}
                  onClick={() => toggleTimeSlot(slot)}
                  disabled={!selectedTimeSlots.includes(slot) && selectedTimeSlots.length >= promosPerDay}
                  className={`px-2 py-3 rounded-lg text-xs font-mono font-bold tracking-wide transition-all ${
                    selectedTimeSlots.includes(slot)
                      ? 'bg-neon-cyan/20 border border-neon-cyan/50 text-neon-cyan shadow-[0_0_10px_rgba(0,240,255,0.2)]'
                      : 'bg-charcoal border border-surfaceBorder text-content hover:border-neon-cyan/30 disabled:opacity-30 disabled:cursor-not-allowed'
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>

          {/* Promo Materials */}
          <div className="glass-panel p-6 sm:p-8">
            <h2 className="text-xl sm:text-2xl font-heading font-bold text-white mb-8 flex items-center justify-between">
              <span className="flex items-center gap-3">
                <span className="text-2xl">📝</span> Promo Materials
              </span>
              <span className="text-sm font-mono text-contentMuted bg-surface px-3 py-1 rounded-full border border-surfaceBorder">
                <span className="text-white">{promoMaterials.length}</span> / 3
              </span>
            </h2>

            <div className="space-y-4 mb-6">
              {promoMaterials.map(promo => (
                <div key={promo.id} className="bg-surface border border-surfaceBorder hover:border-neon-violet/30 rounded-xl p-6 transition-all group">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-white font-heading font-bold text-lg group-hover:text-neon-violet transition-colors">{promo.name}</h3>
                    <button
                      onClick={() => removePromo(promo.id)}
                      className="text-contentMuted hover:text-red-500 hover:bg-red-500/10 p-2 rounded-lg transition-all"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  <p className="text-contentMuted text-sm mb-4 leading-relaxed">{promo.text}</p>
                  <div className="flex items-center gap-3 inline-flex bg-charcoal px-4 py-2 rounded-lg border border-surfaceBorder">
                    <span className="text-contentMuted text-xs font-bold tracking-widest uppercase">CTA:</span>
                    <span className="text-neon-violet font-mono font-bold text-sm tracking-wide">{promo.cta}</span>
                  </div>
                </div>
              ))}
            </div>

            {!showPromoForm && promoMaterials.length < 3 && (
              <button
                onClick={() => setShowPromoForm(true)}
                className="w-full bg-surface border border-surfaceBorder border-dashed hover:border-neon-violet/50 hover:bg-neon-violet/5 text-contentMuted hover:text-white py-5 rounded-xl transition-all flex items-center justify-center gap-3 font-bold tracking-wide"
              >
                <Plus className="text-neon-violet" size={24} />
                ADD PROMO MATERIAL
              </button>
            )}

            {showPromoForm && (
              <div className="bg-surface border border-neon-violet/30 rounded-xl p-6 sm:p-8 space-y-6 relative overflow-hidden shadow-[0_0_20px_rgba(138,43,226,0.05)]">
                <div className="absolute top-0 right-0 w-32 h-32 bg-neon-violet/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                
                <h3 className="text-white font-heading font-bold text-xl mb-6 relative z-10 flex items-center gap-2">
                  <span className="w-2 h-6 bg-neon-violet rounded-full inline-block"></span>
                  New Promo
                </h3>
                
                <div className="relative z-10">
                  <label className="block text-xs font-bold tracking-widest uppercase text-contentMuted mb-2 ml-1">Promo Name</label>
                  <input
                    type="text"
                    value={newPromo.name}
                    onChange={(e) => setNewPromo({...newPromo, name: e.target.value})}
                    placeholder="e.g., Weekly Special"
                    className="input-glass w-full"
                  />
                </div>

                <div className="relative z-10">
                  <label className="block text-xs font-bold tracking-widest uppercase text-contentMuted mb-2 ml-1">Promo Text</label>
                  <textarea
                    value={newPromo.text}
                    onChange={(e) => setNewPromo({...newPromo, text: e.target.value})}
                    rows={4}
                    placeholder="Write an engaging message..."
                    className="input-glass w-full leading-relaxed resize-none"
                  />
                </div>

                <div className="relative z-10">
                  <label className="block text-xs font-bold tracking-widest uppercase text-contentMuted mb-2 ml-1">Promo Image URL</label>
                  <input
                    type="text"
                    value={newPromo.image}
                    onChange={(e) => setNewPromo({...newPromo, image: e.target.value})}
                    placeholder="https://example.com/image.jpg"
                    className="input-glass w-full font-mono text-sm"
                  />
                </div>

                <div className="relative z-10">
                  <label className="block text-xs font-bold tracking-widest uppercase text-contentMuted mb-2 ml-1">Promo Link</label>
                  <input
                    type="text"
                    value={newPromo.link}
                    onChange={(e) => setNewPromo({...newPromo, link: e.target.value})}
                    placeholder={
                      channel?.username && /^-?\d+$/.test(channel.username)
                        ? "https://t.me/c/1234567890/123 or https://t.me/+InviteCode"
                        : `https://t.me/${channel?.username?.replace('@', '')}/123`
                    }
                    className="input-glass w-full font-mono text-sm"
                  />

                  {/* Helper text for private channels */}
                  {channel?.username && /^-?\d+$/.test(channel.username) && (
                    <div className="bg-neon-cyan/5 border border-neon-cyan/20 rounded-xl p-4 mt-3">
                      <p className="text-neon-cyan/80 text-xs font-bold tracking-wide mb-2">
                        💡 Private Channel Link:
                      </p>
                      <ul className="text-contentMuted text-xs space-y-2 ml-2 font-mono">
                        <li><span className="opacity-50 mr-2">•</span>Copy a post link from your channel (looks like: t.me/c/1234567890/123)</li>
                        <li><span className="opacity-50 mr-2">•</span>Or use your channel's invite link (looks like: t.me/+AbCdEfGhIjK)</li>
                      </ul>
                    </div>
                  )}
                  
                  {/* Helper text for public channels */}
                  {channel?.username && !/^-?\d+$/.test(channel.username) && (
                    <p className="text-contentMuted text-xs mt-3 flex items-start gap-2">
                      <span className="text-neon-cyan">💡</span> Link must be from your channel (e.g., https://t.me/{channel?.username?.replace('@', '')}/123)
                    </p>
                  )}
                </div>

                <div className="relative z-10">
                  <label className="block text-xs font-bold tracking-widest uppercase text-contentMuted mb-2 ml-1">Call-to-Action</label>
                  <input
                    type="text"
                    value={newPromo.cta}
                    onChange={(e) => setNewPromo({...newPromo, cta: e.target.value})}
                    placeholder="Join Now, Subscribe, Register..."
                    className="input-glass w-full"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-4 relative z-10 border-t border-surfaceBorder">
                  <button
                    onClick={handleAddPromo}
                    className="flex-1 bg-neon-violet/20 border border-neon-violet/50 hover:bg-neon-violet hover:text-white text-neon-violet shadow-[0_0_15px_rgba(138,43,226,0.1)] font-bold py-4 rounded-xl transition-all tracking-wide"
                  >
                    SAVE PROMO
                  </button>
                  <button
                    onClick={() => {
                      setShowPromoForm(false);
                      setNewPromo({ name: '', text: '', image: '', link: '', cta: '' });
                    }}
                    className="flex-1 bg-surface border border-surfaceBorder hover:border-white hover:text-white text-contentMuted font-bold py-4 rounded-xl transition-all tracking-wide"
                  >
                    CANCEL
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Preview Promo Section */}
          {promoMaterials.length > 0 && (
            <div className="glass-panel p-6 sm:p-8 overflow-hidden relative group">
              <div className="absolute top-0 right-0 w-48 h-48 bg-neon-cyan/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none group-hover:bg-neon-cyan/10 transition-colors"></div>
              
              <h2 className="text-xl sm:text-2xl font-heading font-bold text-white mb-4 flex items-center gap-3 relative z-10">
                <span className="text-neon-cyan">👀</span> Preview Promo
              </h2>
              <p className="text-contentMuted text-sm mb-6 relative z-10">
                See how your promo will look when the bot posts it on channels
              </p>

              {previewSuccess && (
                <div className="mb-6 bg-neon-emerald/10 border border-neon-emerald/30 rounded-xl p-4 relative z-10">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="text-neon-emerald" size={20} />
                    <p className="text-neon-emerald font-bold">{previewSuccess}</p>
                  </div>
                </div>
              )}

              <div className="space-y-6 relative z-10">
                <div>
                  <label className="block text-xs font-bold tracking-widest uppercase text-contentMuted mb-3 ml-1">
                    Select Promo to Preview
                  </label>
                  <select
                    value={selectedPreviewPromo}
                    onChange={(e) => setSelectedPreviewPromo(e.target.value)}
                    className="input-glass w-full text-lg cursor-pointer appearance-none"
                  >
                    <option value="" className="bg-charcoal text-contentMuted">Choose a promo...</option>
                    {promoMaterials.map((promo) => (
                      <option key={promo.id} value={promo.id} className="bg-charcoal text-white">
                        {promo.name}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handlePreviewPromo}
                  disabled={!selectedPreviewPromo || previewing}
                  className="w-full bg-neon-cyan/20 border border-neon-cyan/50 hover:bg-neon-cyan hover:text-charcoal hover:shadow-glow-cyan text-neon-cyan font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-3 tracking-widest disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
                >
                  <Send size={20} className={previewing ? "animate-pulse" : ""} />
                  {previewing ? 'SENDING PREVIEW...' : 'SEND PREVIEW TO TELEGRAM'}
                </button>

                <p className="text-contentMuted text-xs text-center font-mono">
                  The preview will be sent to you via the CP Gram bot
                </p>
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="flex flex-col-reverse sm:flex-row gap-4 pt-6">
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full sm:w-1/3 bg-surface border border-surfaceBorder hover:border-white hover:text-white text-contentMuted font-bold py-5 rounded-2xl transition-all tracking-wide"
            >
              CANCEL
            </button>
            <button
              onClick={handleSave}
              disabled={submitting}
              className="w-full sm:w-2/3 bg-neon-cyan/20 border border-neon-cyan/50 hover:bg-neon-cyan hover:text-charcoal hover:shadow-glow-cyan text-neon-cyan font-bold py-5 rounded-2xl transition-all flex items-center justify-center gap-3 text-lg tracking-widest disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <Save size={24} className="group-hover:scale-110 transition-transform" />
              {submitting ? 'SAVING...' : 'SAVE CHANGES'}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}