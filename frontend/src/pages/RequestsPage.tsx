import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';
import { useAuth } from '../hooks/useAuth';
import apiService from '../services/api';
import { CrossPromoRequest } from '../types';
import { Clock, CheckCircle, Zap } from 'lucide-react';

export default function RequestsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [requests, setRequests] = useState<CrossPromoRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState<string | null>(null);

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

  const handleAcceptRequest = async (requestId: string) => {
    try {
      setAccepting(requestId);
      await apiService.acceptRequest(requestId);
      
      // Update request status locally
      setRequests(requests.map(r => 
        r.id === requestId ? { ...r, status: 'Accepted' } : r
      ));
    } catch (err) {
      setError('Failed to accept request');
      console.error('Error accepting request:', err);
    } finally {
      setAccepting(null);
    }
  };

  if (loading || !user) {
    return (
      <Layout>
        <LoadingSpinner />
      </Layout>
    );
  }

  const pendingRequests = requests.filter(r => r.status === 'Pending');
  const acceptedRequests = requests.filter(r => r.status === 'Accepted');
  const rejectedRequests = requests.filter(r => r.status === 'Rejected');

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Cross-Promo Requests</h1>
          <p className="text-grey-400">Manage your incoming and outgoing promotion requests</p>
        </div>

        {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

        {/* Pending Requests */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Clock size={24} className="text-yellow-400" />
            <h2 className="text-2xl font-bold text-white">
              Pending ({pendingRequests.length})
            </h2>
          </div>

          {pendingRequests.length === 0 ? (
            <div className="bg-darkBlue-800 border border-grey-700 rounded-lg p-8 text-center">
              <p className="text-grey-400">No pending requests</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="bg-darkBlue-800 border border-grey-700 rounded-lg p-6 hover:border-yellow-600/50 transition-all"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    {/* From */}
                    <div>
                      <p className="text-grey-400 text-sm font-medium mb-2">FROM</p>
                      <p className="text-white font-bold text-lg">{request.fromChannel}</p>
                    </div>

                    {/* To */}
                    <div>
                      <p className="text-grey-400 text-sm font-medium mb-2">TO</p>
                      <p className="text-white font-bold text-lg">{request.toChannel}</p>
                    </div>

                    {/* Details */}
                    <div>
                      <p className="text-grey-400 text-sm font-medium mb-2">SCHEDULED</p>
                      <p className="text-white font-bold">
                        {request.daySelected} {request.timeSelected}
                      </p>
                      <p className="text-grey-400 text-sm mt-1">
                        Duration: {request.duration}h • Cost: {request.cpcCost} CPC
                      </p>
                    </div>
                  </div>

                  {/* Promo Details */}
                  <div className="bg-darkBlue-700 rounded-lg p-4 mb-6 border border-grey-700">
                    <p className="text-white font-bold mb-2">{request.promo.name}</p>
                    {request.promo.text && <p className="text-grey-300 text-sm mb-2">{request.promo.text}</p>}
                    <a
                      href={request.promo.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 text-sm"
                    >
                      {request.promo.link}
                    </a>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleAcceptRequest(request.id!)}
                      disabled={accepting === request.id}
                      className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-grey-600 disabled:cursor-not-allowed text-white font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <CheckCircle size={18} />
                      {accepting === request.id ? 'Accepting...' : 'Accept Request'}
                    </button>
                    <button
                      className="flex-1 bg-grey-700 hover:bg-grey-600 text-white font-bold py-2 rounded-lg transition-colors"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Accepted Requests */}
        {acceptedRequests.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle size={24} className="text-green-400" />
              <h2 className="text-2xl font-bold text-white">
                Accepted ({acceptedRequests.length})
              </h2>
            </div>

            <div className="grid gap-6">
              {acceptedRequests.map((request) => (
                <div
                  key={request.id}
                  className="bg-darkBlue-800 border border-green-600/30 rounded-lg p-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <p className="text-grey-400 text-sm font-medium mb-2">FROM</p>
                      <p className="text-white font-bold text-lg">{request.fromChannel}</p>
                    </div>

                    <div>
                      <p className="text-grey-400 text-sm font-medium mb-2">TO</p>
                      <p className="text-white font-bold text-lg">{request.toChannel}</p>
                    </div>

                    <div>
                      <p className="text-grey-400 text-sm font-medium mb-2">SCHEDULED</p>
                      <p className="text-white font-bold">
                        {request.daySelected} {request.timeSelected}
                      </p>
                      <span className="inline-block mt-2 bg-green-600/20 text-green-300 text-xs px-3 py-1 rounded-full">
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
            <div className="flex items-center gap-3 mb-4">
              <Zap size={24} className="text-red-400" />
              <h2 className="text-2xl font-bold text-white">
                Rejected ({rejectedRequests.length})
              </h2>
            </div>

            <div className="grid gap-6">
              {rejectedRequests.map((request) => (
                <div
                  key={request.id}
                  className="bg-darkBlue-800 border border-red-600/30 rounded-lg p-6 opacity-75"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <p className="text-grey-400 text-sm font-medium mb-2">FROM</p>
                      <p className="text-white font-bold text-lg">{request.fromChannel}</p>
                    </div>

                    <div>
                      <p className="text-grey-400 text-sm font-medium mb-2">TO</p>
                      <p className="text-white font-bold text-lg">{request.toChannel}</p>
                    </div>

                    <div>
                      <span className="inline-block bg-red-600/20 text-red-300 text-xs px-3 py-1 rounded-full">
                        Rejected
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
