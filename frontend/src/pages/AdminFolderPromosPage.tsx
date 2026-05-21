import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';
import { useAuth } from '../hooks/useAuth';
import apiService from '../services/api';
import { Folder, CheckCircle, Save, X, Edit } from 'lucide-react';

export default function AdminFolderPromosPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [configs, setConfigs] = useState<any[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);

  const [activeTab, setActiveTab] = useState<'configs' | 'registrations'>('registrations');
  const [selectedConfig, setSelectedConfig] = useState<any>(null);

  // Reject Modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingId, setRejectingId] = useState('');
  const [rejectReason, setRejectReason] = useState('Channel does not meet criteria for this niche.');
  const [rejecting, setRejecting] = useState(false);


  useEffect(() => {
    if (!user?.isAdmin) {
      navigate('/dashboard');
      return;
    }
    fetchData();
  }, [user, navigate, activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'configs') {
        const confs = await apiService.adminGetFolderPromoConfigs();
        setConfigs(confs || []);
      } else {
        const regs = await apiService.adminGetFolderPromoRegistrations();
        setRegistrations(regs || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (regId: string) => {
    try {
      setError(null);
      await apiService.adminApproveFolderPromo(regId);
      setSuccess('Registration approved successfully');
      setRegistrations(prev => prev.map(r => r.id === regId ? { ...r, status: 'approved' } : r));
    } catch (err: any) {
      setError(err.message || 'Failed to approve');
    }
  };

  const openRejectModal = (regId: string) => {
    setRejectingId(regId);
    setRejectReason('Channel does not meet criteria for this niche.');
    setShowRejectModal(true);
  };

  const handleReject = async () => {
    try {
      setRejecting(true);
      setError(null);
      await apiService.adminRejectFolderPromo(rejectingId, rejectReason);
      setSuccess('Registration rejected and CPC refunded.');
      setShowRejectModal(false);
      setRegistrations(prev => prev.map(r => r.id === rejectingId ? { ...r, status: 'rejected', admin_reason: rejectReason } : r));
    } catch (err: any) {
      setError(err.message || 'Failed to reject');
    } finally {
      setRejecting(false);
    }
  };

  const saveConfig = async () => {
    if (!selectedConfig?.niche || !selectedConfig?.folder_link) {
      setError('Niche and Folder Link are required.');
      return;
    }
    try {
      setError(null);
      await apiService.adminSaveFolderPromoConfig(selectedConfig);
      setSuccess('Config saved successfully');
      setSelectedConfig(null);
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to save config');
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
        <div className="mb-8">
          <h1 className="text-3xl font-heading font-bold text-white mb-2 flex items-center gap-3">
            <Folder className="text-neon-pink" size={32} />
            Admin Folder Promos
          </h1>
          <p className="text-contentMuted font-sans">
            Manage niches and user registrations.
          </p>
        </div>

        {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

        {success && (
          <div className="mb-6 bg-neon-emerald/10 border border-neon-emerald/30 shadow-[0_0_15px_rgba(0,255,157,0.1)] rounded-xl p-4 flex items-center gap-3">
            <CheckCircle className="text-neon-emerald flex-shrink-0" size={20} />
            <p className="text-neon-emerald font-bold tracking-wide">{success}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex space-x-4 mb-8 border-b border-surfaceBorder pb-1">
          <button
            onClick={() => setActiveTab('registrations')}
            className={`px-4 py-2 font-mono tracking-widest font-bold uppercase transition-all duration-300 ${activeTab === 'registrations' ? 'text-neon-pink border-b-2 border-neon-pink' : 'text-contentMuted hover:text-white'
              }`}
          >
            Registrations
          </button>
          <button
            onClick={() => setActiveTab('configs')}
            className={`px-4 py-2 font-mono tracking-widest font-bold uppercase transition-all duration-300 ${activeTab === 'configs' ? 'text-neon-pink border-b-2 border-neon-pink' : 'text-contentMuted hover:text-white'
              }`}
          >
            Niche Configs
          </button>
        </div>

        {/* Registrations Tab */}
        {activeTab === 'registrations' && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-6 font-heading">User Submissions</h2>
            {registrations.length === 0 ? (
              <p className="text-contentMuted p-8 text-center bg-surface border border-surfaceBorder rounded-xl">No registrations found.</p>
            ) : (
              <div className="space-y-4">
                {registrations.map(reg => (
                  <div key={reg.id} className="glass-panel p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-white mb-1">{reg.channel_name}</h3>
                      <p className="text-sm font-mono text-contentMuted tracking-wide mb-2">Niche: <span className="text-neon-cyan">{reg.niche}</span></p>
                      <div className="text-xs text-contentMuted">
                        Status: <span className={`font-bold ml-1 ${reg.status === 'pending' ? 'text-yellow-400' :
                            reg.status === 'approved' ? 'text-neon-emerald' : 'text-neon-pink'
                          }`}>{reg.status.toUpperCase()}</span>
                      </div>
                    </div>

                    {reg.status === 'pending' && (
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleApprove(reg.id)}
                          className="px-4 py-2 bg-neon-emerald/10 text-neon-emerald border border-neon-emerald/30 hover:bg-neon-emerald hover:text-charcoal rounded-lg font-bold transition-all text-sm"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => openRejectModal(reg.id)}
                          className="px-4 py-2 bg-neon-pink/10 text-neon-pink border border-neon-pink/30 hover:bg-neon-pink hover:text-white rounded-lg font-bold transition-all text-sm"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Configs Tab */}
        {activeTab === 'configs' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white font-heading">Niche Configurations</h2>
              <button
                onClick={() => setSelectedConfig({ niche: '', text: '', folder_link: '', image_url: '' })}
                className="btn-primary"
              >
                Add Niche
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {configs.map(conf => (
                <div key={conf.niche} className="glass-panel p-6 relative">
                  <button
                    onClick={() => setSelectedConfig(conf)}
                    className="absolute top-4 right-4 p-2 text-contentMuted hover:text-neon-pink transition-colors"
                  >
                    <Edit size={18} />
                  </button>
                  <h3 className="text-xl font-bold text-white mb-2">{conf.niche}</h3>
                  <div className="space-y-3 mt-4 text-sm">
                    <p><span className="text-contentMuted uppercase font-mono tracking-widest text-xs">Folder Link:</span> <br className="mb-1" /><a href={conf.folder_link} target="_blank" rel="noreferrer" className="text-neon-cyan truncate block">{conf.folder_link}</a></p>
                    <p><span className="text-contentMuted uppercase font-mono tracking-widest text-xs">Promo Text:</span> <br className="mb-1" /><span className="text-white line-clamp-2">{conf.text || 'N/A'}</span></p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Edit/Add Config Modal */}
        {selectedConfig && (
          <div className="fixed inset-0 bg-obsidian/90 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <div className="glass-panel p-8 max-w-lg w-full animate-fade-in-up border-neon-pink/30 shadow-[0_0_30px_rgba(255,0,85,0.1)]">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white font-heading">{selectedConfig.niche ? 'Edit' : 'Add'} Niche Config</h2>
                <button onClick={() => setSelectedConfig(null)} className="text-contentMuted hover:text-white"><X size={24} /></button>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-bold tracking-widest text-contentMuted uppercase mb-2 ml-1">Niche Name</label>
                  <input
                    type="text"
                    className="input-glass w-full"
                    placeholder="e.g. Sports"
                    value={selectedConfig.niche}
                    onChange={e => setSelectedConfig({ ...selectedConfig, niche: e.target.value })}
                    disabled={configs.some(c => c.niche === selectedConfig.niche)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold tracking-widest text-contentMuted uppercase mb-2 ml-1">Folder Link</label>
                  <input
                    type="text"
                    className="input-glass w-full"
                    placeholder="https://t.me/addlist/..."
                    value={selectedConfig.folder_link}
                    onChange={e => setSelectedConfig({ ...selectedConfig, folder_link: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold tracking-widest text-contentMuted uppercase mb-2 ml-1">Promo Text (HTML supported)</label>
                  <textarea
                    className="input-glass w-full min-h-[100px]"
                    placeholder="Best channels in this niche! Join now."
                    value={selectedConfig.text}
                    onChange={e => setSelectedConfig({ ...selectedConfig, text: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold tracking-widest text-contentMuted uppercase mb-2 ml-1">Banner Image URL (Optional)</label>
                  <input
                    type="text"
                    className="input-glass w-full"
                    placeholder="https://..."
                    value={selectedConfig.image_url}
                    onChange={e => setSelectedConfig({ ...selectedConfig, image_url: e.target.value })}
                  />
                </div>
              </div>

              <button
                onClick={saveConfig}
                className="w-full btn-primary flex items-center justify-center gap-2"
              >
                <Save size={18} />
                Save Configuration
              </button>
            </div>
          </div>
        )}

        {/* Reject Modal */}
        {showRejectModal && (
          <div className="fixed inset-0 bg-obsidian/90 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <div className="glass-panel p-8 max-w-md w-full animate-fade-in-up border-neon-pink/30 shadow-[0_0_30px_rgba(255,0,85,0.1)]">
              <h2 className="text-2xl font-bold text-white mb-6 font-heading">Reject Registration</h2>

              <div className="mb-6">
                <label className="block text-xs font-bold tracking-widest text-contentMuted uppercase mb-2 ml-1">Reason for Rejection</label>
                <textarea
                  className="input-glass w-full min-h-[100px]"
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                />
                <p className="text-xs text-contentMuted mt-2">The user will be notified and their 10,000 CPC will be refunded.</p>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="btn-secondary w-full"
                  disabled={rejecting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={rejecting || !rejectReason}
                  className="w-full bg-neon-pink/20 border border-neon-pink/50 hover:bg-neon-pink hover:text-white text-neon-pink py-3 rounded-xl font-bold transition-all disabled:opacity-50"
                >
                  {rejecting ? 'Rejecting...' : 'Confirm Reject'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
