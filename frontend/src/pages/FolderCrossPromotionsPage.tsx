import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';
import { useAuth } from '../hooks/useAuth';
import apiService from '../services/api';
import { Folder, CheckCircle, Clock, AlertCircle, Users } from 'lucide-react';

export default function FolderCrossPromotionsPage() {
  const { user, fetchUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [registrations, setRegistrations] = useState<any[]>([]);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedChannelId, setSelectedChannelId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const regs = await apiService.getUserFolderPromos();
      setRegistrations(regs || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const eligibleChannels = user?.channels?.filter((ch: any) => ch.status === 'Active') || [];

  const handleSubmit = async () => {
    if (!selectedChannelId) {
      setError('Please select a channel');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await apiService.submitFolderPromo(selectedChannelId);
      if (res.ok) {
        setSuccess('Channel successfully submitted for Folder Promotion!');
        setShowSubmitModal(false);
        setSelectedChannelId('');
        await fetchData();
        await fetchUser();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to submit channel');
    } finally {
      setSubmitting(false);
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in-up">
        <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-heading font-bold text-white mb-2 flex items-center gap-3">
              <Folder className="text-neon-cyan" size={32} />
              Folder Promotions
            </h1>
            <p className="text-contentMuted font-sans">
              Join exclusive mass cross-promotions based on your channel's niche.
            </p>
          </div>
          <button
            onClick={() => setShowSubmitModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Folder size={18} />
            Submit Channel (10,000 CPC)
          </button>
        </div>

        {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

        {success && (
          <div className="mb-6 bg-neon-emerald/10 border border-neon-emerald/30 shadow-[0_0_15px_rgba(0,255,157,0.1)] rounded-xl p-4 flex items-center gap-3">
            <CheckCircle className="text-neon-emerald" size={20} />
            <p className="text-neon-emerald font-bold tracking-wide">{success}</p>
          </div>
        )}

        <div className="glass-panel p-6 border-neon-cyan/20 bg-neon-cyan/5 mb-8">
          <div className="flex items-start gap-4">
            <AlertCircle className="text-neon-cyan flex-shrink-0 mt-1" size={24} />
            <div>
              <h3 className="text-lg font-bold text-white mb-2">How it works</h3>
              <ul className="space-y-2 text-contentMuted text-sm list-disc pl-4">
                <li>Submit your active channel. The system automatically groups it into its respective niche folder.</li>
                <li>A fee of 10,000 CPC is required upon submission. It is fully refunded if admins reject your submission.</li>
                <li>Every Saturday at 16:00 UTC, the bot automatically posts the folder link to all approved channels in the niche.</li>
                <li>After 12 hours, the bot automatically deletes the promo post and rewards you with 350 CPC!</li>
              </ul>
            </div>
          </div>
        </div>

        <h2 className="text-2xl font-heading font-bold text-white mb-6">Your Registrations</h2>

        {registrations.length === 0 ? (
          <div className="glass-panel p-12 text-center">
            <Folder className="w-16 h-16 text-contentMuted mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-bold text-white mb-2">No Registrations Yet</h3>
            <p className="text-contentMuted mb-6">Submit a channel to join the folder cross promotions.</p>
            <button
              onClick={() => setShowSubmitModal(true)}
              className="btn-primary"
            >
              Submit Channel
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {registrations.map(reg => (
              <div key={reg.id} className="glass-panel p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1">
                    <h3 className="font-bold text-white text-lg truncate">{reg.channel_name}</h3>
                    <p className="text-xs text-contentMuted uppercase tracking-wider font-mono mt-1">Niche: {reg.niche}</p>
                  </div>
                </div>

                <div className="mb-4">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-mono tracking-wide border ${reg.status === 'approved' ? 'bg-neon-emerald/10 text-neon-emerald border-neon-emerald/30' :
                      reg.status === 'rejected' ? 'bg-neon-pink/10 text-neon-pink border-neon-pink/30' :
                        'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                    }`}>
                    {reg.status === 'approved' && <CheckCircle size={14} />}
                    {reg.status === 'pending' && <Clock size={14} />}
                    {reg.status === 'rejected' && <AlertCircle size={14} />}
                    {reg.status.toUpperCase()}
                  </span>
                </div>

                {reg.status === 'rejected' && reg.admin_reason && (
                  <div className="bg-neon-pink/10 border border-neon-pink/20 rounded p-3 text-sm text-neon-pink/80 mb-2">
                    <span className="font-bold">Reason:</span> {reg.admin_reason}
                  </div>
                )}

                <div className="text-xs text-contentMuted font-mono">
                  Submitted: {new Date(reg.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Submit Modal */}
        {showSubmitModal && (
          <div className="fixed inset-0 bg-obsidian/90 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <div className="glass-panel p-8 max-w-md w-full animate-fade-in-up border-neon-cyan/30">
              <h2 className="text-2xl font-bold text-white mb-6 font-heading">Submit for Folder Promo</h2>

              <div className="mb-6 bg-charcoal rounded-xl p-4 border border-surfaceBorder cursor-pointer transition-colors" onClick={() => navigate('/cp-coins')}>
                <div className="flex justify-between items-center">
                  <span className="text-contentMuted font-bold text-sm tracking-widest uppercase">Your Balance</span>
                  <span className={`font-mono font-bold text-lg ${(user?.cpcBalance ?? 0) >= 10000 ? 'text-neon-emerald' : 'text-neon-pink'}`}>
                    {(user?.cpcBalance || 0).toLocaleString()} CPC
                  </span>
                </div>
              </div>

              {eligibleChannels.length === 0 ? (
                <div className="bg-surface border border-surfaceBorder p-4 rounded-xl text-center mb-6">
                  <Users className="w-8 h-8 text-contentMuted mx-auto mb-2" />
                  <p className="text-contentMuted text-sm">You don't have any active channels.</p>
                </div>
              ) : (
                <div className="mb-6">
                  <label className="block text-xs font-bold tracking-widest text-contentMuted uppercase mb-2 ml-1">
                    Select Channel
                  </label>
                  <select
                    value={selectedChannelId}
                    onChange={e => setSelectedChannelId(e.target.value)}
                    className="input-glass w-full"
                  >
                    <option value="">-- Choose an active channel --</option>
                    {eligibleChannels.map((ch: any) => (
                      <option key={ch.id} value={ch.id}>{ch.name} ({ch.topic})</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-4">
                <button
                  onClick={() => setShowSubmitModal(false)}
                  className="btn-secondary w-full"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !selectedChannelId || (user?.cpcBalance || 0) < 10000}
                  className="btn-primary w-full disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Pay 10,000 CPC'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

//for deployment sake