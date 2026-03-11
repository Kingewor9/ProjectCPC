import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';
import { useAuth } from '../hooks/useAuth';
import apiService from '../services/api';
import { CrossPromoRequest, Channel, Promo } from '../types';
import { Clock, CheckCircle, Zap, X, XCircle } from 'lucide-react';

export default function RequestsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [requests, setRequests] = useState<CrossPromoRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [declining, setDeclining] = useState<string | null>(null);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<CrossPromoRequest | null>(null);
  const [selectedPromo, setSelectedPromo] = useState<Promo | null>(null);
  const [declineReason, setDeclineReason] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const fetchRequests = async () => {
      try {
        setLoading(true);
        const data = await apiService.listRequests();
        setRequests(data);
      } catch (err) {
        setError('Failed to load requests');
        console.error('Error loading requests:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [user, navigate]);

  const openAcceptModal = (request: CrossPromoRequest) => {
    setSelectedRequest(request);
    setSelectedPromo(null);
    setShowAcceptModal(true);
  };

  const closeAcceptModal = () => {
    setShowAcceptModal(false);
    setSelectedRequest(null);
    setSelectedPromo(null);
  };

  const openDeclineModal = (request: CrossPromoRequest) => {
    setSelectedRequest(request);
    setDeclineReason('');
    setShowDeclineModal(true);
  };

  const closeDeclineModal = () => {
    setShowDeclineModal(false);
    setSelectedRequest(null);
    setDeclineReason('');
  };

  const handleConfirmAccept = async () => {
    if (!selectedRequest || !selectedPromo) {
      setError('Please select a promo');
      return;
    }

    try {
      setAccepting(selectedRequest.id!);
      await apiService.acceptRequest(selectedRequest.id!, selectedPromo);
      
      setRequests(requests.map(r => 
        r.id === selectedRequest.id ? { ...r, status: 'Accepted' } : r
      ));
      closeAcceptModal();
      
      alert('Request accepted! Campaign created. Check your Campaigns page.');
    } catch (err) {
      setError('Failed to accept request');
      console.error('Error accepting request:', err);
    } finally {
      setAccepting(null);
    }
  };

  const handleConfirmDecline = async () => {
    if (!selectedRequest || !declineReason.trim()) {
      setError('Please provide a reason for declining');
      return;
    }

    try {
      setDeclining(selectedRequest.id!);
      await apiService.declineRequest(selectedRequest.id!, declineReason);
      
      setRequests(requests.map(r => 
        r.id === selectedRequest.id ? { ...r, status: 'Rejected' } : r
      ));
      closeDeclineModal();
      
      alert('Request declined. The requester has been notified with your reason.');
    } catch (err: any) {
      const errorMsg = err?.response?.data?.error || 'Failed to decline request';
      setError(errorMsg);
      console.error('Error declining request:', err);
    } finally {
      setDeclining(null);
    }
  };

  if (loading || !user) {
    return (
      <Layout>
        <LoadingSpinner />
      </Layout>
    );
  }

  const getRecipientChannel = (request: CrossPromoRequest): Channel | undefined => {
    return user.channels.find(ch => ch.id === request.toChannelId);
  };

  const isIncomingRequest = (request: CrossPromoRequest): boolean => {
    return user.channels.some(ch => ch.id === request.toChannelId);
  };

  const isOutgoingRequest = (request: CrossPromoRequest): boolean => {
    return user.channels.some(ch => ch.id === request.fromChannelId);
  };

  const pendingRequests = requests.filter(r => r.status === 'Pending');
  const acceptedRequests = requests.filter(r => r.status === 'Accepted');
  const rejectedRequests = requests.filter(r => r.status === 'Rejected');

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 pb-32 animate-fade-in-up">
        {/* Header */}
        <div className="mb-10 sm:mb-12">
          <h1 className="text-4xl sm:text-5xl font-heading font-extrabold text-white mb-3 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">Cross-Promo Requests</h1>
          <p className="text-contentMuted text-lg font-sans">
            Manage your incoming and outgoing promotion requests
          </p>
        </div>

        {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

        {/* Pending Requests */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-6 relative group">
            <div className="absolute inset-0 bg-yellow-500/20 blur-xl rounded-full translate-x-12 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            <div className="w-12 h-12 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl flex items-center justify-center shadow-[0_0_15px_rgba(234,179,8,0.15)] relative z-10">
              <Clock size={24} className="text-yellow-500" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-heading font-bold text-white relative z-10">
              Pending <span className="text-yellow-500 ml-1">({pendingRequests.length})</span>
            </h2>
          </div>

          {pendingRequests.length === 0 ? (
            <div className="glass-panel p-16 text-center border-dashed border-2 flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-surface border border-surfaceBorder flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(0,0,0,0.3)]">
                 <Clock className="text-contentMuted" size={24} />
              </div>
              <p className="text-white font-heading font-bold text-xl mb-2">No pending requests</p>
              <p className="text-contentMuted font-sans">You're all caught up!</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {pendingRequests.map((request, idx) => (
                <div
                  key={request.id}
                  className="glass-panel p-6 sm:p-8 hover:border-yellow-500/50 hover:shadow-[0_0_20px_rgba(234,179,8,0.1)] transition-all group relative overflow-hidden animate-fade-in-up"
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-transparent via-surfaceBorder to-transparent group-hover:via-yellow-500 transition-colors"></div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="bg-surface/30 p-4 rounded-xl border border-surfaceBorder">
                      <p className="text-contentMuted text-[10px] sm:text-xs font-bold tracking-widest uppercase mb-2 flex items-center gap-2">
                        FROM {isOutgoingRequest(request) && <span className="text-neon-cyan px-2 py-0.5 bg-neon-cyan/10 rounded border border-neon-cyan/20">YOU</span>}
                      </p>
                      <p className="text-white font-heading font-bold text-lg sm:text-xl truncate">{request.fromChannel}</p>
                    </div>

                    <div className="bg-surface/30 p-4 rounded-xl border border-surfaceBorder">
                      <p className="text-contentMuted text-[10px] sm:text-xs font-bold tracking-widest uppercase mb-2 flex items-center gap-2">
                        TO {isIncomingRequest(request) && <span className="text-neon-emerald px-2 py-0.5 bg-neon-emerald/10 rounded border border-neon-emerald/20">YOU</span>}
                      </p>
                      <p className="text-white font-heading font-bold text-lg sm:text-xl truncate">{request.toChannel}</p>
                    </div>

                    <div className="bg-surface/30 p-4 rounded-xl border border-surfaceBorder flex flex-col justify-center">
                      <p className="text-contentMuted text-[10px] sm:text-xs font-bold tracking-widest uppercase mb-2">SCHEDULED</p>
                      <p className="text-white font-mono font-bold tracking-tight text-sm sm:text-base mb-1">
                        {request.daySelected} <span className="text-neon-cyan">{request.timeSelected}</span>
                      </p>
                      <p className="text-contentMuted text-xs font-mono font-bold">
                        {request.duration}h • <span className="text-yellow-500">{request.cpcCost} CP</span>
                      </p>
                    </div>
                  </div>

                  <div className="bg-charcoal/80 rounded-xl p-5 mb-6 border border-surfaceBorder relative">
                    <span className="absolute top-4 right-4 text-[10px] font-bold tracking-widest uppercase text-contentMuted bg-surface px-2 py-1 rounded">Promo</span>
                    <p className="text-white font-bold text-base sm:text-lg mb-2 pr-12">{request.promo.name}</p>
                    {request.promo.text && (
                      <div className="bg-surface/50 p-3 rounded-lg mb-3">
                        <p className="text-contentMuted text-xs sm:text-sm font-sans whitespace-pre-wrap">{request.promo.text}</p>
                      </div>
                    )}
                    <a
                      href={request.promo.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-neon-cyan hover:text-white text-xs sm:text-sm font-mono truncate hover:underline hover:underline-offset-4 transition-colors max-w-full"
                    >
                      {request.promo.link}
                    </a>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 mt-auto">
                    {isIncomingRequest(request) ? (
                      <>
                        <button
                          onClick={() => openAcceptModal(request)}
                          disabled={accepting === request.id}
                          className="flex-1 bg-neon-emerald/10 hover:bg-neon-emerald/20 border border-neon-emerald/30 hover:border-neon-emerald text-neon-emerald font-extrabold py-3.5 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 group tracking-widest text-sm"
                        >
                          <CheckCircle size={18} className="group-hover:scale-110 transition-transform" />
                          {accepting === request.id ? 'ACCEPTING...' : 'ACCEPT REQUEST'}
                        </button>
                        <button
                          onClick={() => openDeclineModal(request)}
                          disabled={declining === request.id}
                          className="flex-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500 text-red-500 font-extrabold py-3.5 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 group tracking-widest text-sm"
                        >
                          <XCircle size={18} className="group-hover:scale-110 transition-transform" />
                          {declining === request.id ? 'DECLINING...' : 'DECLINE'}
                        </button>
                      </>
                    ) : (
                      <div className="flex-1 text-center py-3.5 bg-surface/50 border border-surfaceBorder border-dashed rounded-xl text-contentMuted text-xs sm:text-sm font-bold tracking-widest uppercase flex items-center justify-center gap-2">
                        <Clock size={16} className="text-yellow-500/50" />
                        Awaiting response from {request.toChannel}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Accepted Requests */}
        {acceptedRequests.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-6 relative group">
              <div className="absolute inset-0 bg-neon-emerald/20 blur-xl rounded-full translate-x-12 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
              <div className="w-12 h-12 bg-neon-emerald/10 border border-neon-emerald/30 rounded-2xl flex items-center justify-center shadow-[0_0_15px_rgba(0,255,157,0.15)] relative z-10">
                <CheckCircle size={24} className="text-neon-emerald" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-heading font-bold text-white relative z-10">
                Accepted <span className="text-neon-emerald ml-1">({acceptedRequests.length})</span>
              </h2>
            </div>

            <div className="grid gap-6">
              {acceptedRequests.map((request, idx) => (
                <div
                  key={request.id}
                  className="glass-panel p-6 sm:p-8 hover:border-neon-emerald/50 hover:shadow-[0_0_20px_rgba(0,255,157,0.1)] transition-all group relative overflow-hidden animate-fade-in-up"
                  style={{ animationDelay: `${(pendingRequests.length + idx) * 100}ms` }}
                >
                  <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-transparent via-neon-emerald/50 to-transparent group-hover:via-neon-emerald transition-colors"></div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-surface/30 p-4 rounded-xl border border-surfaceBorder/50">
                      <p className="text-contentMuted text-[10px] sm:text-xs font-bold tracking-widest uppercase mb-2">FROM</p>
                      <p className="text-white font-heading font-bold text-lg sm:text-xl truncate">{request.fromChannel}</p>
                    </div>

                    <div className="bg-surface/30 p-4 rounded-xl border border-surfaceBorder/50">
                      <p className="text-contentMuted text-[10px] sm:text-xs font-bold tracking-widest uppercase mb-2">TO</p>
                      <p className="text-white font-heading font-bold text-lg sm:text-xl truncate">{request.toChannel}</p>
                    </div>

                    <div className="bg-surface/30 p-4 rounded-xl border border-neon-emerald/20 flex flex-col justify-center">
                      <p className="text-contentMuted text-[10px] sm:text-xs font-bold tracking-widest uppercase mb-2">SCHEDULED</p>
                      <p className="text-white font-mono font-bold tracking-tight text-sm sm:text-base mb-2">
                        {request.daySelected} <span className="text-neon-cyan">{request.timeSelected}</span>
                      </p>
                      <span className="inline-block bg-neon-emerald/10 border border-neon-emerald/30 text-neon-emerald text-[10px] sm:text-xs px-3 py-1.5 rounded uppercase tracking-widest font-bold w-max shadow-[0_0_10px_rgba(0,255,157,0.1)]">
                        Campaign Scheduled
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rejected Requests */}
        {rejectedRequests.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-6 relative group">
              <div className="absolute inset-0 bg-red-500/20 blur-xl rounded-full translate-x-12 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
              <div className="w-12 h-12 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-center shadow-[0_0_15px_rgba(239,68,68,0.15)] relative z-10">
                <Zap size={24} className="text-red-500" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-heading font-bold text-white relative z-10">
                Rejected <span className="text-red-500 ml-1">({rejectedRequests.length})</span>
              </h2>
            </div>

            <div className="grid gap-6">
              {rejectedRequests.map((request, idx) => (
                <div
                  key={request.id}
                  className="glass-panel p-6 sm:p-8 opacity-75 hover:opacity-100 hover:border-red-500/50 hover:shadow-[0_0_20px_rgba(239,68,68,0.1)] transition-all group relative overflow-hidden animate-fade-in-up"
                  style={{ animationDelay: `${(pendingRequests.length + acceptedRequests.length + idx) * 100}ms` }}
                >
                  <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-transparent via-red-500/50 to-transparent group-hover:via-red-500 transition-colors"></div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-surface/20 p-4 rounded-xl border border-surfaceBorder/30">
                      <p className="text-contentMuted text-[10px] sm:text-xs font-bold tracking-widest uppercase mb-2">FROM</p>
                      <p className="text-contentMuted font-heading font-bold text-lg sm:text-xl truncate">{request.fromChannel}</p>
                    </div>

                    <div className="bg-surface/20 p-4 rounded-xl border border-surfaceBorder/30">
                      <p className="text-contentMuted text-[10px] sm:text-xs font-bold tracking-widest uppercase mb-2">TO</p>
                      <p className="text-contentMuted font-heading font-bold text-lg sm:text-xl truncate">{request.toChannel}</p>
                    </div>

                    <div className="flex flex-col justify-center items-start lg:items-end">
                      <span className="inline-block bg-red-500/10 border border-red-500/30 text-red-500 text-[10px] sm:text-xs px-3 py-1.5 rounded uppercase tracking-widest font-bold">
                        Rejected
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Accept Modal */}
        {showAcceptModal && selectedRequest && (
          <div className="fixed inset-0 bg-obsidian/90 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="glass-panel p-6 sm:p-8 max-w-md w-full relative overflow-hidden shadow-2xl scale-in-center border-neon-emerald/20">
              <div className="absolute top-0 right-0 w-32 h-32 bg-neon-emerald/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
              
              <div className="flex items-center justify-between mb-8 relative z-10 border-b border-surfaceBorder pb-4">
                <h2 className="text-2xl font-heading font-extrabold text-white flex items-center gap-3">
                  <span className="w-2 h-8 bg-neon-emerald rounded-full"></span>
                  Choose Promo
                </h2>
                <button
                  onClick={closeAcceptModal}
                  className="text-contentMuted hover:text-white bg-surface p-2 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="mb-8 relative z-10">
                <p className="text-contentMuted text-sm sm:text-base font-sans mb-6">
                  <strong className="text-white font-heading font-bold">{selectedRequest.fromChannel}</strong> is offering to post on your channel <strong className="text-neon-cyan font-heading font-bold">{selectedRequest.toChannel}</strong>. 
                  Choose which of your promos they will post:
                </p>

                {/* Get the recipient channel */}
                {getRecipientChannel(selectedRequest) ? (
                  <div className="space-y-4 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                    {getRecipientChannel(selectedRequest)!.promos.length === 0 ? (
                      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-5 text-center">
                        <p className="text-yellow-500 font-bold tracking-wide text-sm">
                          No promos available for {selectedRequest.toChannel}. Please add promos to this channel first.
                        </p>
                      </div>
                    ) : (
                      getRecipientChannel(selectedRequest)!.promos.map((promo) => (
                        <button
                          key={promo.id}
                          onClick={() => setSelectedPromo(promo)}
                          className={`w-full p-5 rounded-xl border-2 transition-all text-left relative overflow-hidden group ${
                            selectedPromo?.id === promo.id
                              ? 'border-neon-emerald bg-neon-emerald/5 shadow-[0_0_15px_rgba(0,255,157,0.15)]'
                              : 'border-surfaceBorder bg-surface/30 hover:border-contentMuted hover:bg-surface/50'
                          }`}
                        >
                          {selectedPromo?.id === promo.id && (
                            <div className="absolute top-0 right-0 p-2">
                              <CheckCircle className="text-neon-emerald" size={20} />
                            </div>
                          )}
                          <p className={`font-heading font-bold text-lg mb-2 ${selectedPromo?.id === promo.id ? 'text-neon-emerald' : 'text-white'}`}>{promo.name}</p>
                          {promo.text && <p className="text-contentMuted text-xs sm:text-sm font-sans line-clamp-2">{promo.text}</p>}
                        </button>
                      ))
                    )}
                  </div>
                ) : (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5 text-center">
                    <p className="text-red-500 font-bold tracking-wide text-sm">
                      Channel not found. This request may be invalid.
                    </p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col-reverse sm:flex-row gap-3 relative z-10">
                <button
                  onClick={closeAcceptModal}
                  className="w-full sm:w-1/2 bg-surface hover:bg-surface/80 border border-surfaceBorder hover:border-contentMuted text-white font-bold py-3.5 rounded-xl transition-all disabled:opacity-50"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleConfirmAccept}
                  disabled={!selectedPromo || accepting === selectedRequest.id}
                  className="w-full sm:w-1/2 bg-neon-emerald/20 hover:bg-neon-emerald text-neon-emerald hover:text-charcoal border border-neon-emerald font-extrabold py-3.5 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {accepting === selectedRequest.id ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current" />
                  ) : (
                    <>
                      <CheckCircle size={18} />
                      CONFIRM ACCEPT
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Decline Modal */}
        {showDeclineModal && selectedRequest && (
          <div className="fixed inset-0 bg-obsidian/90 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="glass-panel p-6 sm:p-8 max-w-md w-full relative overflow-hidden shadow-2xl scale-in-center border-red-500/20">
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
              
              <div className="flex items-center justify-between mb-8 relative z-10 border-b border-surfaceBorder pb-4">
                <h2 className="text-2xl font-heading font-extrabold text-white flex items-center gap-3">
                  <span className="w-2 h-8 bg-red-500 rounded-full"></span>
                  Decline Request
                </h2>
                <button
                  onClick={closeDeclineModal}
                  className="text-contentMuted hover:text-white bg-surface p-2 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="mb-8 relative z-10">
                <p className="text-contentMuted text-sm sm:text-base font-sans mb-6">
                  You're about to decline the request from <strong className="text-white font-heading font-bold">{selectedRequest.fromChannel}</strong>.
                </p>
                
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6 flex items-start gap-3">
                  <span className="text-2xl leading-none">⚠️</span>
                  <p className="text-yellow-500 text-xs sm:text-sm font-bold tracking-wide">
                    The requester will be notified with your reason. Please be professional and clear.
                  </p>
                </div>

                <label className="block text-xs font-bold tracking-widest uppercase text-contentMuted mb-3 ml-1">
                  Reason for declining <span className="text-red-500 normal-case text-lg leading-none">*</span>
                </label>
                <textarea
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder="E.g., 'Content doesn't match our channel theme' or 'Already fully booked for this time slot'"
                  rows={4}
                  maxLength={500}
                  className="input-glass w-full resize-none bg-surface/50 font-sans"
                />
                <div className="flex justify-end mt-2">
                  <p className="text-contentMuted text-[10px] font-mono font-bold tracking-widest">
                    {declineReason.length}/500
                  </p>
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-3 relative z-10">
                <button
                  onClick={closeDeclineModal}
                  className="w-full sm:w-1/2 bg-surface hover:bg-surface/80 border border-surfaceBorder hover:border-contentMuted text-white font-bold py-3.5 rounded-xl transition-all disabled:opacity-50"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleConfirmDecline}
                  disabled={!declineReason.trim() || declining === selectedRequest.id}
                  className="w-full sm:w-1/2 bg-red-500/20 hover:bg-red-500 text-red-500 hover:text-white border border-red-500 font-extrabold py-3.5 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {declining === selectedRequest.id ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current" />
                  ) : (
                    <>
                      <XCircle size={18} />
                      CONFIRM DECLINE
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}