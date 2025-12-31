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

    if (!newPromo.link.includes(channel?.username.replace('@', '') || '')) {
      setError('Promo link must be from your channel');
      return;
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Edit Channel</h1>
          <p className="text-grey-400">Update your channel settings and preferences</p>
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

        <div className="space-y-8">
          {/* Channel Info (Read-only) */}
          <div className="bg-darkBlue-800 border border-grey-700 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">Channel Information</h2>
            <div className="flex items-start gap-4">
              <ChannelAvatar 
                src={channel.avatar} 
                alt={channel.name}
                className="w-20 h-20"
                channelName={channel.name}
              />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="text-2xl font-bold text-white">{channel.name}</h3>
                    <p className="text-grey-400">{channel.username}</p>
                  </div>
                  {(() => {
                    const isPaused = !!channel.is_paused;
                    const baseStatus = (channel.status || '').toLowerCase();
                    const displayStatus = baseStatus === 'approved' ? (isPaused ? 'Paused' : 'Active') : channel.status;
                    const badgeClass = displayStatus === 'Active' ? 'bg-green-500/20 text-green-300' :
                      displayStatus === 'Paused' ? 'bg-yellow-500/20 text-yellow-300' : 'bg-blue-500/20 text-blue-300';

                    return (
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${badgeClass}`}>
                        {String(displayStatus).toUpperCase()}
                      </span>
                    );
                  })()}
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <p className="text-grey-400 text-sm">Subscribers</p>
                    <p className="text-white font-bold">{channel.subscribers.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-grey-400 text-sm">Topic</p>
                    <p className="text-white font-bold">{channel.topic}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Status Toggle */}
<div className="bg-darkBlue-800 border border-grey-700 rounded-lg p-6">
  <h2 className="text-xl font-bold text-white mb-4">Channel Status</h2>
  <p className="text-grey-400 text-sm mb-4">
    {channel.is_paused
      ? 'Your channel is paused and hidden from the partner listings.'
      : 'Your channel is active and visible to other users for cross-promotions.'
    }
  </p>
  <button
    onClick={handleToggleStatus}
    disabled={submitting}
    className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-all ${
      channel.is_paused
        ? 'bg-green-600 hover:bg-green-700 text-white'
        : 'bg-yellow-600 hover:bg-yellow-700 text-white'
    } disabled:opacity-50 disabled:cursor-not-allowed`}
  >
    {channel.is_paused ? (
      <>
        <Play size={20} />
        Activate Channel
      </>
    ) : (
      <>
        <Pause size={20} />
        Pause Channel
      </>
    )}
  </button>
</div>

          {/* Days Selection */}
          <div className="bg-darkBlue-800 border border-grey-700 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">Accepted Days</h2>
            <div className="flex flex-wrap gap-2">
              {DAYS.map(day => (
                <button
                  key={day}
                  onClick={() => toggleDay(day)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
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
          <div className="bg-darkBlue-800 border border-grey-700 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">Promotions Per Day</h2>
            <select
              value={promosPerDay}
              onChange={(e) => {
                setPromosPerDay(Number(e.target.value));
                setSelectedTimeSlots([]);
              }}
              className="w-full bg-darkBlue-700 border border-grey-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
            >
              {[1, 2, 3, 4, 5].map(num => (
                <option key={num} value={num}>{num}</option>
              ))}
            </select>
          </div>

          {/* Price Settings */}
          <div className="bg-darkBlue-800 border border-grey-700 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">Duration Prices</h2>
            <div className="space-y-3">
              {Object.entries(priceSettings).map(([hours, settings]) => (
                <div key={hours} className="flex items-center gap-4 bg-darkBlue-700 p-4 rounded-lg">
                  <button
                    onClick={() => togglePriceSetting(hours as keyof PriceSettings)}
                    className={`w-12 h-6 rounded-full transition-all relative ${
                      settings.enabled ? 'bg-blue-600' : 'bg-grey-600'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${
                      settings.enabled ? 'right-0.5' : 'left-0.5'
                    }`} />
                  </button>
                  <span className="text-white font-medium w-20">{hours} hours</span>
                  <input
                    type="number"
                    value={settings.price}
                    onChange={(e) => updatePrice(hours as keyof PriceSettings, Number(e.target.value))}
                    disabled={!settings.enabled}
                    placeholder="Price"
                    className="flex-1 bg-darkBlue-600 border border-grey-600 rounded-lg px-4 py-2 text-white disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:border-blue-500"
                  />
                  <span className="text-grey-400">CP</span>
                </div>
              ))}
            </div>
          </div>

          {/* Time Slots */}
          <div className="bg-darkBlue-800 border border-grey-700 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">Available Time Slots (Select {promosPerDay})</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-64 overflow-y-auto p-2 bg-darkBlue-700 rounded-lg">
              {TIME_SLOTS.map(slot => (
                <button
                  key={slot}
                  onClick={() => toggleTimeSlot(slot)}
                  disabled={!selectedTimeSlots.includes(slot) && selectedTimeSlots.length >= promosPerDay}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedTimeSlots.includes(slot)
                      ? 'bg-blue-600 text-white'
                      : 'bg-darkBlue-600 text-grey-400 hover:bg-darkBlue-500 disabled:opacity-30 disabled:cursor-not-allowed'
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>
            <p className="text-grey-400 text-sm mt-2">
              Selected: {selectedTimeSlots.length} / {promosPerDay}
            </p>
          </div>

          {/* Promo Materials */}
          <div className="bg-darkBlue-800 border border-grey-700 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">
              Promo Materials ({promoMaterials.length}/3)
            </h2>

            {promoMaterials.map(promo => (
              <div key={promo.id} className="bg-darkBlue-700 border border-grey-600 rounded-lg p-4 mb-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-white font-bold">{promo.name}</h3>
                  <button
                    onClick={() => removePromo(promo.id)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <X size={20} />
                  </button>
                </div>
                <p className="text-grey-300 text-sm mb-2">{promo.text}</p>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-grey-400">CTA:</span>
                  <span className="text-blue-400">{promo.cta}</span>
                </div>
              </div>
            ))}

            {!showPromoForm && promoMaterials.length < 3 && (
              <button
                onClick={() => setShowPromoForm(true)}
                className="w-full bg-darkBlue-700 border border-grey-600 hover:border-blue-600 text-white font-medium py-3 rounded-lg transition-all flex items-center justify-center gap-2"
              >
                <Plus size={20} />
                Add Promo Material
              </button>
            )}

            {showPromoForm && (
              <div className="bg-darkBlue-700 border border-blue-600/30 rounded-lg p-6 space-y-4">
                <h3 className="text-white font-bold text-lg mb-4">New Promo</h3>
                
                <div>
                  <label className="block text-sm font-medium text-grey-300 mb-2">Promo Name</label>
                  <input
                    type="text"
                    value={newPromo.name}
                    onChange={(e) => setNewPromo({...newPromo, name: e.target.value})}
                    className="w-full bg-darkBlue-600 border border-grey-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-grey-300 mb-2">Promo Text</label>
                  <textarea
                    value={newPromo.text}
                    onChange={(e) => setNewPromo({...newPromo, text: e.target.value})}
                    rows={3}
                    className="w-full bg-darkBlue-600 border border-grey-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-grey-300 mb-2">Promo Image URL</label>
                  <input
                    type="text"
                    value={newPromo.image}
                    onChange={(e) => setNewPromo({...newPromo, image: e.target.value})}
                    placeholder="https://example.com/image.jpg"
                    className="w-full bg-darkBlue-600 border border-grey-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-grey-300 mb-2">Promo Link</label>
                  <input
                    type="text"
                    value={newPromo.link}
                    onChange={(e) => setNewPromo({...newPromo, link: e.target.value})}
                    placeholder={`https://t.me/${channel.username.replace('@', '')}/123`}
                    className="w-full bg-darkBlue-600 border border-grey-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-grey-300 mb-2">Call-to-Action</label>
                  <input
                    type="text"
                    value={newPromo.cta}
                    onChange={(e) => setNewPromo({...newPromo, cta: e.target.value})}
                    placeholder="Join Now, Subscribe, Register..."
                    className="w-full bg-darkBlue-600 border border-grey-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleAddPromo}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-2 rounded-lg transition-all"
                  >
                    Create Promo
                  </button>
                  <button
                    onClick={() => {
                      setShowPromoForm(false);
                      setNewPromo({ name: '', text: '', image: '', link: '', cta: '' });
                    }}
                    className="flex-1 bg-grey-700 hover:bg-grey-600 text-white font-bold py-2 rounded-lg transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Preview Promo Section */}
{promoMaterials.length > 0 && (
  <div className="bg-darkBlue-800 border border-grey-700 rounded-lg p-6">
    <h2 className="text-xl font-bold text-white mb-4">Preview Promo</h2>
    <p className="text-grey-400 text-sm mb-4">
      See how your promo will look when the bot posts it on channels
    </p>

    {previewSuccess && (
      <div className="mb-4 bg-green-600/10 border border-green-600/30 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <CheckCircle className="text-green-400" size={20} />
          <p className="text-green-400">{previewSuccess}</p>
        </div>
      </div>
    )}

    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-grey-300 mb-2">
          Select Promo to Preview
        </label>
        <select
          value={selectedPreviewPromo}
          onChange={(e) => setSelectedPreviewPromo(e.target.value)}
          className="w-full bg-darkBlue-700 border border-grey-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
        >
          <option value="">Choose a promo...</option>
          {promoMaterials.map((promo) => (
            <option key={promo.id} value={promo.id}>
              {promo.name}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={handlePreviewPromo}
        disabled={!selectedPreviewPromo || previewing}
        className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:from-grey-600 disabled:to-grey-700 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
      >
        <Send size={20} />
        {previewing ? 'Sending Preview...' : 'Send Preview to Telegram'}
      </button>

      <p className="text-grey-400 text-xs text-center">
        The preview will be sent to you via the CP Gram bot
      </p>
    </div>
  </div>
)}

          {/* Save Button */}
          <div className="flex gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex-1 bg-grey-700 hover:bg-grey-600 text-white font-bold py-4 rounded-lg transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={submitting}
              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-grey-600 disabled:to-grey-700 text-white font-bold py-4 rounded-lg transition-all flex items-center justify-center gap-2"
            >
              <Save size={20} />
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}