import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';
import ChannelAvatar from '../components/ChannelAvatar';
import { useAuth } from '../hooks/useAuth';
import apiService from '../services/api';
import { Partner } from '../types';
import { Users, ExternalLink } from 'lucide-react';

export default function PartnersPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const fetchPartners = async () => {
      try {
        setLoading(true);
        const data = await apiService.listPartners();
        setPartners(data || []);
      } catch (err) {
        setError('Failed to load partners');
        console.error('Error loading partners:', err);
        setPartners([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPartners();

    // ADDED: Refresh partner data every 5 minutes for live counts
  const refreshInterval = setInterval(() => {
    fetchPartners();
  }, 5 * 60 * 1000); // 5 minutes
  
  // Cleanup interval on unmount
  return () => clearInterval(refreshInterval);
  }, [user, navigate]);

  if (loading || !user) {
    return (
      <Layout>
        <LoadingSpinner />
      </Layout>
    );
  }

  const topics = Array.from(new Set(partners.map(p => p.topic)));
  const filteredPartners = selectedTopic
    ? partners.filter(p => p.topic === selectedTopic)
    : partners;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 pb-32 animate-fade-in-up">
        <div className="mb-10 sm:mb-12">
          <h1 className="text-4xl sm:text-5xl font-heading font-extrabold text-white mb-3 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">Partner Channels</h1>
          <p className="text-contentMuted text-lg font-sans">Browse and connect with channels in your industry</p>
        </div>

        {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

        {/* Topic Filter */}
        {topics.length > 0 && (
          <div className="mb-10 overflow-x-auto pb-4 scrollbar-hide">
            <div className="flex gap-3 min-w-max">
              <button
                onClick={() => setSelectedTopic(null)}
                className={`px-5 py-2.5 rounded-full font-bold tracking-widest text-xs uppercase transition-all ${
                  selectedTopic === null
                    ? 'bg-neon-cyan text-charcoal shadow-[0_0_15px_rgba(0,240,255,0.4)]'
                    : 'bg-surface border border-surfaceBorder text-contentMuted hover:text-white hover:border-contentMuted'
                }`}
              >
                All Topics
              </button>
              {topics.map((topic) => (
                <button
                  key={topic}
                  onClick={() => setSelectedTopic(topic)}
                  className={`px-5 py-2.5 rounded-full font-bold tracking-widest text-xs uppercase transition-all ${
                    selectedTopic === topic
                      ? 'bg-neon-cyan text-charcoal shadow-[0_0_15px_rgba(0,240,255,0.4)]'
                      : 'bg-surface border border-surfaceBorder text-contentMuted hover:text-white hover:border-contentMuted'
                  }`}
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Partners Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredPartners.map((partner, index) => (
            <div
              key={partner.id}
              className="glass-panel group relative overflow-hidden flex flex-col justify-between"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Header */}
              <div className="h-28 bg-gradient-to-br from-neon-cyan/20 to-surface relative border-b border-surfaceBorder/50">
                <div className="absolute -bottom-6 left-6 group-hover:scale-105 transition-transform duration-300">
                  <ChannelAvatar
                    src={partner.avatar}
                    alt={partner.name}
                    className="w-16 h-16 border-4 border-charcoal shadow-lg"
                    channelName={partner.name}
                  />
                </div>
                <div className="absolute top-4 right-4 bg-charcoal/80 backdrop-blur-sm border border-surfaceBorder px-2.5 py-1 rounded text-[10px] font-bold tracking-widest uppercase text-neon-cyan">
                  {partner.topic}
                </div>
              </div>

              {/* Content */}
              <div className="p-6 pt-10 flex flex-col flex-1">
                <div className="mb-5 border-b border-surfaceBorder/50 pb-5">
                  <h3 className="text-xl font-heading font-bold text-white mb-1 truncate">{partner.name}</h3>
                  <div className="flex items-center gap-4 mt-3">
                    <div>
                      <span className="block text-contentMuted text-[10px] uppercase tracking-widest font-bold mb-1">Subscribers</span>
                      <span className="text-white font-mono font-bold">{partner.subs.toLocaleString()}</span>
                    </div>
                    <div className="w-px h-6 bg-surfaceBorder/50"></div>
                    <div>
                      <span className="block text-contentMuted text-[10px] uppercase tracking-widest font-bold mb-1">Language</span>
                      <span className="text-white font-mono font-bold">{partner.lang}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 mb-6 flex-1">
                  <div>
                    <span className="block text-contentMuted text-[10px] uppercase tracking-widest font-bold mb-2">Accepted Days</span>
                    <div className="flex flex-wrap gap-1.5">
                      {partner.acceptedDays.map((day) => (
                        <span
                          key={day}
                          className="bg-neon-violet/10 border border-neon-violet/20 text-neon-violet text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded"
                        >
                          {day.slice(0, 3)}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="block text-contentMuted text-[10px] uppercase tracking-widest font-bold mb-2">Time Slots</span>
                    <div className="flex flex-wrap gap-1.5">
                      {partner.availableTimeSlots.map((slot) => (
                        <span
                          key={slot}
                          className="bg-surface border border-surfaceBorder text-white text-[10px] font-mono px-2 py-1 rounded"
                        >
                          {slot}
                        </span>
                      ))}
                    </div>
                  </div>

                  {Object.keys(partner.durationPrices).length > 0 && (
                    <div>
                      <span className="block text-contentMuted text-[10px] uppercase tracking-widest font-bold mb-2">Pricing</span>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(partner.durationPrices).map(([hours, price]) => (
                          <div
                            key={hours}
                            className="bg-neon-emerald/5 border border-neon-emerald/20 rounded px-2.5 py-1 text-center"
                          >
                            <span className="text-neon-emerald text-[10px] font-bold tracking-widest uppercase mr-1.5">{hours}h</span>
                            <span className="text-white font-mono tracking-tight font-bold">{price} CP</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* View Channel Button */}
                <a
                  href={`https://t.me/${partner.telegram_chat?.replace('@', '') || partner.name}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full btn-secondary py-3 flex items-center justify-center gap-2 group-hover:border-neon-cyan/50 group-hover:text-neon-cyan transition-colors"
                >
                  <ExternalLink size={16} />
                  <span>VIEW CHANNEL</span>
                </a>
              </div>
            </div>
          ))}
        </div>

        {filteredPartners.length === 0 && !loading && (
          <div className="glass-panel p-12 text-center border-dashed border-2 border-surfaceBorder/50 max-w-lg mx-auto mt-12 relative overflow-hidden group mix-blend-screen">
            <div className="absolute inset-0 bg-neon-cyan/5 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            <div className="w-20 h-20 bg-surface border border-surfaceBorder rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(0,0,0,0.3)] mx-auto mb-6 relative z-10 group-hover:border-neon-cyan/50 transition-colors duration-500">
              <Users size={32} className="text-contentMuted group-hover:text-neon-cyan transition-colors duration-500" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-heading font-extrabold text-white mb-3 relative z-10">No Partners Yet</h2>
            <p className="text-contentMuted mb-8 font-sans relative z-10">
              {selectedTopic 
                ? `We couldn't find any partners matching the "${selectedTopic}" category.` 
                : 'Start cross-promoting to build your partner network and discover new creators.'}
            </p>
            <button
              onClick={() => navigate('/send-request')}
              className="btn-primary px-8 py-4 relative z-10 w-full sm:w-auto overflow-hidden group/btn"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-neon-cyan/0 via-neon-cyan/20 to-neon-cyan/0 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-1000"></div>
              <span className="relative z-10 tracking-widest font-bold">SEND YOUR FIRST PROMO</span>
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}