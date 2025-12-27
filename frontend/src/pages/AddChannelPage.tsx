import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import ErrorAlert from '../components/ErrorAlert';
import ChannelAvatar from '../components/ChannelAvatar';
import { useAuth } from '../hooks/useAuth';
import apiService from '../services/api';
import { Plus, X, CheckCircle, AlertCircle} from 'lucide-react';

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

    // Validate that promo link matches channel
    if (!newPromo.link.includes(channelInfo?.username.replace('@', '') || '')) {
      setError('Promo link must be from your channel');
      return;
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
   // Update the validation UI section:
return (
  <Layout>
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Add Your Channel</h1>
        <p className="text-grey-400 text-sm sm:text-base">
          Connect your Telegram channel (public or private) to start cross-promoting
        </p>
      </div>

      {error && !isPrivateChannel && (
        <ErrorAlert message={error} onDismiss={() => setError(null)} />
      )}

      {/* Private Channel Instructions */}
      {isPrivateChannel && (
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-6 mb-6">
          <div className="flex items-start gap-3 mb-4">
            <AlertCircle className="text-orange-400 flex-shrink-0 mt-1" size={24} />
            <div>
              <h3 className="text-orange-400 font-bold text-lg mb-2">
                Private Channel Detected
              </h3>
              <p className="text-grey-300 text-sm mb-4">
                {error}
              </p>
            </div>
          </div>
          
          <div className="bg-darkBlue-800 rounded-lg p-4">
            <p className="text-white font-medium mb-3">📋 Follow these steps:</p>
            <ol className="space-y-2 text-grey-300 text-sm">
              {privateChannelInstructions.map((instruction, index) => (
                <li key={index} className="flex gap-2">
                  <span className="text-blue-400 font-bold">{index + 1}.</span>
                  <span>{instruction}</span>
                </li>
              ))}
            </ol>
          </div>
          
          <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p className="text-blue-300 text-sm">
              <strong>💡 How to find your Channel ID:</strong>
            </p>
            <ol className="mt-2 space-y-1 text-grey-300 text-sm ml-4 list-decimal">
              <li>Forward any message from your channel to <span className="text-blue-400 font-mono">@userinfobot</span></li>
              <li>The bot will reply with your channel ID (looks like: -1001234567890)</li>
              <li>Copy that ID and paste it here</li>
            </ol>
          </div>
        </div>
      )}

      <div className="bg-darkBlue-800 border border-grey-700 rounded-lg p-6 sm:p-8">
        <label className="block text-sm font-medium text-grey-300 mb-3">
          Channel Link, Username, or Channel ID
        </label>
        <input
          type="text"
          value={channelInput}
          onChange={(e) => setChannelInput(e.target.value)}
          placeholder="@yourchannel, https://t.me/yourchannel, or -1001234567890"
          className="w-full bg-darkBlue-700 border border-grey-600 rounded-lg px-4 py-3 text-white placeholder-grey-500 focus:outline-none focus:border-blue-500 mb-4 text-sm sm:text-base"
        />
        
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-4">
          <p className="text-blue-300 text-sm mb-2">
            <strong>Supported formats:</strong>
          </p>
          <ul className="text-grey-300 text-sm space-y-1 ml-4">
            <li>• <span className="text-blue-400 font-mono">@yourchannel</span> (public channels)</li>
            <li>• <span className="text-blue-400 font-mono">https://t.me/yourchannel</span> (public channels)</li>
            <li>• <span className="text-blue-400 font-mono">-1001234567890</span> (private channels - requires bot admin)</li>
          </ul>
        </div>
        
        <button
          onClick={handleValidateChannel}
          disabled={validating}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-grey-600 disabled:to-grey-700 text-white font-bold py-3 rounded-lg transition-all"
        >
          {validating ? 'Validating...' : 'Validate Channel'}
        </button>
      </div>
    </div>
  </Layout>
);
  }
return (
    <Layout>
      {/* Added pb-20 for mobile and md:pb-8 for desktop to account for bottom nav */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-32 md:pb-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2">Configure Your Channel</h1>
          <p className="text-grey-400 text-sm sm:text-base">Set up your channel details and preferences</p>
        </div>

        {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

        <div className="space-y-6 sm:space-y-8">
          {/* Channel Info Display */}
          {channelInfo && (
            <div className="bg-darkBlue-800 border border-grey-700 rounded-lg p-4 sm:p-6">
              <h2 className="text-base sm:text-lg md:text-xl font-bold text-white mb-4 flex items-center gap-2">
                <CheckCircle className="text-green-400" size={20} />
                Channel Verified
              </h2>
              <div className="flex flex-col sm:flex-row items-start gap-4">
                <ChannelAvatar 
                  src={channelInfo.avatar} 
                  alt={channelInfo.name}
                  className="w-16 h-16 sm:w-20 sm:h-20"
                  channelName={channelInfo.name}
                />
                <div className="flex-1 w-full">
                  <h3 className="text-xl sm:text-2xl font-bold text-white">{channelInfo.name}</h3>
                  <p className="text-grey-400 mb-3 sm:mb-4 text-sm sm:text-base">{channelInfo.username}</p>
                  <div className="grid grid-cols-3 gap-3 sm:gap-4">
                    <div>
                      <p className="text-grey-400 text-xs sm:text-sm">Subscribers</p>
                      <p className="text-white font-bold text-sm sm:text-base">{channelInfo.subscribers.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-grey-400 text-xs sm:text-sm">Avg 24h Views</p>
                      <p className="text-white font-bold text-sm sm:text-base">{channelInfo.avgViews24h.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-grey-400 text-xs sm:text-sm">Language</p>
                      <p className="text-white font-bold text-sm sm:text-base">{channelInfo.language}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Topic Selection */}
          <div className="bg-darkBlue-800 border border-grey-700 rounded-lg p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-bold text-white mb-4">Channel Topic</h2>
            <label className="block text-sm font-medium text-grey-300 mb-2">
              Select the topic your channel falls under
            </label>
            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="w-full bg-darkBlue-700 border border-grey-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 text-sm sm:text-base"
            >
              <option value="">Choose a topic</option>
              {TOPICS.map(topic => (
                <option key={topic} value={topic}>{topic}</option>
              ))}
            </select>
          </div>

          {/* Cross Promotion Settings */}
          <div className="bg-darkBlue-800 border border-grey-700 rounded-lg p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-bold text-white mb-4 sm:mb-6">Cross Promotion Settings</h2>
            
            {/* Days Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-grey-300 mb-3">
                Accepted Days
              </label>
              <div className="flex flex-wrap gap-2">
                {DAYS.map(day => (
                  <button
                    key={day}
                    onClick={() => toggleDay(day)}
                    className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                      selectedDays.includes(day)
                        ? 'bg-blue-600 text-white'
                        : 'bg-darkBlue-700 text-grey-400 hover:bg-darkBlue-600'
                    }`}
                  >
                    {day.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>

            {/* Promos Per Day */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-grey-300 mb-2">
                How many cross promotions do you accept per day?
              </label>
              <select
                value={promosPerDay}
                onChange={(e) => {
                  setPromosPerDay(Number(e.target.value));
                  setSelectedTimeSlots([]);
                }}
                className="w-full bg-darkBlue-700 border border-grey-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 text-sm sm:text-base"
              >
                {[1, 2, 3, 4, 5].map(num => (
                  <option key={num} value={num}>{num}</option>
                ))}
              </select>
            </div>

            {/* Price Settings */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-grey-300 mb-3">
                Set your price (in CP coins) per duration
              </label>
              <div className="space-y-3">
                {Object.entries(priceSettings).map(([hours, settings]) => (
                  <div key={hours} className="flex items-center gap-2 sm:gap-4 bg-darkBlue-700 p-3 sm:p-4 rounded-lg">
                    <button
                      onClick={() => togglePriceSetting(hours as keyof PriceSettings)}
                      className={`w-10 h-5 sm:w-12 sm:h-6 rounded-full transition-all relative flex-shrink-0 ${
                        settings.enabled ? 'bg-blue-600' : 'bg-grey-600'
                      }`}
                    >
                      <div className={`w-4 h-4 sm:w-5 sm:h-5 bg-white rounded-full absolute top-0.5 transition-all ${
                        settings.enabled ? 'right-0.5' : 'left-0.5'
                      }`} />
                    </button>
                    <span className="text-white font-medium w-16 sm:w-20 text-sm sm:text-base">{hours} hours</span>
                    <input
                      type="number"
                      value={settings.price}
                      onChange={(e) => updatePrice(hours as keyof PriceSettings, Number(e.target.value))}
                      disabled={!settings.enabled}
                      placeholder="Price"
                      className="flex-1 bg-darkBlue-600 border border-grey-600 rounded-lg px-3 sm:px-4 py-2 text-white disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:border-blue-500 text-sm sm:text-base"
                    />
                    <span className="text-grey-400 text-sm sm:text-base">CP</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Time Slots */}
            <div>
              <label className="block text-sm font-medium text-grey-300 mb-3">
                Available Time Slots (Select {promosPerDay})
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-64 overflow-y-auto p-2 bg-darkBlue-700 rounded-lg">
                {TIME_SLOTS.map(slot => (
                  <button
                    key={slot}
                    onClick={() => toggleTimeSlot(slot)}
                    disabled={!selectedTimeSlots.includes(slot) && selectedTimeSlots.length >= promosPerDay}
                    className={`px-2 py-2 rounded-lg text-[11px] sm:text-xs md:text-sm font-medium transition-all ${
                      selectedTimeSlots.includes(slot)
                        ? 'bg-blue-600 text-white'
                        : 'bg-darkBlue-600 text-grey-400 hover:bg-darkBlue-500 disabled:opacity-30 disabled:cursor-not-allowed'
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
              <p className="text-grey-400 text-xs sm:text-sm mt-2">
                Selected: {selectedTimeSlots.length} / {promosPerDay}
              </p>
            </div>
          </div>

          {/* Promo Materials */}
          <div className="bg-darkBlue-800 border border-grey-700 rounded-lg p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-bold text-white mb-4">
              Promo Materials ({promoMaterials.length}/3)
            </h2>

            {promoMaterials.map(promo => (
              <div key={promo.id} className="bg-darkBlue-700 border border-grey-600 rounded-lg p-4 mb-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-white font-bold text-sm sm:text-base">{promo.name}</h3>
                  <button
                    onClick={() => removePromo(promo.id)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <X size={20} />
                  </button>
                </div>
                <p className="text-grey-300 text-xs sm:text-sm mb-2">{promo.text}</p>
                <div className="flex items-center gap-2 text-xs sm:text-sm">
                  <span className="text-grey-400">CTA:</span>
                  <span className="text-blue-400">{promo.cta}</span>
                </div>
              </div>
            ))}

            {!showPromoForm && promoMaterials.length < 3 && (
              <button
                onClick={() => setShowPromoForm(true)}
                className="w-full bg-darkBlue-700 border border-grey-600 hover:border-blue-600 text-white font-medium py-3 rounded-lg transition-all flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                <Plus size={20} />
                Add Promo Material
              </button>
            )}

            {showPromoForm && (
              <div className="bg-darkBlue-700 border border-blue-600/30 rounded-lg p-4 sm:p-6 space-y-4">
                <h3 className="text-white font-bold text-base sm:text-lg mb-4">New Promo</h3>
                
                <div>
                  <label className="block text-sm font-medium text-grey-300 mb-2">Promo Name</label>
                  <input
                    type="text"
                    value={newPromo.name}
                    onChange={(e) => setNewPromo({...newPromo, name: e.target.value})}
                    className="w-full bg-darkBlue-600 border border-grey-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 text-sm sm:text-base"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-grey-300 mb-2">Promo Text</label>
                  <textarea
                    value={newPromo.text}
                    onChange={(e) => setNewPromo({...newPromo, text: e.target.value})}
                    rows={3}
                    className="w-full bg-darkBlue-600 border border-grey-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 text-sm sm:text-base"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-grey-300 mb-2">Promo Image URL</label>
                  <input
                    type="text"
                    value={newPromo.image}
                    onChange={(e) => setNewPromo({...newPromo, image: e.target.value})}
                    placeholder="https://example.com/image.jpg"
                    className="w-full bg-darkBlue-600 border border-grey-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 text-sm sm:text-base"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-grey-300 mb-2">Promo Link</label>
                  <input
                    type="text"
                    value={newPromo.link}
                    onChange={(e) => setNewPromo({...newPromo, link: e.target.value})}
                    placeholder={`https://t.me/${channelInfo?.username.replace('@', '')}/123`}
                    className="w-full bg-darkBlue-600 border border-grey-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 text-sm sm:text-base"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-grey-300 mb-2">Call-to-Action</label>
                  <input
                    type="text"
                    value={newPromo.cta}
                    onChange={(e) => setNewPromo({...newPromo, cta: e.target.value})}
                    placeholder="Join Now, Subscribe, Register..."
                    className="w-full bg-darkBlue-600 border border-grey-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 text-sm sm:text-base"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleAddPromo}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-2 rounded-lg transition-all text-sm sm:text-base"
                  >
                    Create Promo
                  </button>
                  <button
                    onClick={() => {
                      setShowPromoForm(false);
                      setNewPromo({ name: '', text: '', image: '', link: '', cta: '' });
                    }}
                    className="flex-1 bg-grey-700 hover:bg-grey-600 text-white font-bold py-2 rounded-lg transition-all text-sm sm:text-base"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bot Connection */}
          <div className="bg-darkBlue-800 border border-grey-700 rounded-lg p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-white">Connect Bot</h2>
              <button
                onClick={() => setBotConnected(!botConnected)}
                className={`w-10 h-5 sm:w-12 sm:h-6 rounded-full transition-all relative ${
                  botConnected ? 'bg-green-600' : 'bg-grey-600'
                }`}
              >
                <div className={`w-4 h-4 sm:w-5 sm:h-5 bg-white rounded-full absolute top-0.5 transition-all ${
                  botConnected ? 'right-0.5' : 'left-0.5'
                }`} />
              </button>
            </div>

            {botConnected && (
              <div className="bg-blue-600/10 border border-blue-600/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="text-blue-400 flex-shrink-0 mt-1" size={20} />
                  <div className="text-xs sm:text-sm text-grey-300 space-y-2">
                    <p className="font-medium text-white">Follow these steps:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Search for <span className="text-blue-400 font-mono">@cp_grambot</span> on Telegram</li>
                      <li>Add the bot to your channel as an admin</li>
                      <li>Grant permissions to post and edit messages</li>
                      <li>The bot will automatically verify the connection</li>
                    </ol>
                  </div>
                </div>
              </div>
            )}
          </div> 
          
          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-grey-600 disabled:to-grey-700 text-white font-bold py-4 rounded-lg transition-all flex items-center justify-center gap-2"
          >
            <CheckCircle size={20} />
            {submitting ? 'Submitting...' : 'Save Channel Details'}
          </button>

          <p className="text-grey-400 text-sm text-center">
            Your channel will be moderated within 48-72 hours after submission
          </p>
        </div>
      </div>
    </Layout>
  );
}