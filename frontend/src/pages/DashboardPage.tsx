import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../hooks/useAuth';
import { TrendingUp, Send, Zap, Users, Plus, Shield } from 'lucide-react';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, loading, fetchUser } = useAuth();

  useEffect(() => {
    if (!localStorage.getItem('authToken')) {
      navigate('/login');
    }
  }, [navigate]);

  useEffect(() => {
    if (!user) {
      fetchUser();
    }
  }, [user, fetchUser]);

  if (loading || !user) {
    return (
      <Layout>
        <LoadingSpinner />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Welcome back, {user.first_name || user.name}! 👋
          </h1>
          <p className="text-grey-400">Manage your cross-promotion campaigns and grow your channels</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-darkBlue-800 border border-grey-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-grey-400 text-sm font-medium">CPC Balance</p>
                <p className="text-3xl font-bold text-white mt-2">{user.cpcBalance}</p>
              </div>
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="text-blue-400" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-darkBlue-800 border border-grey-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-grey-400 text-sm font-medium">Channels</p>
                <p className="text-3xl font-bold text-white mt-2">{user.channels.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Users className="text-blue-400" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-darkBlue-800 border border-grey-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-grey-400 text-sm font-medium">Total Subscribers</p>
                <p className="text-3xl font-bold text-white mt-2">
                  {user.channels.reduce((sum, ch) => sum + ch.subs, 0).toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="text-blue-400" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-darkBlue-800 border border-grey-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-grey-400 text-sm font-medium">Active Channels</p>
                <p className="text-3xl font-bold text-white mt-2">
                  {user.channels.filter(ch => ch.status === 'Active').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                <Zap className="text-green-400" size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button
              onClick={() => navigate('/send-request')}
              className="bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-4 rounded-lg transition-all flex items-center justify-center gap-3 group"
            >
              <Send size={24} />
              <div className="text-left">
                <p className="text-lg">Send Promotion</p>
                <p className="text-sm text-blue-200 group-hover:text-blue-100">Create a new cross-promo request</p>
              </div>
            </button>
            <button
              onClick={() => navigate('/campaigns')}
              className="bg-gradient-to-br from-darkBlue-700 to-darkBlue-800 border border-grey-700 hover:border-blue-600 text-white font-bold py-4 rounded-lg transition-all flex items-center justify-center gap-3 group"
            >
              <Zap size={24} className="text-blue-400" />
              <div className="text-left">
                <p className="text-lg">View Campaigns</p>
                <p className="text-sm text-grey-400 group-hover:text-grey-300">Track your scheduled posts</p>
              </div>
            </button>
             <button
      onClick={() => navigate('/add-channel')}
      className="bg-gradient-to-br from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-4 rounded-lg transition-all flex items-center justify-center gap-3 group"
    >
      <Plus size={24} />
      <div className="text-left">
        <p className="text-lg">Add Channel</p>
        <p className="text-sm text-green-200 group-hover:text-green-100">Connect your telegram channel</p>
    </div>
    </button>

{/*Admin Panel Button only visible to admins*/}
    {user?.telegram_id === 'ADMIN_TELEGRAM_ID' && (
      <button
        onClick={() => navigate('/admin/moderate-channels')}
        className="bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-bold py-4 rounded-lg transition-all flex items-center justify-center gap-3 group"
      >
        <Shield size={24} />
        <div className="text-left">
          <p className="text-lg">Admin Panel</p>
          <p className="text-sm text-purple-200 group-hover:text-purple-100">Moderate channels & users</p>
        </div>
      </button>
    )}
          </div>
        </div>

        {/* Channels Section */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">Your Channels</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {user.channels.map((channel) => (
              <div
                key={channel.id}
                className="bg-darkBlue-800 border border-grey-700 rounded-lg p-6 hover:border-blue-500 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3 flex-1">
                    <img
                      src={channel.avatar}
                      alt={channel.name}
                      className="w-12 h-12 rounded-lg"
                    />
                    <div>
                      <h3 className="text-lg font-bold text-white">{channel.name}</h3>
                      <p className="text-grey-400 text-sm">{channel.topic}</p>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      channel.status === 'Active'
                        ? 'bg-green-500/20 text-green-300'
                        : channel.status === 'Paused'
                        ? 'bg-yellow-500/20 text-yellow-300'
                        : 'bg-blue-500/20 text-blue-300'
                    }`}
                  >
                    {channel.status}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-grey-400">Subscribers:</span>
                    <span className="text-white font-medium">{channel.subs.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-grey-400">Cross-Promos:</span>
                    <span className="text-white font-medium">{channel.xPromos || 0}</span>
                  </div>
                </div>

                {channel.promos && channel.promos.length > 0 && (
                  <div className="border-t border-grey-700 pt-4 mb-4">
                    <p className="text-xs text-grey-400 font-medium mb-2">PROMOS ({channel.promos.length})</p>
                    <div className="space-y-2">
                      {channel.promos.map((promo) => (
                        <div key={promo.id} className="text-sm">
                          <a
                            href={promo.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 truncate"
                          >
                            {promo.name}
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Edit Button */}
                <button
                  onClick={() => navigate(`/edit-channel/${channel.id}`)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition-all"
                >
                  Edit Channel
                </button>
              </div>
            ))}
            </div>
            </div>
                </div>
    </Layout>
  );
}
