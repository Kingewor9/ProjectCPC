// Type declaration for Adsgram SDK
declare global {
  interface Window {
    Adsgram: any;
  }
}

import { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';
import { useAuth } from '../hooks/useAuth';
import apiService from '../services/api';
import { Wallet, Gift, Users, Bell, CheckCircle, ExternalLink, AlertCircle, Send, Clock, Zap } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description: string;
  reward: number;
  type: 'welcome' | 'join_channel' | 'invite_task';
  completed: boolean;
  actionText: string;
}

interface InviteTask {
  id: string;
  status: 'pending_posting' | 'active' | 'completed';
  posted_at?: string;
  duration_hours: number;
  reward: number;
  promo: {
    name: string;
    text: string;
    link: string;
    image?: string;
    cta?: string;
  };
  post_link?: string;
  channel_name?: string;
}

export default function CPCoinsPage() {
  const { user, fetchUser } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [processingTask, setProcessingTask] = useState<string | null>(null);
  const [isAdLoading, setIsAdLoading] = useState(false);
  const adControllerRef = useRef<any>(null);

  // Invite task states
  const [showChannelSelector, setShowChannelSelector] = useState(false);
  const [showInviteTaskModal, setShowInviteTaskModal] = useState(false);
  const [activeInviteTask, setActiveInviteTask] = useState<InviteTask | null>(null);
  const [postLink, setPostLink] = useState('');
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [inviteTaskCompleted, setInviteTaskCompleted] = useState(false);

  useEffect(() => {
    if (user) {
      fetchTasks();
      fetchInviteTaskStatus();
    }
  }, [user]);

  // Timer for active invite task
  useEffect(() => {
    if (activeInviteTask?.status === 'active' && activeInviteTask.posted_at) {
      const calculateTimeLeft = () => {
        const start = new Date(activeInviteTask.posted_at!).getTime();
        const duration = activeInviteTask.duration_hours * 60 * 60 * 1000;
        const end = start + duration;
        const now = Date.now();
        const remaining = Math.max(0, end - now);
        setTimeLeft(remaining);
      };

      calculateTimeLeft();
      const timer = setInterval(calculateTimeLeft, 1000);
      return () => clearInterval(timer);
    }
  }, [activeInviteTask]);

  // Initialize Adsgram...
useEffect(() => {
  if (window.Adsgram) {
    const blockId = import.meta.env.VITE_ADSGRAM_BLOCK_ID;
    
    if (!blockId) {
      console.error('Adsgram Block ID not configured');
      setError('Ad system not configured. Please contact support.');
      return;
    }
    
    adControllerRef.current = window.Adsgram.init({ 
      blockId: blockId, // ✅ From environment variable
      debug: import.meta.env.DEV // Automatically true in dev, false in production
    });
    
    console.log('Adsgram initialized with block ID:', blockId);
  }
}, []);

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

  const fetchInviteTaskStatus = async () => {
    try {
      const data = await apiService.getInviteTaskStatus();
      setInviteTaskCompleted(data.completed);
      setActiveInviteTask(data.active_task);
    } catch (err: any) {
      console.error('Error fetching invite task status:', err);
    }
  };

  const handleClaimWelcomeBonus = async () => {
    setProcessingTask('welcome');
    setError(null);

    try {
      const result = await apiService.claimWelcomeBonus();
      
      if (result.ok) {
        setSuccess(`🎉 Welcome bonus claimed! +${result.reward} CP Coins added to your balance.`);
        setTasks(prev => prev.map(task => 
          task.type === 'welcome' ? { ...task, completed: true } : task
        ));
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
      window.open('https://t.me/cpgram_news', '_blank');

      setTimeout(async () => {
        try {
          const result = await apiService.verifyChannelJoin();
          
          if (result.ok) {
            setSuccess(`✅ Channel join verified! +${result.reward} CP Coins added to your balance.`);
            setTasks(prev => prev.map(task => 
              task.type === 'join_channel' ? { ...task, completed: true } : task
            ));
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

  const handleInitiateInviteTask = () => {
    if (!user?.channels || user.channels.length === 0) {
      setError('You need to add a channel first');
      return;
    }

    const eligibleChannels = user.channels.filter((ch: any) => 
      ch.status === 'Active' || ch.status === 'approved'
    );

    if (eligibleChannels.length === 0) {
      setError('You need at least one active channel to complete this task');
      return;
    }

    setShowChannelSelector(true);
  };

  const handleSelectChannel = async (channelId: string) => {
    setShowChannelSelector(false);
    setProcessingTask('invite_task');
    setError(null);

    try {
      const result = await apiService.initiateInviteTask(channelId);
      
      if (result.ok) {
        await fetchInviteTaskStatus();
        setShowInviteTaskModal(true);
        setSuccess('Invite task initiated! Get the promo and post it.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to initiate invite task');
    } finally {
      setProcessingTask(null);
    }
  };

  const handleSendInvitePromo = async () => {
    if (!activeInviteTask) return;

    setProcessingTask('send_promo');
    try {
      await apiService.sendInvitePromoToTelegram(activeInviteTask.id);
      alert('Promo sent to your Telegram! Forward it to your channel.');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to send promo');
    } finally {
      setProcessingTask(null);
    }
  };

  const handleVerifyInvitePost = async () => {
    if (!postLink.trim() || !activeInviteTask) return;

    setProcessingTask('verify_post');
    try {
      await apiService.verifyAndStartInviteTask(activeInviteTask.id, postLink);
      setSuccess('Post verified! Timer started. Admin notified.');
      setPostLink('');
      await fetchInviteTaskStatus();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to verify post');
    } finally {
      setProcessingTask(null);
    }
  };

  const handleCompleteInviteTask = async () => {
    if (!activeInviteTask) return;

    if (timeLeft > 0) {
      alert(`Please wait for the timer to complete. Time remaining: ${formatTimeLeft(timeLeft)}`);
      return;
    }

    if (!confirm('Timer complete! Click OK to claim your 5,000 CP Coins!')) return;

    setProcessingTask('complete_task');
    try {
      const result = await apiService.completeInviteTask(activeInviteTask.id);
      setSuccess(`🎉 Invite task completed! +${result.reward} CP Coins added!`);
      await fetchUser();
      await fetchInviteTaskStatus();
      setShowInviteTaskModal(false);
      setInviteTaskCompleted(true);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to complete task');
    } finally {
      setProcessingTask(null);
    }
  };

  const formatTimeLeft = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  if (loading) {
    return (
      <Layout>
        <LoadingSpinner />
      </Layout>
    );
  }

  // Ad watch handler
const handleWatchAd = async () => {
  if (!adControllerRef.current) {
    setError("Ad system not ready. Please refresh.");
    return;
  }

  setIsAdLoading(true);

  adControllerRef.current.show()
    .then(async (result: any) => {
     console.log('Ad completed:', result);
      // User finished the ad
      setProcessingTask('ad_reward');
      try {
        const res = await apiService.claimAdReward(); 
        if (res.ok) {
          setSuccess(`🎉 Awesome! +${res.reward} CP Coins added to your balance.`);
          await fetchUser();
        }
      } catch (err: any) {
        setError(err.response?.data?.error || "Failed to claim ad reward");
      } finally {
        setProcessingTask(null);
      }
    })
    .catch((result: any) => {
      console.error("Ad error:", result);
      setError("You must watch the ad until the end to claim rewards.");
    })
    .finally(() => {
      setIsAdLoading(false);
    });
};

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8">
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
            onClick={() => window.location.href = '/buy-coins'}
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
          {/* Earn Free 75 CP Coins Ad Task */}
<div className="bg-darkBlue-800 border border-blue-500/50 rounded-lg p-6 mb-4 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
  <div className="flex items-start justify-between gap-4">
    <div className="flex items-start gap-4 flex-1">
      <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
        <Zap className="text-blue-400" size={24} />
      </div>
      <div className="flex-1">
        <h3 className="text-xl font-bold text-white mb-1">Earn Free 75 CP Coins</h3>
        <p className="text-grey-400 text-sm mb-3">
          Watch a short video until the end to claim your reward. No skipping allowed!
        </p>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-blue-400">+75</span>
          <span className="text-grey-400">CP Coins</span>
        </div>
      </div>
    </div>
    
    <button
      onClick={handleWatchAd}
      disabled={isAdLoading || processingTask === 'ad_reward'}
      className={`px-6 py-3 rounded-lg font-bold transition-all flex-shrink-0 ${
        isAdLoading 
          ? 'bg-grey-700 text-grey-400 cursor-not-allowed'
          : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20'
      }`}
    >
      {isAdLoading ? 'Loading Ad...' : 'Watch & Earn'}
    </button>
  </div>
</div>
          {/* Welcome Bonus */}
          <div className="bg-darkBlue-800 border border-grey-700 rounded-lg p-6">
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
          </div>

          {/* Join News Channel */}
          <div className="bg-darkBlue-800 border border-grey-700 rounded-lg p-6">
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
          </div>

          {/* Claim 5000 CP Coins - NEW INVITE TASK */}
          <div className="bg-darkBlue-800 border border-grey-700 rounded-lg p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4 flex-1">
                <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Users className="text-purple-400" size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-1">Claim 5,000 CP Coins</h3>
                  <p className="text-grey-400 text-sm mb-3">
                    Share CP Gram's promotional material on your channel for 12 hours and earn a massive reward!
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-purple-400">+5,000</span>
                    <span className="text-grey-400">CP Coins</span>
                  </div>
                  
                  {inviteTaskCompleted && (
                    <div className="mt-3 bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                      <p className="text-purple-300 text-sm">
                        ✅ Task completed! Check back later when admin renews this task.
                      </p>
                    </div>
                  )}

                  {activeInviteTask && !inviteTaskCompleted && (
                    <div className="mt-3 bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                      <p className="text-purple-300 text-sm flex items-center gap-2">
                        {activeInviteTask.status === 'pending_posting' && (
                          <>
                            <Clock size={16} />
                            Task in progress - Click to continue
                          </>
                        )}
                        {activeInviteTask.status === 'active' && (
                          <>
                            <Zap size={16} />
                            Timer running - Click to view
                          </>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              <button
                onClick={() => {
                  if (activeInviteTask) {
                    setShowInviteTaskModal(true);
                  } else {
                    handleInitiateInviteTask();
                  }
                }}
                disabled={inviteTaskCompleted || processingTask === 'invite_task'}
                className={`px-6 py-3 rounded-lg font-bold transition-all flex-shrink-0 ${
                  inviteTaskCompleted
                    ? 'bg-grey-700 text-grey-400 cursor-not-allowed'
                    : 'bg-purple-600 hover:bg-purple-700 text-white'
                }`}
              >
                {processingTask === 'invite_task' ? 'Processing...' : 
                 inviteTaskCompleted ? 'Completed' :
                 activeInviteTask ? 'Continue' : 'Claim'}
              </button>
            </div>
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
                <li>• 5,000 CP task can be renewed by admin</li>
                <li>• Use CP Coins to pay for cross-promotions</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Channel Selector Modal */}
        {showChannelSelector && user?.channels && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-darkBlue-800 border border-grey-700 rounded-lg p-6 max-w-md w-full">
              <h3 className="text-xl font-bold text-white mb-4">Select Channel</h3>
              
              <div className="space-y-3 mb-6">
                {user.channels
                  .filter((ch: any) => ch.status === 'Active' || ch.status === 'approved')
                  .map((channel: any) => (
                    <button
                      key={channel.id}
                      onClick={() => handleSelectChannel(channel.id)}
                      className="w-full bg-darkBlue-700 hover:bg-darkBlue-600 border border-grey-700 rounded-lg p-4 text-left transition-all"
                    >
                      <p className="text-white font-bold">{channel.name}</p>
                      <p className="text-grey-400 text-sm mt-1">{channel.subs?.toLocaleString()} subscribers</p>
                    </button>
                  ))}
              </div>

              <button
                onClick={() => setShowChannelSelector(false)}
                className="w-full bg-grey-700 hover:bg-grey-600 text-white font-bold py-3 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Invite Task Modal */}
        {showInviteTaskModal && activeInviteTask && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-darkBlue-800 border border-grey-700 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">Invite Task</h2>
                  <p className="text-grey-400">Channel: {activeInviteTask.channel_name}</p>
                </div>
                <button 
                  onClick={() => setShowInviteTaskModal(false)}
                  className="text-grey-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="mb-6">
                <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                  activeInviteTask.status === 'pending_posting' ? 'bg-yellow-500/20 text-yellow-400' :
                  activeInviteTask.status === 'active' ? 'bg-green-500/20 text-green-400' :
                  'bg-gray-500/20 text-gray-400'
                }`}>
                  {activeInviteTask.status === 'pending_posting' && <><Clock size={16} />Pending</>}
                  {activeInviteTask.status === 'active' && <><Zap size={16} />Active</>}
                  {activeInviteTask.status === 'completed' && <><CheckCircle size={16} />Completed</>}
                </span>
              </div>

              {activeInviteTask.status === 'pending_posting' && (
                <div className="space-y-4">
                  <button
                    onClick={handleSendInvitePromo}
                    disabled={processingTask === 'send_promo'}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2"
                  >
                    <Send size={20} />
                    Get Promo in Telegram
                  </button>
                  
                  <div className="bg-darkBlue-900 rounded-lg p-4 border border-grey-700">
                    <h4 className="text-white font-medium mb-2">📋 Next Steps:</h4>
                    <ol className="text-grey-300 text-sm space-y-2 list-decimal list-inside">
                      <li>Click "Get Promo in Telegram"</li>
                      <li>Forward the message to your channel</li>
                      <li>Copy the post link from your channel</li>
                      <li>Submit the link below to start 12-hour timer</li>
                    </ol>
                  </div>

                  <div className="space-y-2">
                    <label className="text-white text-sm font-medium">Post Link</label>
                    <input
                      type="url"
                      value={postLink}
                      onChange={(e) => setPostLink(e.target.value)}
                      placeholder="https://t.me/yourchannel/123"
                      className="w-full bg-darkBlue-900 border border-grey-700 rounded-lg px-4 py-3 text-white"
                    />
                    <button
                      onClick={handleVerifyInvitePost}
                      disabled={!postLink.trim() || processingTask === 'verify_post'}
                      className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium disabled:opacity-50"
                    >
                      ✓ Start 12-Hour Timer
                    </button>
                  </div>
                </div>
              )}

              {activeInviteTask.status === 'active' && (
                <div className="space-y-4">
                  <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-6 text-center">
                    <Zap className="w-12 h-12 text-green-400 mx-auto mb-3" />
                    <h4 className="text-white text-xl font-bold mb-2">Task Active!</h4>
                    <div className="text-3xl font-mono text-green-400 mb-2">
                      {formatTimeLeft(timeLeft)}
                    </div>
                    <p className="text-grey-400 text-sm">Time remaining</p>
                  </div>

                  <button
                    onClick={handleCompleteInviteTask}
                    disabled={timeLeft > 0 || processingTask === 'complete_task'}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-medium disabled:opacity-50"
                  >
                    {timeLeft > 0 ? 'Wait for Timer' : 'Claim 5,000 CP Coins'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}