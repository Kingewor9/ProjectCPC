import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import ErrorAlert from '../components/ErrorAlert';
import ChannelAvatar from '../components/ChannelAvatar';
import { useAuth } from '../hooks/useAuth';
import apiService from '../services/api';
import { Plus, X, CheckCircle, AlertCircle, Zap } from 'lucide-react';

interface ChannelInfo {
  name: string;
  username: string;
  avatar: string;
  subscribers: number;
  avgViews24h: number;
  language: string;
  telegram_id: string;
  is_private?: boolean;
}

interface PromoMaterial {
  id: string;
  name: string;
  text: string;
  image: string;
  link: string;
  cta: string;
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

const TOPICS = [
  'Cryptocurrencies', 'Stocks & Forex', 'Sports', 'Health & Lifestyle', 
  'Quotes & Motivation', 'Sales & Marketing', 'Movies', 'Gospel', 'Islam', 
  'Music & Artists', 'Erotic', 'Betting & Casino', 'Memes & Entertainment', 
  'Blogs & News', 'Beauty & Fashion', 'Art & Design', 'Technologies & Applications', 
  'Books & Review', 'Psychology', 'Politics', 'Cars & Automobiles', 'Travel', 
  'Nature & Animals', 'Real Estate', 'Family & Children', 'Telegram', 
  'Knowledge & Facts', 'Home & Architecture', 'Pictures'
];

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

export default function AddChannelPage() {
  const navigate = useNavigate();
  const { user, loading, fetchUser } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);
  
  // Step 1: Channel validation
  const [step, setStep] = useState<'validate' | 'configure'>('validate');
  const [channelInput, setChannelInput] = useState('');
  const [validating, setValidating] = useState(false);
  const [channelInfo, setChannelInfo] = useState<ChannelInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPrivateChannel, setIsPrivateChannel] = useState(false);
  const [privateChannelInstructions, setPrivateChannelInstructions] = useState<string[]>([]);

  
  // Step 2: Configuration
  const [selectedTopic, setSelectedTopic] = useState('');
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
  
  // Promo materials
  const [promoMaterials, setPromoMaterials] = useState<PromoMaterial[]>([]);
  const [showPromoForm, setShowPromoForm] = useState(false);
  const [newPromo, setNewPromo] = useState({
    name: '',
    text: '',
    image: '',
    link: '',
    cta: ''
  });
  
  // Bot connection
  const [botConnected, setBotConnected] = useState(false);
  
  // Submission
  const [submitting, setSubmitting] = useState(false);

  const handleValidateChannel = async () => {
    if (!channelInput.trim()) {
      setError('Please enter a channel link, username or channel ID');
      return;
    }

    setValidating(true);
    setError(null);
    setIsPrivateChannel(false);
    setPrivateChannelInstructions([]);

    try {
      const result = await apiService.validateChannel(channelInput);
      
      if (result.ok && result.channel) {
        setChannelInfo({
          name: result.channel.name,
          username: result.channel.username,
          avatar: result.channel.avatar,
          subscribers: result.channel.subscribers,
          avgViews24h: result.channel.avgViews24h,
          language: result.channel.language,
          telegram_id: result.channel.telegram_id,
          is_private: result.channel.is_private
        });

      // Show notice if it's a private channel
      if (result.channel.is_private) {
        alert('✅ Private channel validated successfully! The bot has admin access.');
      }
 
       setStep('configure');
    }
  } catch (err: any) {
    const errorData = err.response?.data || {};
    
    // Check if this is a private channel error
    if (errorData.is_private_channel) {
      setIsPrivateChannel(true);
      setPrivateChannelInstructions(errorData.instructions || []);
      setError(errorData.error || 'Bot is not admin of this private channel');
    } else {
      setError(errorData.error || err.message || 'Invalid channel. Please check and try again.');
    }
  } finally {
    setValidating(false);
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

     // UPDATED: Skip username validation for private channels
  if (channelInfo?.is_private) {
    // For private channels, just validate it's a Telegram link
    if (!newPromo.link.includes('t.me/')) {
      setError('Promo link must be a valid Telegram link (e.g., https://t.me/c/1234567890/123 or invite link)');
      return;
    }
  } else {
    // For public channels, validate that link matches channel username
    const channelUsername = channelInfo?.username?.replace('@', '') || '';
    if (!newPromo.link.includes(channelUsername)) {
      setError(`Promo link must be from your channel (@${channelUsername})`);
      return;
    }
  }

    if (promoMaterials.length >= 3) {
      setError('Maximum 3 promo materials allowed');
      return;
    }

    const promo: PromoMaterial = {
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

  const handleSubmit = async () => {
    if (!selectedTopic) {
      setError('Please select a topic');
      return;
    }
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
    if (!botConnected) {
      setError('Please connect the bot to your channel');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const channelData = {
        channel_info: channelInfo!,
        topic: selectedTopic,
        selected_days: selectedDays,
        promos_per_day: promosPerDay,
        price_settings: priceSettings as { [key: string]: { enabled: boolean; price: number } },
        time_slots: selectedTimeSlots,
        promo_materials: promoMaterials,
        bot_connected: botConnected
      };

      const result = await apiService.submitChannel(channelData as any);
      
      if (result.ok) {
        // Refresh user data so dashboard shows the newly submitted channel
        try {
          await fetchUser();
        } catch (e) {
          // Ignore fetch errors; still navigate to dashboard
        }
        alert('Channel submitted successfully! Your channel will be moderated within 48-72 hours.');
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit channel. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (step === 'validate') {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-fade-in-up">
          <div className="mb-10 text-center sm:text-left">
            <h1 className="text-4xl sm:text-5xl font-heading font-extrabold text-white mb-3 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">Add Your Channel</h1>
            <p className="text-contentMuted text-lg font-sans">
              Connect your Telegram channel (public or private) to start cross-promoting
            </p>
          </div>

          {error && !isPrivateChannel && (
            <ErrorAlert message={error} onDismiss={() => setError(null)} />
          )}

          {/* Private Channel Instructions */}
          {isPrivateChannel && (
            <div className="glass-panel border-orange-500/30 bg-orange-500/5 p-8 mb-8 shadow-glow-orange">
              <div className="flex items-start gap-4 mb-6">
                <div className="p-3 bg-orange-500/10 rounded-xl">
                  <AlertCircle className="text-orange-400 flex-shrink-0" size={28} />
                </div>
                <div>
                  <h3 className="text-orange-400 font-heading font-bold text-xl mb-2">
                    Private Channel Detected
                  </h3>
                  <p className="text-contentMuted text-sm leading-relaxed">
                    {error}
                  </p>
                </div>
              </div>
              
              <div className="bg-surface border border-surfaceBorder rounded-xl p-6 mb-6">
                <p className="text-white font-bold mb-4 font-heading flex items-center gap-2">
                  <span className="text-xl">📋</span> Follow these steps:
                </p>
                <ol className="space-y-3 text-contentMuted text-sm font-sans list-none">
                  {privateChannelInstructions.map((instruction, index) => (
                    <li key={index} className="flex gap-3 items-start">
                      <span className="text-neon-cyan font-mono font-bold mt-0.5">{index + 1}.</span>
                      <span className="leading-relaxed">{instruction}</span>
                    </li>
                  ))}
                </ol>
              </div>
              
              <div className="p-5 bg-neon-cyan/5 border border-neon-cyan/20 rounded-xl">
                <p className="text-neon-cyan/90 text-sm mb-3">
                  <strong>💡 How to find your Channel ID:</strong>
                </p>
                <ol className="space-y-2 text-contentMuted text-sm ml-2 list-none">
                  <li className="flex gap-2"><span className="text-neon-cyan opacity-70 mt-0.5">•</span> Forward any message from your channel to <span className="text-neon-cyan font-mono bg-neon-cyan/10 px-1.5 py-0.5 rounded">@userinfobot</span></li>
                  <li className="flex gap-2"><span className="text-neon-cyan opacity-70 mt-0.5">•</span> The bot will reply with your channel ID (looks like: -1001234567890)</li>
                  <li className="flex gap-2"><span className="text-neon-cyan opacity-70 mt-0.5">•</span> Copy that ID and paste it here</li>
                </ol>
              </div>
            </div>
          )}

          <div className="glass-panel p-8 sm:p-10 relative overflow-hidden group hover:shadow-glow-cyan transition-all duration-500 border-neon-cyan/20">
            <div className="absolute top-0 right-0 w-64 h-64 bg-neon-cyan/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 group-hover:bg-neon-cyan/10 transition-colors pointer-events-none"></div>
            
            <div className="relative z-10">
              <label className="block text-sm font-bold tracking-widest uppercase text-contentMuted mb-4 ml-1">
                Channel Link, Username, or Channel ID
              </label>
              <input
                type="text"
                value={channelInput}
                onChange={(e) => setChannelInput(e.target.value)}
                placeholder="@yourchannel, https://t.me/yourchannel, or -1001234567890"
                className="input-glass w-full text-lg mb-6 py-4"
              />
              
              <div className="bg-neon-cyan/5 border border-neon-cyan/20 rounded-xl p-5 mb-8">
                <p className="text-neon-cyan/80 text-sm mb-3 font-bold tracking-wide">
                  Supported formats:
                </p>
                <ul className="text-contentMuted text-sm space-y-2 ml-2 font-mono">
                  <li><span className="opacity-50 mr-2">•</span><span className="text-neon-cyan">@yourchannel</span> <span className="text-xs opacity-70 sans-serif">(public)</span></li>
                  <li><span className="opacity-50 mr-2">•</span><span className="text-neon-cyan">https://t.me/yourchannel</span> <span className="text-xs opacity-70 sans-serif">(public)</span></li>
                  <li><span className="opacity-50 mr-2">•</span><span className="text-neon-cyan">-1001234567890</span> <span className="text-xs opacity-70 sans-serif">(private - requires bot admin)</span></li>
                </ul>
              </div>
              
              <button
                onClick={handleValidateChannel}
                disabled={validating}
                className="btn-primary w-full text-lg py-4 block text-center"
              >
                {validating ? 'VALIDATING...' : 'VALIDATE CHANNEL'}
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }
  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 pb-32 md:pb-12 animate-fade-in-up">
        <div className="mb-10 sm:mb-12 text-center sm:text-left">
          <h1 className="text-4xl sm:text-5xl font-heading font-extrabold text-white mb-3 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">Configure Your Channel</h1>
          <p className="text-contentMuted text-lg font-sans">Set up your channel details and preferences</p>
        </div>

        {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

        <div className="space-y-8 sm:space-y-12">
          {/* Channel Info Display */}
          {channelInfo && (
            <div className="glass-panel p-6 sm:p-8 border-neon-emerald/30 shadow-[0_0_20px_rgba(0,255,157,0.1)] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-neon-emerald/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
              
              <h2 className="text-xl sm:text-2xl font-heading font-bold text-white mb-6 flex items-center gap-3 relative z-10">
                <CheckCircle className="text-neon-emerald drop-shadow-[0_0_8px_rgba(0,255,157,0.5)]" size={24} />
                Channel Verified
              </h2>
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10">
                <div className="p-2 bg-surface border border-surfaceBorder rounded-2xl shadow-lg flex-shrink-0">
                  <ChannelAvatar 
                    src={channelInfo.avatar} 
                    alt={channelInfo.name}
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl"
                    channelName={channelInfo.name}
                  />
                </div>
                <div className="flex-1 w-full text-center sm:text-left mt-2 sm:mt-0">
                  <h3 className="text-2xl sm:text-3xl font-heading font-bold text-white mb-1 group-hover:text-neon-cyan transition-colors">{channelInfo.name}</h3>
                  <p className="text-contentMuted mb-6 font-mono tracking-wide">{channelInfo.username}</p>
                  
                  <div className="grid grid-cols-3 gap-4 bg-charcoal/50 rounded-xl p-4 border border-surfaceBorder/50">
                    <div>
                      <p className="text-contentMuted text-xs font-bold tracking-widest uppercase mb-1">Subscribers</p>
                      <p className="text-neon-cyan font-mono font-bold text-lg sm:text-xl drop-shadow-[0_0_5px_rgba(0,240,255,0.3)]">{channelInfo.subscribers.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-contentMuted text-xs font-bold tracking-widest uppercase mb-1">Avg 24h Views</p>
                      <p className="text-neon-violet font-mono font-bold text-lg sm:text-xl drop-shadow-[0_0_5px_rgba(138,43,226,0.3)]">{channelInfo.avgViews24h.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-contentMuted text-xs font-bold tracking-widest uppercase mb-1">Language</p>
                      <p className="text-white font-bold text-base sm:text-lg">{channelInfo.language}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Topic Selection */}
          <div className="glass-panel p-6 sm:p-8">
            <h2 className="text-xl sm:text-2xl font-heading font-bold text-white mb-6 flex items-center gap-3">
              <span className="text-neon-cyan">#</span> Channel Topic
            </h2>
            <label className="block text-sm font-bold tracking-widest uppercase text-contentMuted mb-4 ml-1">
              Select the topic your channel falls under
            </label>
            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="input-glass w-full text-lg cursor-pointer appearance-none"
            >
              <option value="" className="bg-charcoal text-contentMuted">Choose a topic</option>
              {TOPICS.map(topic => (
                <option key={topic} value={topic} className="bg-charcoal text-white">{topic}</option>
              ))}
            </select>
          </div>

          {/* Cross Promotion Settings */}
          <div className="glass-panel p-6 sm:p-8">
            <h2 className="text-xl sm:text-2xl font-heading font-bold text-white mb-8 flex items-center gap-3">
              <Zap className="text-neon-violet" size={24} />
              Cross Promotion Settings
            </h2>
            
            {/* Days Selection */}
            <div className="mb-10">
              <label className="block text-sm font-bold tracking-widest uppercase text-contentMuted mb-4 ml-1">
                Accepted Days
              </label>
              <div className="flex flex-wrap gap-3">
                {DAYS.map(day => (
                  <button
                    key={day}
                    onClick={() => toggleDay(day)}
                    className={`px-5 py-3 rounded-xl font-mono font-bold tracking-wide transition-all duration-300 ${
                      selectedDays.includes(day)
                        ? 'bg-neon-violet/20 border border-neon-violet/50 text-neon-violet shadow-[0_0_15px_rgba(138,43,226,0.2)]'
                        : 'bg-surface border border-surfaceBorder text-contentMuted hover:border-neon-violet/30 hover:text-white'
                    }`}
                  >
                    {day.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>

            {/* Promos Per Day */}
            <div className="mb-10">
              <label className="block text-sm font-bold tracking-widest uppercase text-contentMuted mb-4 ml-1">
                Cross promotions per day
              </label>
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
            <div className="mb-10">
              <label className="block text-sm font-bold tracking-widest uppercase text-contentMuted mb-4 ml-1">
                Price (CP Coins) per duration
              </label>
              
              {/* Price range info */}
              <div className="bg-neon-cyan/5 border border-neon-cyan/20 rounded-xl p-4 mb-6">
                <p className="text-neon-cyan/80 text-sm font-mono">
                  <strong className="text-neon-cyan mr-2">💰 RANGE:</strong> Min {MIN_PRICE.toLocaleString()} CP - Max {MAX_PRICE.toLocaleString()} CP
                </p>
              </div>
              
              <div className="space-y-4">
                {Object.entries(priceSettings).map(([hours, settings]) => {
                  const isInvalidPrice = settings.enabled && (settings.price < MIN_PRICE || settings.price > MAX_PRICE);
                  
                  return (
                    <div key={hours}>
                      <div className={`flex flex-col sm:flex-row items-start sm:items-center gap-4 p-5 rounded-xl transition-all duration-300 ${settings.enabled ? 'bg-surface border border-neon-cyan/30 shadow-[0_0_15px_rgba(0,240,255,0.05)]' : 'bg-surface/50 border border-surfaceBorder opacity-70'}`}>
                        <div className="flex items-center gap-4 min-w-[120px]">
                          <button
                            onClick={() => togglePriceSetting(hours as keyof PriceSettings)}
                            className={`w-12 h-6 rounded-full transition-all relative flex-shrink-0 border ${
                              settings.enabled ? 'bg-neon-cyan/20 border-neon-cyan text-neon-cyan shadow-[0_0_10px_rgba(0,240,255,0.3)]' : 'bg-charcoal border-surfaceBorder'
                            }`}
                          >
                            <div className={`w-5 h-5 bg-white rounded-full absolute top-[1px] transition-all shadow-md ${
                              settings.enabled ? 'right-[1px] bg-neon-cyan' : 'left-[1px] bg-contentMuted'
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
                              isInvalidPrice ? 'border-red-500/50 focus:border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.2)]' : 'border-surfaceBorder focus:border-neon-cyan focus:shadow-[0_0_15px_rgba(0,240,255,0.15)]'
                            } rounded-xl px-4 py-3 text-white font-mono disabled:opacity-50 disabled:cursor-not-allowed`}
                          />
                          <span className="text-neon-cyan font-bold tracking-widest">CP</span>
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
            <div>
              <label className="block text-sm font-bold tracking-widest uppercase text-contentMuted mb-4 ml-1">
                Time Slots <span className="text-neon-cyan ml-2 text-xs">({selectedTimeSlots.length}/{promosPerDay})</span>
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 p-4 bg-surface border border-surfaceBorder rounded-xl max-h-72 overflow-y-auto custom-scrollbar">
                {TIME_SLOTS.map(slot => (
                  <button
                    key={slot}
                    onClick={() => toggleTimeSlot(slot)}
                    disabled={!selectedTimeSlots.includes(slot) && selectedTimeSlots.length >= promosPerDay}
                    className={`px-2 py-3 rounded-lg text-xs font-mono font-bold tracking-wide transition-all ${
                      selectedTimeSlots.includes(slot)
                        ? 'bg-neon-emerald/20 border border-neon-emerald/50 text-neon-emerald shadow-[0_0_10px_rgba(0,255,157,0.2)]'
                        : 'bg-charcoal border border-surfaceBorder text-contentMuted hover:border-neon-emerald/30 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed'
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Promo Materials */}
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
                <div key={promo.id} className="bg-surface border border-surfaceBorder hover:border-neon-cyan/30 rounded-xl p-6 transition-all group">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-white font-heading font-bold text-lg group-hover:text-neon-cyan transition-colors">{promo.name}</h3>
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
                    <span className="text-neon-cyan font-mono font-bold text-sm tracking-wide">{promo.cta}</span>
                  </div>
                </div>
              ))}
            </div>

            {!showPromoForm && promoMaterials.length < 3 && (
              <button
                onClick={() => setShowPromoForm(true)}
                className="w-full bg-surface border border-surfaceBorder border-dashed hover:border-neon-cyan/50 hover:bg-neon-cyan/5 text-contentMuted hover:text-white py-5 rounded-xl transition-all flex items-center justify-center gap-3 font-bold tracking-wide"
              >
                <Plus className="text-neon-cyan" size={24} />
                ADD PROMO MATERIAL
              </button>
            )}

            {showPromoForm && (
              <div className="bg-surface border border-neon-cyan/30 rounded-xl p-6 sm:p-8 space-y-6 relative overflow-hidden shadow-[0_0_20px_rgba(0,240,255,0.05)]">
                <div className="absolute top-0 right-0 w-32 h-32 bg-neon-cyan/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                
                <h3 className="text-white font-heading font-bold text-xl mb-6 relative z-10 flex items-center gap-2">
                  <span className="w-2 h-6 bg-neon-cyan rounded-full inline-block"></span>
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
                      channelInfo?.is_private 
                        ? "https://t.me/c/1234567890/123 or https://t.me/+AbCdEfGhIjK"
                        : `https://t.me/${channelInfo?.username?.replace('@', '') || 'channel'}/123`
                    }
                    className="input-glass w-full font-mono text-sm"
                  />
                  {channelInfo?.is_private ? (
                    <p className="text-contentMuted text-xs mt-3 flex items-start gap-2">
                      <span className="text-neon-cyan">💡</span> For private channels, use a post link from your channel or an invite link
                    </p>
                  ) : (
                    <p className="text-contentMuted text-xs mt-3 flex items-start gap-2">
                      <span className="text-neon-cyan">💡</span> Link must be from your channel (e.g., https://t.me/{channelInfo?.username?.replace('@', '') || 'channel'}/123)
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
                    className="flex-1 bg-neon-cyan/20 border border-neon-cyan/50 hover:bg-neon-cyan hover:text-charcoal text-neon-cyan font-bold py-4 rounded-xl transition-all tracking-wide"
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

          {/* Bot Connection */}
          <div className="glass-panel p-6 sm:p-8">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl sm:text-2xl font-heading font-bold text-white flex items-center gap-3">
                <span className="text-2xl">🤖</span> Connect Bot
              </h2>
              <button
                onClick={() => setBotConnected(!botConnected)}
                className={`w-14 h-7 rounded-full transition-all relative border ${
                  botConnected ? 'bg-neon-emerald/20 border-neon-emerald shadow-[0_0_15px_rgba(0,255,157,0.3)]' : 'bg-charcoal border-surfaceBorder'
                }`}
              >
                <div className={`w-6 h-6 bg-white rounded-full absolute top-[1px] transition-all shadow-md ${
                  botConnected ? 'right-[1px] bg-neon-emerald' : 'left-[1px] bg-contentMuted'
                }`} />
              </button>
            </div>

            {botConnected && (
              <div className="mt-8 bg-neon-cyan/5 border border-neon-cyan/20 rounded-xl p-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-neon-cyan/10 rounded-full blur-2xl opacity-50 pointer-events-none"></div>
                <div className="flex items-start gap-4 relative z-10">
                  <div className="p-3 bg-neon-cyan/10 rounded-xl">
                    <AlertCircle className="text-neon-cyan flex-shrink-0" size={24} />
                  </div>
                  <div className="space-y-4">
                    <p className="font-bold text-white text-lg font-heading">Follow these steps:</p>
                    <ol className="space-y-3 font-sans list-none text-contentMuted">
                      <li className="flex gap-3"><span className="text-neon-cyan font-mono font-bold">1.</span> Search for <span className="text-neon-cyan bg-neon-cyan/10 px-2 py-0.5 rounded font-mono font-bold">@cp_grambot</span> on Telegram</li>
                      <li className="flex gap-3"><span className="text-neon-cyan font-mono font-bold">2.</span> Add the bot to your channel as an admin</li>
                      <li className="flex gap-3"><span className="text-neon-cyan font-mono font-bold">3.</span> Grant permissions to post and edit messages</li>
                      <li className="flex gap-3"><span className="text-neon-cyan font-mono font-bold">4.</span> The bot will automatically verify the connection</li>
                    </ol>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Submit Button */}
          <div className="pt-6">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-neon-cyan/20 border border-neon-cyan/50 hover:bg-neon-cyan hover:text-charcoal hover:shadow-glow-cyan text-neon-cyan font-bold py-6 rounded-2xl transition-all flex items-center justify-center gap-3 text-lg tracking-widest disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <CheckCircle size={24} className="group-hover:scale-110 transition-transform" />
              {submitting ? 'SUBMITTING...' : 'SAVE CHANNEL DETAILS'}
            </button>
            
            <p className="text-contentMuted text-sm text-center mt-6 font-mono font-bold mb-8">
              Your channel will be moderated within 48-72 hours after submission
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}