import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';
import { useAuth } from '../hooks/useAuth';
import apiService from '../services/api';
import { Campaign } from '../types';
import { Zap, Clock, CheckCircle, AlertCircle } from 'lucide-react';

export default function CampaignsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const fetchCampaigns = async () => {
      try {
        setLoading(true);
        const data = await apiService.listCampaigns();
        setCampaigns(data);
      } catch (err) {
        setError('Failed to load campaigns');
        console.error('Error loading campaigns:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCampaigns();

    // Refresh campaigns every 30 seconds
    const interval = setInterval(fetchCampaigns, 30000);
    return () => clearInterval(interval);
  }, [user, navigate]);

  if (loading || !user) {
    return (
      <Layout>
        <LoadingSpinner />
      </Layout>
    );
  }

  const scheduledCampaigns = campaigns.filter(c => c.status === 'scheduled');
  const runningCampaigns = campaigns.filter(c => c.status === 'running');
  const endedCampaigns = campaigns.filter(c => c.status === 'ended');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-yellow-600/20 text-yellow-300 border-yellow-600/30';
      case 'running':
        return 'bg-green-600/20 text-green-300 border-green-600/30';
      case 'ended':
        return 'bg-grey-600/20 text-grey-300 border-grey-600/30';
      default:
        return 'bg-blue-600/20 text-blue-300 border-blue-600/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Clock size={18} />;
      case 'running':
        return <Zap size={18} />;
      case 'ended':
        return <CheckCircle size={18} />;
      default:
        return <AlertCircle size={18} />;
    }
  };

  const CampaignCard = ({ campaign }: { campaign: Campaign }) => {
    const startTime = new Date(campaign.start_at);
    const endTime = new Date(campaign.end_at);

    return (
      <div className={`bg-darkBlue-800 border rounded-lg p-6 ${getStatusColor(campaign.status)}`}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-white mb-1">{campaign.promo.name}</h3>
            <p className="text-grey-400 text-sm">{campaign.promo.text}</p>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${getStatusColor(campaign.status)}`}>
            {getStatusIcon(campaign.status)}
            <span className="text-xs font-medium capitalize">{campaign.status}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 py-4 border-y border-grey-700">
          <div>
            <p className="text-grey-400 text-xs font-medium">Start Time</p>
            <p className="text-white text-sm font-medium mt-1">{startTime.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-grey-400 text-xs font-medium">End Time</p>
            <p className="text-white text-sm font-medium mt-1">{endTime.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-grey-400 text-xs font-medium">Duration</p>
            <p className="text-white text-sm font-medium mt-1">{campaign.duration_hours}h</p>
          </div>
          <div>
            <p className="text-grey-400 text-xs font-medium">Chat ID</p>
            <p className="text-white text-sm font-medium mt-1 font-mono">{campaign.chat_id.substring(0, 12)}...</p>
          </div>
        </div>

        <a
          href={campaign.promo.link}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 text-sm font-medium"
        >
          View Promo →
        </a>
      </div>
    );
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Campaigns</h1>
          <p className="text-grey-400">Track your scheduled and running promotional campaigns</p>
        </div>

        {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

        {/* Scheduled Campaigns */}
        {scheduledCampaigns.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <Clock size={24} className="text-yellow-400" />
              <h2 className="text-2xl font-bold text-white">
                Scheduled ({scheduledCampaigns.length})
              </h2>
            </div>
            <div className="grid gap-6">
              {scheduledCampaigns.map((campaign) => (
                <CampaignCard key={campaign.id} campaign={campaign} />
              ))}
            </div>
          </div>
        )}

        {/* Running Campaigns */}
        {runningCampaigns.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <Zap size={24} className="text-green-400" />
              <h2 className="text-2xl font-bold text-white">
                Running ({runningCampaigns.length})
              </h2>
            </div>
            <div className="grid gap-6">
              {runningCampaigns.map((campaign) => (
                <CampaignCard key={campaign.id} campaign={campaign} />
              ))}
            </div>
          </div>
        )}

        {/* Ended Campaigns */}
        {endedCampaigns.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle size={24} className="text-grey-400" />
              <h2 className="text-2xl font-bold text-white">
                Ended ({endedCampaigns.length})
              </h2>
            </div>
            <div className="grid gap-6">
              {endedCampaigns.map((campaign) => (
                <CampaignCard key={campaign.id} campaign={campaign} />
              ))}
            </div>
          </div>
        )}

        {campaigns.length === 0 && (
          <div className="bg-darkBlue-800 border border-grey-700 rounded-lg p-8 text-center">
            <Zap size={40} className="mx-auto mb-4 text-grey-600" />
            <p className="text-grey-400 text-lg">No campaigns yet</p>
            <p className="text-grey-500 text-sm mt-2">Create a cross-promo request and accept it to start a campaign</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
