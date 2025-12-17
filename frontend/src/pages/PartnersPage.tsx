import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Partner Channels</h1>
          <p className="text-grey-400">Browse and connect with channels in your industry</p>
        </div>

        {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

        {/* Topic Filter */}
        {topics.length > 0 && (
          <div className="mb-8">
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setSelectedTopic(null)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedTopic === null
                    ? 'bg-blue-600 text-white'
                    : 'bg-darkBlue-700 text-grey-300 hover:text-white'
                }`}
              >
                All Topics
              </button>
              {topics.map((topic) => (
                <button
                  key={topic}
                  onClick={() => setSelectedTopic(topic)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    selectedTopic === topic
                      ? 'bg-blue-600 text-white'
                      : 'bg-darkBlue-700 text-grey-300 hover:text-white'
                  }`}
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Partners Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPartners.map((partner) => (
            <div
              key={partner.id}
              className="bg-darkBlue-800 border border-grey-700 rounded-lg overflow-hidden hover:border-blue-500 transition-all group"
            >
              {/* Header */}
              <div className="h-32 bg-gradient-to-br from-blue-600/20 to-darkBlue-700 relative">
                <img
                  src={partner.avatar}
                  alt={partner.name}
                  className="absolute bottom-4 left-4 w-16 h-16 rounded-lg border-2 border-darkBlue-800 group-hover:scale-105 transition-transform"
                />
              </div>

              {/* Content */}
              <div className="p-6 pt-8">
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-white">{partner.name}</h3>
                  <p className="text-blue-400 text-sm font-medium">{partner.topic}</p>
                </div>

                {/* Stats */}
                <div className="space-y-3 mb-6 py-4 border-y border-grey-700">
                  <div className="flex justify-between text-sm">
                    <span className="text-grey-400">Subscribers</span>
                    <span className="text-white font-bold">{partner.subs.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-grey-400">Language</span>
                    <span className="text-white font-bold">{partner.lang}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-grey-400">Cross-Exchanges</span>
                    <span className="text-white font-bold">{partner.xExchanges}</span>
                  </div>
                </div>

                {/* Days & Times */}
                <div className="mb-4">
                  <p className="text-xs text-grey-400 font-medium mb-2">ACCEPTED DAYS</p>
                  <div className="flex flex-wrap gap-2">
                    {partner.acceptedDays.map((day) => (
                      <span
                        key={day}
                        className="bg-blue-600/20 text-blue-300 text-xs px-2 py-1 rounded"
                      >
                        {day.slice(0, 3)}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mb-6">
                  <p className="text-xs text-grey-400 font-medium mb-2">TIME SLOTS</p>
                  <div className="space-y-1">
                    {partner.availableTimeSlots.map((slot) => (
                      <div key={slot} className="text-xs text-grey-300">
                        {slot}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pricing */}
                <div className="mb-6">
                  <p className="text-xs text-grey-400 font-medium mb-2">PRICING</p>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(partner.durationPrices).map(([hours, price]) => (
                      <div
                        key={hours}
                        className="bg-darkBlue-700 rounded px-2 py-1 text-center border border-grey-700"
                      >
                        <p className="text-xs text-grey-400">{hours}h</p>
                        <p className="text-sm font-bold text-white">{price} CPC</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* View Channel Button */}
                <a
                  href={`https://t.me/${partner.telegram_chat?.replace('@', '') || partner.telegram_chat?.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <ExternalLink size={16} />
                  View Channel
                </a>
              </div>
            </div>
          ))}
        </div>

  {filteredPartners.length === 0 && !loading && (
  <div className="bg-darkBlue-800 border border-grey-700 rounded-lg p-12 text-center">
    <Users size={40} className="mx-auto mb-4 text-grey-600" />
    <h2 className="text-2xl font-bold text-white mb-2">No Partners Yet</h2>
    <p className="text-grey-400 mb-4">
      {selectedTopic 
        ? `No partners found in ${selectedTopic} category` 
        : 'Start cross-promoting to build your partner network'}
    </p>
    <button
      onClick={() => navigate('/send-request')}
      className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3 px-6 rounded-lg transition-all"
    >
      Send Your First Promotion
    </button>
  </div>
)}
</div>
</Layout>
 );
}