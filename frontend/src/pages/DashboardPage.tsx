import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import ChannelAvatar from '../components/ChannelAvatar';
import { useAuth } from '../hooks/useAuth';
import { TrendingUp, Send, Zap, Users, Plus, Shield, Radio } from 'lucide-react';

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in-up">
        {/* Welcome Section */}
        <div className="mb-10 text-center sm:text-left">
          <h1 className="text-4xl md:text-5xl font-heading font-extrabold text-white mb-3 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
            Welcome back, <span className="neon-text-cyan">{user.first_name || user.name}!</span> 👋
          </h1>
          <p className="text-contentMuted text-lg font-sans">Manage your cross-promotion campaigns and grow your channels</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="glass-panel p-6 group hover:-translate-y-1 hover:shadow-glow-cyan transition-all duration-300 stagger-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-contentMuted text-xs uppercase tracking-widest font-bold mb-1">CPC Balance</p>
                <p className="text-3xl font-mono font-bold neon-text-cyan">{user.cpcBalance.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-neon-cyan/10 border border-neon-cyan/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <TrendingUp className="text-neon-cyan drop-shadow-[0_0_8px_rgba(0,240,255,0.6)]" size={24} />
              </div>
            </div>
          </div>

          <div className="glass-panel p-6 group hover:-translate-y-1 hover:shadow-glow-violet transition-all duration-300 stagger-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-contentMuted text-xs uppercase tracking-widest font-bold mb-1">Channels</p>
                <p className="text-3xl font-mono font-bold neon-text-violet">{user.channels.length}</p>
              </div>
              <div className="w-12 h-12 bg-neon-violet/10 border border-neon-violet/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users className="text-neon-violet drop-shadow-[0_0_8px_rgba(138,43,226,0.6)]" size={24} />
              </div>
            </div>
          </div>

          <div className="glass-panel p-6 group hover:-translate-y-1 hover:shadow-glow-emerald transition-all duration-300 stagger-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-contentMuted text-xs uppercase tracking-widest font-bold mb-1">Total Subscribers</p>
                <p className="text-3xl font-mono font-bold neon-text-emerald">
                  {user.channels.reduce((sum, ch) => sum + ch.subs, 0).toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-neon-emerald/10 border border-neon-emerald/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <TrendingUp className="text-neon-emerald drop-shadow-[0_0_8px_rgba(0,255,157,0.6)]" size={24} />
              </div>
            </div>
          </div>

          <div className="glass-panel p-6 group hover:-translate-y-1 hover:shadow-glow-cyan transition-all duration-300 stagger-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-contentMuted text-xs uppercase tracking-widest font-bold mb-1">Active Channels</p>
                <p className="text-3xl font-mono font-bold text-white">
                  {user.channels.filter(ch => ch.status === 'Active').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-neon-cyan/10 border border-neon-cyan/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Zap className="text-neon-cyan drop-shadow-[0_0_8px_rgba(0,240,255,0.6)]" size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-12">
          <h2 className="text-2xl font-heading font-bold text-white mb-6 flex items-center gap-3">
            <Zap className="text-neon-cyan" size={24} />
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={() => navigate('/send-request')}
              className="glass-panel p-6 hover:shadow-glow-cyan hover:border-neon-cyan/50 hover:bg-neon-cyan/5 transition-all flex flex-col items-center justify-center gap-3 group text-center"
            >
              <div className="w-14 h-14 rounded-full bg-neon-cyan/10 border border-neon-cyan/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Send size={24} className="text-neon-cyan drop-shadow-[0_0_8px_rgba(0,240,255,0.6)]" />
              </div>
              <div>
                <p className="text-lg font-bold text-white mb-1">Send Promotion</p>
                <p className="text-xs text-contentMuted group-hover:text-neon-cyan/80 transition-colors">Create a new cross-promo request</p>
              </div>
            </button>
            
            <button
              onClick={() => navigate('/campaigns')}
              className="glass-panel p-6 hover:shadow-glow-violet hover:border-neon-violet/50 hover:bg-neon-violet/5 transition-all flex flex-col items-center justify-center gap-3 group text-center"
            >
              <div className="w-14 h-14 rounded-full bg-neon-violet/10 border border-neon-violet/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Zap size={24} className="text-neon-violet drop-shadow-[0_0_8px_rgba(138,43,226,0.6)]" />
              </div>
              <div>
                <p className="text-lg font-bold text-white mb-1">View Campaigns</p>
                <p className="text-xs text-contentMuted group-hover:text-neon-violet/80 transition-colors">Track your scheduled posts</p>
              </div>
            </button>
            
            <button
              onClick={() => navigate('/add-channel')}
              className="glass-panel p-6 hover:shadow-glow-emerald hover:border-neon-emerald/50 hover:bg-neon-emerald/5 transition-all flex flex-col items-center justify-center gap-3 group text-center"
            >
              <div className="w-14 h-14 rounded-full bg-neon-emerald/10 border border-neon-emerald/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Plus size={24} className="text-neon-emerald drop-shadow-[0_0_8px_rgba(0,255,157,0.6)]" />
              </div>
              <div>
                <p className="text-lg font-bold text-white mb-1">Add Channel</p>
                <p className="text-xs text-contentMuted group-hover:text-neon-emerald/80 transition-colors">Connect your telegram channel</p>
              </div>
            </button>

            {/* Admin Panel Button only visible to admins */}
            {user?.isAdmin && (
              <button
                onClick={() => navigate('/admin/moderate-channels')}
                className="glass-panel p-6 hover:shadow-glow-violet hover:border-neon-pink/50 hover:bg-neon-pink/5 transition-all flex flex-col items-center justify-center gap-3 group text-center"
              >
                <div className="w-14 h-14 rounded-full bg-neon-pink/10 border border-neon-pink/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Shield size={24} className="text-neon-pink drop-shadow-[0_0_8px_rgba(255,0,85,0.6)]" />
                </div>
                <div>
                  <p className="text-lg font-bold text-white mb-1">Admin Panel</p>
                  <p className="text-xs text-contentMuted group-hover:text-neon-pink/80 transition-colors">Moderate channels & users</p>
                </div>
              </button>
            )}

            {/* Broadcast Message Button - Admin Only */}
            {user?.isAdmin && (
              <button
                onClick={() => navigate('/admin/broadcast')}
                className="glass-panel p-6 hover:shadow-glow-cyan hover:border-neon-cyan/50 hover:bg-neon-cyan/5 transition-all flex flex-col items-center justify-center gap-3 group text-center"
              >
                <div className="w-14 h-14 rounded-full bg-neon-cyan/10 border border-neon-cyan/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Radio size={24} className="text-neon-cyan drop-shadow-[0_0_8px_rgba(0,240,255,0.6)]" />
                </div>
                <div>
                  <p className="text-lg font-bold text-white mb-1">Broadcast</p>
                  <p className="text-xs text-contentMuted group-hover:text-neon-cyan/80 transition-colors">Send message to all users</p>
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Channels Section */}
        <div>
          <h2 className="text-2xl font-heading font-bold text-white mb-6 flex items-center gap-3">
            <Users className="text-neon-violet" size={24} />
            Your Channels
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {user.channels.map((channel) => (
              <div
                key={channel.id}
                className="glass-panel p-6 hover:shadow-glass-panel hover:border-surfaceBorder transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4 flex-1">
                    <ChannelAvatar 
                      src={channel.avatar}
                      alt={channel.name}
                      className="w-14 h-14"
                      channelName={channel.name}
                    />
                    <div>
                      <h3 className="text-lg font-bold text-white truncate max-w-[150px]">{channel.name}</h3>
                      <p className="text-neon-cyan/80 text-xs font-mono">{channel.topic}</p>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold font-mono border ${
                      channel.status === 'Active'
                        ? 'bg-neon-emerald/10 text-neon-emerald border-neon-emerald/30 shadow-[0_0_8px_rgba(0,255,157,0.2)]'
                        : channel.status === 'Paused'
                        ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                        : 'bg-neon-cyan/10 text-neon-cyan border-neon-cyan/30'
                    }`}
                  >
                    {channel.status}
                  </span>
                </div>

                <div className="space-y-3 mb-5 p-4 bg-charcoal/50 rounded-xl border border-surfaceBorder">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-contentMuted font-medium">Subscribers</span>
                    <span className="text-white font-mono font-bold">{channel.subs.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-contentMuted font-medium">Cross-Promos</span>
                    <span className="text-white font-mono font-bold">{channel.xPromos || 0}</span>
                  </div>
                </div>

                {channel.promos && channel.promos.length > 0 && (
                  <div className="border-t border-surfaceBorder pt-4 mb-4">
                    <p className="text-xs text-neon-violet font-bold font-mono mb-3 uppercase tracking-wider">Active Promos ({channel.promos.length})</p>
                    <div className="space-y-2">
                      {channel.promos.map((promo) => (
                        <div key={promo.id} className="text-sm bg-surface rounded-lg p-2 border border-surfaceBorder hover:border-neon-violet/30 transition-colors">
                          <a
                            href={promo.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-white hover:text-neon-violet truncate block transition-colors"
                          >
                            {promo.name}
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Edit Button - Only for approved channels */}
                {(channel.status === 'Active' || channel.status.toLowerCase() === 'approved') && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(`/edit-channel/${channel.id}`);
                    }}
                    className="btn-secondary w-full"
                  >
                    Edit Configuration
                  </button>
                )}

                {/* Show status message for non-active channels */}
                {channel.status !== 'Active' && channel.status.toLowerCase() !== 'approved' && (
                  <div className="w-full bg-surface border border-surfaceBorder text-contentMuted font-medium py-2 rounded-lg text-center text-sm">
                    {channel.status === 'pending' && '⏳ Pending Review'}
                    {channel.status === 'rejected' && '❌ Rejected'}
                    {channel.status === 'Paused' && '⏸️ Paused'}
                  </div>
                )}          
              </div>
            ))}
            </div>
            </div>
                </div>
    </Layout>
  );
}
