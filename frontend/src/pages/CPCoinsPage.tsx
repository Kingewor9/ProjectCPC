import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';
import { useAuth } from '../hooks/useAuth';
import apiService from '../services/api';
import { Wallet, Gift, Users, Bell, CheckCircle, ExternalLink, AlertCircle } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description: string;
  reward: number;
  type: 'welcome' | 'join_channel' | 'invite_users';
  completed: boolean;
  icon: any;
  actionText: string;
}

export default function CPCoinsPage() {
  const navigate = useNavigate();
  const { user, fetchUser } = useAuth();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [processingTask, setProcessingTask] = useState<string | null>(null);

  // Modal state for invite confirmation
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<any>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    fetchTasks();
  }, [user, navigate]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const data = await apiService.getTasks();
      setTasks(data.tasks || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleClaimWelcomeBonus = async () => {
    setProcessingTask('welcome');
    setError(null);

    try {
      const result = await apiService.claimWelcomeBonus();
      
      if (result.ok) {
        setSuccess(`🎉 Welcome bonus claimed! +${result.reward} CP Coins added to your balance.`);
        
        // Update tasks
        setTasks(prev => prev.map(task => 
          task.type === 'welcome' ? { ...task, completed: true } : task
        ));

        // Refresh user data to update balance
        await fetchUser();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to claim welcome bonus');
    } finally {
      setProcessingTask(null);
    }
  };

  const handleJoinChannel = async () => {
    setProcessingTask('join_channel');
    setError(null);

    try {
      // Open Telegram channel in new tab
      window.open('https://t.me/cpgram_news', '_blank');

      // Wait a bit for user to join
      setTimeout(async () => {
        try {
          const result = await apiService.verifyChannelJoin();
          
          if (result.ok) {
            setSuccess(`✅ Channel join verified! +${result.reward} CP Coins added to your balance.`);
            
            // Update tasks
            setTasks(prev => prev.map(task => 
              task.type === 'join_channel' ? { ...task, completed: true } : task
            ));

            // Refresh user data
            await fetchUser();
          }
        } catch (err: any) {
          setError(err.message || 'Please make sure you joined the channel');
        } finally {
          setProcessingTask(null);
        }
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to verify channel join');
      setProcessingTask(null);
    }
  };

  const handleInviteUsers = () => {
    // Show channel selection if user has multiple channels
    if (user?.channels && user.channels.length > 0) {
      const eligibleChannels = user.channels.filter((ch: any) => 
        ch.status === 'Active' || ch.status === 'approved'
      );

      if (eligibleChannels.length === 0) {
        setError('You need at least one active channel to complete this task');
        return;
      }

      if (eligibleChannels.length === 1) {
        setSelectedChannel(eligibleChannels[0]);
        setShowInviteModal(true);
      } else {
        // For now, use the first active channel
        // Later you can add a channel selector
        setSelectedChannel(eligibleChannels[0]);
        setShowInviteModal(true);
      }
    } else {
      setError('You need to add a channel first');
    }
  };

  const confirmInviteTask = async () => {
    if (!selectedChannel) return;

    setProcessingTask('invite_users');
    setError(null);
    setShowInviteModal(false);

    try {
      const result = await apiService.createInviteTask(selectedChannel.id);
      
      if (result.ok) {
        setSuccess(
          `📢 Invite promo scheduled! A promotional post will be shared on "${selectedChannel.name}". ` +
          `The post will be automatically deleted after 12 hours, and ${result.reward} CP Coins will be added to your balance.`
        );
        
        // Update tasks
        setTasks(prev => prev.map(task => 
          task.type === 'invite_users' ? { ...task, completed: true } : task
        ));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create invite task');
    } finally {
      setProcessingTask(null);
      setSelectedChannel(null);
    }
  };

  if (loading) {
    return (
      <Layout>
        <LoadingSpinner />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">CP Coins</h1>
          <p className="text-grey-400">Manage your balance and earn rewards</p>
        </div>

        {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}
        
        {success && (
          <div className="mb-6 bg-green-600/10 border border-green-600/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="text-green-400 flex-shrink-0 mt-1" size={20} />
              <p className="text-green-400">{success}</p>
            </div>
          </div>
        )}

        {/* Balance Card */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-8 mb-8 shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <Wallet className="text-white" size={24} />
            </div>
            <div>
              <p className="text-blue-200 text-sm font-medium">Your Balance</p>
              <p className="text-5xl font-bold text-white">{user?.cpcBalance || 0}</p>
            </div>
          </div>
          <p className="text-blue-100 text-sm mb-6">CP Coins</p>
          
          <button
            onClick={() => navigate('/buy-coins')}
            className="w-full bg-white hover:bg-grey-100 text-blue-600 font-bold py-3 rounded-lg transition-all"
          >
            Buy CP Coins
          </button>
        </div>

        {/* Earn Section */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <Gift className="text-blue-400" size={28} />
            Earn CP Coins
          </h2>
          <p className="text-grey-400 mb-6">Complete tasks below to earn free CP Coins</p>
        </div>

        {/* Tasks List */}
        <div className="space-y-4">
          {/* Welcome Bonus */}
          <div className="bg-darkBlue-800 border border-grey-700 rounded-lg p-6 hover:border-blue-500 transition-all">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4 flex-1">
                <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Gift className="text-green-400" size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-1">Welcome Bonus</h3>
                  <p className="text-grey-400 text-sm mb-3">
                    Get started with a special one-time bonus for new users!
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-green-400">+500</span>
                    <span className="text-grey-400">CP Coins</span>
                  </div>
                </div>
              </div>
              
              <button
                onClick={handleClaimWelcomeBonus}
                disabled={tasks.find(t => t.type === 'welcome')?.completed || processingTask === 'welcome'}
                className={`px-6 py-3 rounded-lg font-bold transition-all flex-shrink-0 ${
                  tasks.find(t => t.type === 'welcome')?.completed
                    ? 'bg-grey-700 text-grey-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {processingTask === 'welcome' ? 'Claiming...' : 
                 tasks.find(t => t.type === 'welcome')?.completed ? 'Claimed' : 'Claim'}
              </button>
            </div>
            
            {tasks.find(t => t.type === 'welcome')?.completed && (
              <div className="mt-4 flex items-center gap-2 text-green-400 text-sm">
                <CheckCircle size={16} />
                <span>Completed</span>
              </div>
            )}
          </div>

          {/* Join News Channel */}
          <div className="bg-darkBlue-800 border border-grey-700 rounded-lg p-6 hover:border-blue-500 transition-all">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4 flex-1">
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Bell className="text-blue-400" size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-1">Join the News Channel</h3>
                  <p className="text-grey-400 text-sm mb-3">
                    Stay updated with the latest news and announcements from CP Gram!
                  </p>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl font-bold text-blue-400">+250</span>
                    <span className="text-grey-400">CP Coins</span>
                  </div>
                  <a 
                    href="https://t.me/cpgram_news" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1"
                  >
                    @cpgram_news <ExternalLink size={14} />
                  </a>
                </div>
              </div>
              
              <button
                onClick={handleJoinChannel}
                disabled={tasks.find(t => t.type === 'join_channel')?.completed || processingTask === 'join_channel'}
                className={`px-6 py-3 rounded-lg font-bold transition-all flex-shrink-0 ${
                  tasks.find(t => t.type === 'join_channel')?.completed
                    ? 'bg-grey-700 text-grey-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {processingTask === 'join_channel' ? 'Verifying...' : 
                 tasks.find(t => t.type === 'join_channel')?.completed ? 'Joined' : 'Join'}
              </button>
            </div>
            
            {tasks.find(t => t.type === 'join_channel')?.completed && (
              <div className="mt-4 flex items-center gap-2 text-blue-400 text-sm">
                <CheckCircle size={16} />
                <span>Completed</span>
              </div>
            )}
          </div>

          {/* Invite Users */}
          <div className="bg-darkBlue-800 border border-grey-700 rounded-lg p-6 hover:border-blue-500 transition-all">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4 flex-1">
                <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Users className="text-purple-400" size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-1">Invite Users</h3>
                  <p className="text-grey-400 text-sm mb-3">
                    Share a promotional post on your channel to invite new users to CP Gram. The bot will automatically post and remove it after 12 hours.
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-purple-400">+5,000</span>
                    <span className="text-grey-400">CP Coins</span>
                  </div>
                  
                  {tasks.find(t => t.type === 'invite_users')?.completed && (
                    <div className="mt-3 bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                      <p className="text-purple-300 text-sm">
                        💡 This task refreshes periodically. Check back later for new opportunities!
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              <button
                onClick={handleInviteUsers}
                disabled={tasks.find(t => t.type === 'invite_users')?.completed || processingTask === 'invite_users'}
                className={`px-6 py-3 rounded-lg font-bold transition-all flex-shrink-0 ${
                  tasks.find(t => t.type === 'invite_users')?.completed
                    ? 'bg-grey-700 text-grey-400 cursor-not-allowed'
                    : 'bg-purple-600 hover:bg-purple-700 text-white'
                }`}
              >
                {processingTask === 'invite_users' ? 'Processing...' : 
                 tasks.find(t => t.type === 'invite_users')?.completed ? 'Completed' : 'Invite'}
              </button>
            </div>
            
            {tasks.find(t => t.type === 'invite_users')?.completed && (
              <div className="mt-4 flex items-center gap-2 text-purple-400 text-sm">
                <CheckCircle size={16} />
                <span>Completed - Available again soon!</span>
              </div>
            )}
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-blue-600/10 border border-blue-600/30 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-blue-400 flex-shrink-0 mt-1" size={20} />
            <div>
              <p className="text-blue-300 font-medium mb-2">How it works</p>
              <ul className="text-blue-200 text-sm space-y-1">
                <li>• Complete tasks to earn CP Coins instantly</li>
                <li>• Most tasks can only be claimed once</li>
                <li>• Invite task refreshes periodically for more rewards</li>
                <li>• Use CP Coins to pay for cross-promotions</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Invite Confirmation Modal */}
        {showInviteModal && selectedChannel && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-darkBlue-800 border border-grey-700 rounded-lg p-6 max-w-md w-full">
              <h3 className="text-xl font-bold text-white mb-4">Confirm Invite Task</h3>
              
              <div className="bg-darkBlue-700 rounded-lg p-4 mb-4">
                <p className="text-grey-400 text-sm mb-2">Selected Channel:</p>
                <p className="text-white font-bold">{selectedChannel.name}</p>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="text-yellow-400 flex-shrink-0 mt-1" size={20} />
                  <div className="text-sm text-yellow-200">
                    <p className="font-medium mb-2">Important:</p>
                    <ul className="space-y-1">
                      <li>• The bot will post a promotional message on your channel</li>
                      <li>• The post will use one of your available time slots</li>
                      <li>• The post will be automatically deleted after 12 hours</li>
                      <li>• You'll receive 5,000 CP Coins after the post is deleted</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowInviteModal(false);
                    setSelectedChannel(null);
                  }}
                  className="flex-1 bg-grey-700 hover:bg-grey-600 text-white font-bold py-3 rounded-lg transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmInviteTask}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg transition-all"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}