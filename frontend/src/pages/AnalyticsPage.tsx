import { BarChart3, TrendingUp, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import Layout from '../components/Layout';

type AnalyticsData = {
  totalImpressions: number;
  engagementRate: number;
  newSubscribers: number;
};

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await fetch('/api/analytics', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          },
        });

        if (!res.ok) throw new Error('Failed to fetch analytics');

        const data = await res.json();
        setAnalytics(data);
      } catch (err) {
        console.error(err);
        setAnalytics({
          totalImpressions: 0,
          engagementRate: 0,
          newSubscribers: 0,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in-up">
        <div className="mb-10 text-center sm:text-left">
          <h1 className="text-4xl md:text-5xl font-heading font-extrabold text-white mb-3 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">Analytics</h1>
          <p className="text-contentMuted text-lg font-sans">Track your growth and engagement metrics</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Total Impressions */}
          <div className="glass-panel p-8 group hover:-translate-y-1 hover:shadow-glow-cyan transition-all duration-300 stagger-1">
            <div className="flex items-center justify-between mb-6">
              <p className="text-contentMuted text-sm font-bold tracking-widest uppercase">Total Impressions</p>
              <div className="w-12 h-12 bg-neon-cyan/10 border border-neon-cyan/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <TrendingUp size={24} className="text-neon-cyan drop-shadow-[0_0_8px_rgba(0,240,255,0.6)]" />
              </div>
            </div>

            <p className="text-5xl font-mono font-bold neon-text-cyan mb-2">
              {loading ? '—' : analytics?.totalImpressions?.toLocaleString() ?? 0}
            </p>

            <p className="text-contentMuted/70 text-xs font-mono uppercase tracking-wider">
              Based on active campaigns
            </p>
          </div>

          {/* Engagement Rate */}
          <div className="glass-panel p-8 group hover:-translate-y-1 hover:shadow-glow-violet transition-all duration-300 stagger-2">
            <div className="flex items-center justify-between mb-6">
              <p className="text-contentMuted text-sm font-bold tracking-widest uppercase">Engagement Rate</p>
              <div className="w-12 h-12 bg-neon-violet/10 border border-neon-violet/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users size={24} className="text-neon-violet drop-shadow-[0_0_8px_rgba(138,43,226,0.6)]" />
              </div>
            </div>

            <p className="text-5xl font-mono font-bold neon-text-violet mb-2">
              {loading ? '—' : `${analytics?.engagementRate ?? 0}%`}
            </p>

            <p className="text-contentMuted/70 text-xs font-mono uppercase tracking-wider">
              Clicks & interactions
            </p>
          </div>

          {/* New Subscribers */}
          <div className="glass-panel p-8 group hover:-translate-y-1 hover:shadow-glow-emerald transition-all duration-300 stagger-3">
            <div className="flex items-center justify-between mb-6">
              <p className="text-contentMuted text-sm font-bold tracking-widest uppercase">New Subscribers</p>
              <div className="w-12 h-12 bg-neon-emerald/10 border border-neon-emerald/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <BarChart3 size={24} className="text-neon-emerald drop-shadow-[0_0_8px_rgba(0,255,157,0.6)]" />
              </div>
            </div>

            <p className="text-5xl font-mono font-bold neon-text-emerald mb-2">
              {loading ? '—' : analytics?.newSubscribers?.toLocaleString() ?? 0}
            </p>

            <p className="text-contentMuted/70 text-xs font-mono uppercase tracking-wider">
              Gained via promotions
            </p>
          </div>
        </div>

        {/* Empty State */}
        {!loading &&
          analytics &&
          analytics.totalImpressions === 0 &&
          analytics.newSubscribers === 0 && (
            <div className="glass-panel p-12 text-center animate-pulse-glow">
              <BarChart3 className="mx-auto w-16 h-16 text-contentMuted/30 mb-4" />
              <p className="text-xl font-bold text-white mb-2">No data available yet</p>
              <p className="text-contentMuted font-mono">
                Launch campaigns to see your analytics grow here.
              </p>
            </div>
          )}
      </div>
    </Layout>
  );
}
