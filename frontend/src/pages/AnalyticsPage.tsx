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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Analytics</h1>
          <p className="text-grey-400">Track your growth and engagement metrics</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Total Impressions */}
          <div className="bg-darkBlue-800 border border-grey-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-grey-400 font-medium">Total Impressions</p>
              <TrendingUp size={24} className="text-blue-400" />
            </div>

            <p className="text-4xl font-bold text-white">
              {loading ? '—' : analytics?.totalImpressions ?? 0}
            </p>

            <p className="text-grey-400 text-sm mt-2">
              Based on active campaigns
            </p>
          </div>

          {/* Engagement Rate */}
          <div className="bg-darkBlue-800 border border-grey-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-grey-400 font-medium">Engagement Rate</p>
              <Users size={24} className="text-green-400" />
            </div>

            <p className="text-4xl font-bold text-white">
              {loading ? '—' : `${analytics?.engagementRate ?? 0}%`}
            </p>

            <p className="text-grey-400 text-sm mt-2">
              Clicks & interactions
            </p>
          </div>

          {/* New Subscribers */}
          <div className="bg-darkBlue-800 border border-grey-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-grey-400 font-medium">New Subscribers</p>
              <BarChart3 size={24} className="text-blue-400" />
            </div>

            <p className="text-4xl font-bold text-white">
              {loading ? '—' : analytics?.newSubscribers ?? 0}
            </p>

            <p className="text-grey-400 text-sm mt-2">
              Gained via promotions
            </p>
          </div>
        </div>

        {/* Empty State */}
        {!loading &&
          analytics &&
          analytics.totalImpressions === 0 &&
          analytics.newSubscribers === 0 && (
            <div className="bg-darkBlue-800 border border-grey-700 rounded-lg p-8 text-center">
              <p className="text-grey-400">
                No analytics data yet. This feature will be added soon.
              </p>
            </div>
          )}
      </div>
    </Layout>
  );
}
