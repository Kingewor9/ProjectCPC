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
import { Wallet, Gift, Users, Bell, CheckCircle, ExternalLink, AlertCircle, Clock, Zap } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description: string;
  reward: number;
  type: 'welcome' | 'join_channel' | 'invite_task';
  completed: boolean;
  actionText: string;
}

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => {
  const start = i.toString().padStart(2, '0');
  const end = ((i + 1) % 24).toString().padStart(2, '0');
  return `${start}:00 - ${end}:00 UTC`;
});

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

  const [selectedChannelIdForInvite, setSelectedChannelIdForInvite] = useState<string | null>(null);
  const [daySelected, setDaySelected] = useState('Monday');
  const [timeSelected, setTimeSelected] = useState('09:00 - 10:00 UTC');
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

  // Initialize Adsgram.....
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
    setSelectedChannelIdForInvite(channelId);
  };

  const handleConfirmSchedule = async () => {
    if (!selectedChannelIdForInvite) return;

    setShowChannelSelector(false);
    setProcessingTask('invite_task');
    setError(null);

    try {
      const result = await apiService.initiateInviteTask(
        selectedChannelIdForInvite,
        daySelected,
        timeSelected
      );

      if (result.ok) {
        await fetchInviteTaskStatus();
        setShowInviteTaskModal(true);
        setSuccess('Invite task securely scheduled! The bot will handle everything natively.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to initiate invite task');
    } finally {
      setProcessingTask(null);
      setSelectedChannelIdForInvite(null);
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8 animate-fade-in-up">
        <div className="mb-10 text-center sm:text-left">
          <h1 className="text-4xl md:text-5xl font-heading font-extrabold text-white mb-3 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">CP Coins</h1>
          <p className="text-contentMuted text-lg font-sans">Manage your balance and earn rewards</p>
        </div>

        {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

        {success && (
          <div className="mb-6 bg-neon-emerald/10 border border-neon-emerald/30 shadow-[0_0_15px_rgba(0,255,157,0.1)] rounded-xl p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="text-neon-emerald flex-shrink-0 mt-1 drop-shadow-[0_0_8px_rgba(0,255,157,0.6)]" size={20} />
              <p className="text-neon-emerald font-bold tracking-wide">{success}</p>
            </div>
          </div>
        )}

        {/* Balance Card */}
        <div className="glass-panel relative overflow-hidden p-8 mb-12 group hover:shadow-glow-cyan transition-all duration-500">
          <div className="absolute top-0 right-0 w-64 h-64 bg-neon-cyan/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 group-hover:bg-neon-cyan/20 transition-colors pointer-events-none"></div>

          <div className="flex items-center gap-4 mb-6 relative z-10">
            <div className="w-16 h-16 bg-neon-cyan/10 border border-neon-cyan/20 rounded-2xl flex items-center justify-center">
              <Wallet className="text-neon-cyan drop-shadow-[0_0_8px_rgba(0,240,255,0.6)]" size={32} />
            </div>
            <div>
              <p className="text-contentMuted text-sm font-bold tracking-widest uppercase mb-1">Your Balance</p>
              <div className="flex items-baseline gap-2">
                <p className="text-6xl font-mono font-bold neon-text-cyan tracking-tight">{user?.cpcBalance?.toLocaleString() || 0}</p>
                <span className="text-neon-cyan/70 font-mono font-bold text-xl">CPC</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => window.location.href = '/buy-coins'}
            className="btn-primary w-full sm:w-auto relative z-10 text-lg px-8 py-4"
          >
            Buy CP Coins
          </button>
        </div>

        {/* Earn Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-heading font-bold text-white mb-3 flex items-center gap-3">
            <Gift className="text-neon-violet" size={32} />
            Earn CP Coins
          </h2>
          <p className="text-contentMuted font-sans">Complete tasks below to earn free CP Coins instantly</p>
        </div>

        {/* Tasks List */}
        <div className="space-y-6">
          {/* Earn Free 75 CP Coins Ad Task */}
          <div className="glass-panel p-6 group hover:shadow-glow-cyan hover:border-neon-cyan/30 transition-all duration-300">
            <div className="flex items-start sm:items-center justify-between gap-6 flex-col sm:flex-row">
              <div className="flex items-start gap-5 flex-1 w-full">
                <div className="w-14 h-14 bg-neon-cyan/10 border border-neon-cyan/20 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <Zap className="text-neon-cyan drop-shadow-[0_0_8px_rgba(0,240,255,0.6)]" size={28} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-2 font-heading tracking-wide">Earn Free 75 CP Coins</h3>
                  <p className="text-contentMuted text-sm font-sans mb-4 max-w-lg">
                    Watch a short video until the end to claim your reward. No skipping allowed!
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold font-mono neon-text-cyan tracking-tight">+75</span>
                    <span className="text-neon-cyan/70 font-bold font-mono">CPC</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleWatchAd}
                disabled={isAdLoading || processingTask === 'ad_reward'}
                className={`w-full sm:w-auto px-8 py-4 rounded-xl font-bold font-mono tracking-wider transition-all flex-shrink-0 ${isAdLoading
                    ? 'bg-surface border border-surfaceBorder text-contentMuted cursor-not-allowed'
                    : 'bg-neon-cyan/10 border border-neon-cyan/50 text-neon-cyan hover:bg-neon-cyan hover:text-charcoal hover:shadow-[0_0_20px_rgba(0,240,255,0.4)]'
                  }`}
              >
                {isAdLoading ? 'LOADING...' : 'WATCH & EARN'}
              </button>
            </div>
          </div>

          {/* Welcome Bonus */}
          <div className="glass-panel p-6 group hover:shadow-glow-emerald hover:border-neon-emerald/30 transition-all duration-300">
            <div className="flex items-start sm:items-center justify-between gap-6 flex-col sm:flex-row">
              <div className="flex items-start gap-5 flex-1 w-full">
                <div className="w-14 h-14 bg-neon-emerald/10 border border-neon-emerald/20 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <Gift className="text-neon-emerald drop-shadow-[0_0_8px_rgba(0,255,157,0.6)]" size={28} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-2 font-heading tracking-wide">Welcome Bonus</h3>
                  <p className="text-contentMuted text-sm font-sans mb-4 max-w-lg">
                    Get started with a special one-time bonus for new users!
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold font-mono neon-text-emerald tracking-tight">+500</span>
                    <span className="text-neon-emerald/70 font-bold font-mono">CPC</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleClaimWelcomeBonus}
                disabled={tasks.find(t => t.type === 'welcome')?.completed || processingTask === 'welcome'}
                className={`w-full sm:w-auto px-8 py-4 rounded-xl font-bold font-mono tracking-wider transition-all flex-shrink-0 ${tasks.find(t => t.type === 'welcome')?.completed
                    ? 'bg-surface border border-surfaceBorder text-contentMuted cursor-not-allowed'
                    : 'bg-neon-emerald/10 border border-neon-emerald/50 text-neon-emerald hover:bg-neon-emerald hover:text-charcoal hover:shadow-[0_0_20px_rgba(0,255,157,0.4)]'
                  }`}
              >
                {processingTask === 'welcome' ? 'CLAIMING...' :
                  tasks.find(t => t.type === 'welcome')?.completed ? 'CLAIMED' : 'CLAIM BONUS'}
              </button>
            </div>
          </div>

          {/* Join News Channel */}
          <div className="glass-panel p-6 group hover:shadow-glow-cyan hover:border-neon-cyan/30 transition-all duration-300">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="flex items-start gap-4 flex-1">
                <div className="w-14 h-14 bg-neon-cyan/10 border border-neon-cyan/20 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <Bell className="text-neon-cyan drop-shadow-[0_0_8px_rgba(0,240,255,0.6)]" size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-1 font-heading tracking-wide">Join the News Channel</h3>
                  <p className="text-contentMuted text-sm leading-relaxed mb-3">
                    Stay updated with the latest news and announcements from CP Gram!
                  </p>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl font-mono font-bold neon-text-cyan">+250</span>
                    <span className="text-contentMuted font-bold text-sm">CPC</span>
                  </div>
                  <a
                    href="https://t.me/cpgram_news"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-neon-cyan/80 hover:text-neon-cyan text-sm font-bold tracking-wide transition-colors"
                  >
                    @cpgram_news <ExternalLink size={14} />
                  </a>
                </div>
              </div>

              <button
                onClick={handleJoinChannel}
                disabled={tasks.find(t => t.type === 'join_channel')?.completed || processingTask === 'join_channel'}
                className={`w-full sm:w-auto px-8 py-4 rounded-xl font-bold transition-all flex-shrink-0 font-mono tracking-wide ${tasks.find(t => t.type === 'join_channel')?.completed
                    ? 'bg-surface border border-surfaceBorder text-contentMuted cursor-not-allowed'
                    : 'bg-neon-cyan/10 border border-neon-cyan/50 text-neon-cyan hover:bg-neon-cyan hover:text-charcoal hover:shadow-[0_0_20px_rgba(0,240,255,0.4)]'
                  }`}
              >
                {processingTask === 'join_channel' ? 'VERIFYING...' :
                  tasks.find(t => t.type === 'join_channel')?.completed ? 'JOINED' : 'JOIN NOW'}
              </button>
            </div>
          </div>

          {/* Claim 5000 CP Coins - NEW INVITE TASK */}
          <div className="glass-panel p-6 group hover:shadow-glow-violet hover:border-neon-violet/30 transition-all duration-300">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="flex items-start gap-4 flex-1">
                <div className="w-14 h-14 bg-neon-violet/10 border border-neon-violet/20 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <Users className="text-neon-violet drop-shadow-[0_0_8px_rgba(138,43,226,0.6)]" size={28} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-1 font-heading tracking-wide">Claim 5,000 CP Coins</h3>
                  <p className="text-contentMuted text-sm leading-relaxed mb-3">
                    Share CP Gram's promotional material on your channel for 12 hours and earn a massive reward!
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-mono font-bold neon-text-violet">+5,000</span>
                    <span className="text-contentMuted font-bold text-sm">CPC</span>
                  </div>

                  {inviteTaskCompleted && (
                    <div className="mt-4 bg-neon-emerald/10 border border-neon-emerald/30 rounded-lg p-3 inline-block">
                      <p className="text-neon-emerald font-mono text-sm font-bold tracking-wide">
                        ✅ Task completed! Check back later.
                      </p>
                    </div>
                  )}

                  {activeInviteTask && !inviteTaskCompleted && (
                    <div className="mt-4 bg-neon-violet/10 border border-neon-violet/30 rounded-lg p-3 inline-block">
                      <p className="text-neon-violet font-mono text-sm flex items-center gap-2 font-bold tracking-wide">
                        {activeInviteTask.status === 'pending_posting' && (
                          <>
                            <Clock size={16} />
                            Task in progress - Click to continue
                          </>
                        )}
                        {activeInviteTask.status === 'active' && (
                          <>
                            <Zap size={16} className="animate-pulse" />
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
                className={`w-full sm:w-auto px-8 py-4 rounded-xl font-bold transition-all flex-shrink-0 font-mono tracking-wide ${inviteTaskCompleted
                    ? 'bg-surface border border-surfaceBorder text-contentMuted cursor-not-allowed'
                    : 'bg-neon-violet/10 border border-neon-violet/50 text-neon-violet hover:bg-neon-violet hover:text-charcoal hover:shadow-[0_0_20px_rgba(138,43,226,0.4)]'
                  }`}
              >
                {processingTask === 'invite_task' ? 'PROCESSING...' :
                  inviteTaskCompleted ? 'COMPLETED' :
                    activeInviteTask ? 'CONTINUE' : 'START TASK'}
              </button>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-12 glass-panel p-8 border-neon-cyan/20 bg-neon-cyan/5">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-neon-cyan/10 rounded-full">
              <AlertCircle className="text-neon-cyan flex-shrink-0" size={24} />
            </div>
            <div>
              <p className="text-white text-lg font-bold mb-3 font-heading">How it works</p>
              <ul className="text-contentMuted text-sm space-y-2 font-sans">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-neon-cyan"></span>
                  Complete tasks to earn CP Coins instantly
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-neon-cyan"></span>
                  Most tasks can only be claimed once
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-neon-cyan"></span>
                  5,000 CP task can be renewed by admin
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-neon-cyan"></span>
                  Use CP Coins to pay for cross-promotions
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Channel Selector Modal */}
        {showChannelSelector && user?.channels && (
          <div className="fixed inset-0 bg-obsidian/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="glass-panel p-8 max-w-md w-full animate-fade-in-up border-neon-cyan/30 shadow-[0_0_30px_rgba(0,240,255,0.1)]">

              {!selectedChannelIdForInvite ? (
                <>
                  <h3 className="text-2xl font-heading font-bold text-white mb-6">Select Channel</h3>

                  <div className="space-y-3 mb-8 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                    {user.channels
                      .filter((ch: any) => ch.status === 'Active' || ch.status === 'approved')
                      .map((channel: any) => (
                        <button
                          key={channel.id}
                          onClick={() => handleSelectChannel(channel.id)}
                          className="w-full bg-surface hover:bg-neon-cyan/10 border border-surfaceBorder hover:border-neon-cyan/50 rounded-xl p-4 text-left transition-all group"
                        >
                          <p className="text-white font-bold group-hover:text-neon-cyan transition-colors">{channel.name}</p>
                          <p className="text-contentMuted font-mono text-sm mt-1">{channel.subs?.toLocaleString()} subs</p>
                        </button>
                      ))}
                  </div>

                  <button
                    onClick={() => {
                      setShowChannelSelector(false);
                      setSelectedChannelIdForInvite(null);
                    }}
                    className="w-full btn-secondary"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <h3 className="text-2xl font-heading font-bold text-white mb-6">Schedule Time Slot</h3>
                  <div className="space-y-6 mb-8">
                    <div>
                      <label className="block text-xs font-bold tracking-widest uppercase text-contentMuted mb-2 ml-1">
                        Select Day
                      </label>
                      <div className="relative">
                        <select
                          value={daySelected}
                          onChange={(e) => setDaySelected(e.target.value)}
                          className="input-glass w-full text-white appearance-none"
                        >
                          {DAYS_OF_WEEK.map(day => (
                            <option key={day} value={day} className="bg-charcoal text-white">{day}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold tracking-widest uppercase text-contentMuted mb-2 ml-1">
                        Select Time (UTC)
                      </label>
                      <div className="relative">
                        <select
                          value={timeSelected}
                          onChange={(e) => setTimeSelected(e.target.value)}
                          className="input-glass w-full appearance-none tracking-widest font-mono text-neon-cyan"
                        >
                          {TIME_SLOTS.map(slot => (
                            <option key={slot} value={slot} className="bg-charcoal text-white tracking-widest">{slot}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={() => setSelectedChannelIdForInvite(null)}
                      className="w-full btn-secondary"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleConfirmSchedule}
                      disabled={processingTask === 'invite_task'}
                      className="w-full bg-neon-cyan/20 border border-neon-cyan/50 hover:bg-neon-cyan hover:text-charcoal text-neon-cyan py-3 rounded-xl font-bold transition-all disabled:opacity-50"
                    >
                      {processingTask === 'invite_task' ? 'SAVING...' : 'SCHEDULE BOT'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Invite Task Modal */}
        {showInviteTaskModal && activeInviteTask && (
          <div className="fixed inset-0 bg-obsidian/90 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <div className="glass-panel p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar animate-fade-in-up border-neon-violet/30 shadow-[0_0_30px_rgba(138,43,226,0.1)]">
              <div className="flex items-start justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-heading font-bold text-white mb-2">Invite Task</h2>
                  <p className="text-neon-violet/80 font-mono text-sm">Channel: {activeInviteTask.channel_name}</p>
                </div>
                <button
                  onClick={() => setShowInviteTaskModal(false)}
                  className="w-10 h-10 rounded-full bg-surface border border-surfaceBorder flex items-center justify-center text-contentMuted hover:text-white hover:border-white transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="mb-8">
                <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-mono font-bold border ${activeInviteTask.status === 'pending_posting' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30 shadow-[0_0_10px_rgba(234,179,8,0.2)]' :
                    activeInviteTask.status === 'active' ? 'bg-neon-emerald/10 text-neon-emerald border-neon-emerald/30 shadow-[0_0_10px_rgba(0,255,157,0.2)]' :
                      'bg-surface text-contentMuted border-surfaceBorder'
                  }`}>
                  {activeInviteTask.status === 'pending_posting' && <><Clock size={16} />PENDING POSTING</>}
                  {activeInviteTask.status === 'active' && <><Zap size={16} />TIMER ACTIVE</>}
                  {activeInviteTask.status === 'completed' && <><CheckCircle size={16} />COMPLETED</>}
                </span>
              </div>

              {activeInviteTask.status === 'pending_posting' && (
                <div className="bg-charcoal border border-surfaceBorder rounded-xl p-6 text-center shadow-[0_0_15px_rgba(0,0,0,0.5)]">
                  <Clock className="w-12 h-12 text-yellow-400 mx-auto mb-4 opacity-80" />
                  <h4 className="text-white font-heading font-bold mb-3 text-lg">Awaiting Bot Execution</h4>
                  <p className="text-contentMuted text-sm font-sans mx-auto max-w-md leading-relaxed">
                    The CP Gram backend bot is safely monitoring the scheduler block. It will natively post the invite material and start counting your 12 hours exactly on your selected time!
                  </p>
                  <div className="mt-5 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 inline-block">
                    <span className="text-yellow-400 text-xs font-mono tracking-widest uppercase font-bold text-center block">Zero manual action needed.</span>
                  </div>
                </div>
              )}

              {activeInviteTask.status === 'active' && (
                <div className="space-y-8">
                  <div className="bg-neon-emerald/10 border border-neon-emerald/30 shadow-[0_0_20px_rgba(0,255,157,0.15)] rounded-2xl p-10 text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-neon-emerald/5 mix-blend-overlay animate-pulse-glow"></div>
                    <Zap className="w-16 h-16 text-neon-emerald mx-auto mb-6 drop-shadow-[0_0_10px_rgba(0,255,157,0.8)]" />
                    <h4 className="text-white text-2xl font-heading font-bold mb-4 relative z-10">Task Active!</h4>
                    <div className="text-5xl font-mono font-bold neon-text-emerald mb-3 tracking-tight relative z-10">
                      {formatTimeLeft(timeLeft)}
                    </div>
                    <p className="text-contentMuted font-mono text-sm tracking-widest uppercase relative z-10">Time remaining</p>
                  </div>

                  <div className="bg-surface border border-surfaceBorder rounded-xl p-5 text-center mt-6 shadow-inner">
                    <p className="text-contentMuted text-sm font-sans leading-relaxed tracking-wide">
                      The background bot will automatically delete the post when the timer reaches zero and instantly dispense your 5000 CP Coin reward directly to your wallet!
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}