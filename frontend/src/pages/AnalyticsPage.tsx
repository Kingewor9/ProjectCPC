import { BarChart3, TrendingUp, Users } from 'lucide-react';
import Layout from '../components/Layout';

export default function AnalyticsPage() {
  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Analytics</h1>
          <p className="text-grey-400">Track your growth and engagement metrics</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-darkBlue-800 border border-grey-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-grey-400 font-medium">Total Impressions</p>
              <TrendingUp size={24} className="text-blue-400" />
            </div>
            <p className="text-4xl font-bold text-white">125.4K</p>
            <p className="text-green-400 text-sm mt-2">↑ 12% from last month</p>
          </div>

          <div className="bg-darkBlue-800 border border-grey-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-grey-400 font-medium">Engagement Rate</p>
              <Users size={24} className="text-green-400" />
            </div>
            <p className="text-4xl font-bold text-white">8.3%</p>
            <p className="text-green-400 text-sm mt-2">↑ 2.1% from last month</p>
          </div>

          <div className="bg-darkBlue-800 border border-grey-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-grey-400 font-medium">New Subscribers</p>
              <BarChart3 size={24} className="text-blue-400" />
            </div>
            <p className="text-4xl font-bold text-white">2,847</p>
            <p className="text-green-400 text-sm mt-2">↑ 34% from last month</p>
          </div>
        </div>

        {/* Coming Soon */}
        <div className="bg-darkBlue-800 border border-grey-700 rounded-lg p-12 text-center">
          <BarChart3 size={48} className="mx-auto mb-4 text-blue-400" />
          <h2 className="text-2xl font-bold text-white mb-2">Analytics Dashboard Coming Soon</h2>
          <p className="text-grey-400">Detailed performance metrics and insights will be available soon</p>
        </div>
      </div>
    </Layout>
  );
}
