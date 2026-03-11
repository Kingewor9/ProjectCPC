import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { Send, Image, LinkIcon, MessageSquare, AlertCircle } from 'lucide-react';
import api from '../services/api';

export default function BroadcastMessagePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    text: '',
    image: '',
    link: '',
    cta: 'Learn More'
  });

 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!formData.text.trim()) {
    setError('Message text is required');
    return;
  }

  setLoading(true);
  setError('');
  setSuccess('');

  try {
    const response = await api.broadcastMessage(formData);
    
    if (response.ok) {
      const broadcastId = response.broadcast_id;
      
      // Show initial success
      setSuccess(`✅ Broadcast initiated! Sending to ${response.total_users} users...`);
      
      // Poll for status updates
      const pollStatus = async () => {
        try {
          const statusResponse = await api.getBroadcastStatus(broadcastId);
          
          if (statusResponse.ok) {
            if (statusResponse.status === 'completed') {
              setSuccess(
                `🎉 Broadcast Complete!\n\n` +
                `✅ Sent: ${statusResponse.sent}\n` +
                `❌ Failed: ${statusResponse.failed}\n` +
                `📝 Total: ${statusResponse.total}`
              );
              setLoading(false);
              
              // Reset form after 3 seconds
              setTimeout(() => {
                setFormData({
                  text: '',
                  image: '',
                  link: '',
                  cta: 'Learn More'
                });
                setSuccess('');
              }, 5000);
            } else {
              // Still processing, update status
              setSuccess(
                `⏳ Broadcasting... ${statusResponse.progress_percentage}% complete\n\n` +
                `✅ Sent: ${statusResponse.sent} / ${statusResponse.total}`
              );
              
              // Poll again in 2 seconds
              setTimeout(pollStatus, 2000);
            }
          }
        } catch (err) {
          console.error('Error polling status:', err);
          setLoading(false);
        }
      };
      
      // Start polling after 2 seconds
      setTimeout(pollStatus, 2000);
      
    } else {
      setError(response.error || 'Failed to send broadcast');
      setLoading(false);
    }
  } catch (err: any) {
    setError(err.response?.data?.error || 'Failed to send broadcast message');
    setLoading(false);
  }
};

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 pb-32 animate-fade-in-up">
        <div className="mb-10 sm:mb-12 text-center sm:text-left">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-contentMuted hover:text-white mb-6 flex items-center justify-center sm:justify-start gap-2 transition-colors font-bold tracking-wide text-sm mx-auto sm:mx-0"
          >
            ← BACK TO DASHBOARD
          </button>
          <h1 className="text-4xl sm:text-5xl font-heading font-extrabold text-white mb-3 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
            📢 Broadcast Message
          </h1>
          <p className="text-contentMuted text-lg font-sans">
            Send a message to all users of the platform
          </p>
        </div>

        {error && (
          <div className="mb-8 bg-red-500/10 border border-red-500/30 rounded-xl p-5 shadow-[0_0_15px_rgba(239,68,68,0.1)] flex items-start gap-3">
            <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={24} />
            <p className="text-red-300 font-bold tracking-wide">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-8 bg-neon-emerald/10 border border-neon-emerald/30 rounded-xl p-5 shadow-[0_0_15px_rgba(0,255,157,0.1)] flex items-start gap-3">
            <AlertCircle className="text-neon-emerald flex-shrink-0 mt-0.5" size={24} />
            <p className="text-neon-emerald font-bold tracking-wide whitespace-pre-wrap leading-relaxed">{success}</p>
          </div>
        )}

        <div className="space-y-6 sm:space-y-8">
          <div className="glass-panel p-6 sm:p-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-neon-cyan/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none group-hover:bg-neon-cyan/10 transition-colors"></div>
            <label className="flex items-center gap-3 text-white font-heading font-bold text-xl mb-4 relative z-10">
              <span className="text-neon-cyan"><MessageSquare size={24} /></span>
              Message Text <span className="text-neon-emerald ml-1">*</span>
            </label>
            <div className="relative z-10">
              <textarea
                value={formData.text}
                onChange={(e) => handleChange('text', e.target.value)}
                placeholder="Enter your broadcast message here..."
                rows={6}
                className="input-glass w-full resize-none leading-relaxed"
              />
              <p className="text-contentMuted text-xs font-mono font-bold tracking-widest uppercase mt-3 text-right">
                <span className="text-neon-cyan">{formData.text.length}</span> characters
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            <div className="glass-panel p-6 sm:p-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-neon-violet/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none group-hover:bg-neon-violet/10 transition-colors"></div>
              <label className="flex items-center gap-3 text-white font-heading font-bold text-lg mb-4 relative z-10">
                <span className="text-neon-violet"><Image size={20} /></span>
                Image URL <span className="text-contentMuted text-sm font-sans font-normal ml-2">(Optional)</span>
              </label>
              <div className="relative z-10">
                <input
                  type="url"
                  value={formData.image}
                  onChange={(e) => handleChange('image', e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="input-glass w-full font-mono text-sm"
                />
                <p className="text-contentMuted text-xs mt-3 leading-relaxed">
                  Add an image to make your message more engaging
                </p>
              </div>
            </div>

            <div className="glass-panel p-6 sm:p-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-neon-emerald/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none group-hover:bg-neon-emerald/10 transition-colors"></div>
              <label className="flex items-center gap-3 text-white font-heading font-bold text-lg mb-4 relative z-10">
                <span className="text-neon-emerald"><LinkIcon size={20} /></span>
                Link URL <span className="text-contentMuted text-sm font-sans font-normal ml-2">(Optional)</span>
              </label>
              <div className="relative z-10">
                <input
                  type="url"
                  value={formData.link}
                  onChange={(e) => handleChange('link', e.target.value)}
                  placeholder="https://example.com"
                  className="input-glass w-full font-mono text-sm"
                />
                <p className="text-contentMuted text-xs mt-3 leading-relaxed">
                  Add a link for users to take action
                </p>
              </div>
            </div>
          </div>

          <div className="glass-panel p-6 sm:p-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none group-hover:bg-yellow-500/10 transition-colors"></div>
            <label className="flex items-center gap-3 text-white font-heading font-bold text-xl mb-4 relative z-10">
              <span className="text-yellow-500"><Send size={24} /></span>
              Button Text
            </label>
            <div className="relative z-10">
              <input
                type="text"
                value={formData.cta}
                onChange={(e) => handleChange('cta', e.target.value)}
                placeholder="Learn More"
                className="input-glass w-full"
              />
              <p className="text-contentMuted text-xs mt-3 leading-relaxed">
                Text for the call-to-action button <span className="text-neon-cyan">(only shown if link is provided)</span>
              </p>
            </div>
          </div>

          {formData.text && (
            <div className="glass-panel p-6 sm:p-8 relative overflow-hidden mt-12 bg-charcoal/80 border-surfaceBorder/50">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-neon-cyan via-neon-violet to-neon-cyan opacity-50"></div>
              <h3 className="text-white font-heading font-bold flex items-center gap-2 mb-6">
                <span className="text-2xl">👀</span> Preview
              </h3>
              <div className="bg-surface/80 border border-surfaceBorder rounded-2xl p-4 sm:p-5 max-w-md mx-auto shadow-xl relative isolate">
                {/* Mock Telegram Bubble tail */}
                <div className="absolute bottom-4 -left-3 w-4 h-4 bg-surface/80 border-b border-l border-surfaceBorder transform rotate-45 z-0"></div>
                
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold text-neon-cyan text-sm">CP Gram Official</span>
                    <span className="text-xs text-contentMuted bg-surfaceBorder/30 px-1.5 py-0.5 rounded">bot</span>
                  </div>
                  
                  {formData.image && (
                    <img
                      src={formData.image}
                      alt="Preview"
                      className="w-full rounded-xl mb-4 max-h-64 object-cover border border-surfaceBorder"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  )}
                  <p className="text-white whitespace-pre-wrap leading-relaxed mb-4 text-[15px]">
                    {formData.text}
                  </p>
                  
                  <div className="flex items-center justify-end gap-2 mb-2">
                    <span className="text-[11px] text-contentMuted font-mono">12:00 PM</span>
                  </div>
                  
                  {formData.link && (
                    <button
                      type="button"
                      className="w-full bg-neon-cyan/10 hover:bg-neon-cyan/20 text-neon-cyan font-bold py-3 rounded-xl border border-neon-cyan/30 transition-colors text-sm"
                    >
                      {formData.cta || 'Learn More'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row gap-4 pt-8">
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full sm:w-1/3 bg-surface border border-surfaceBorder hover:border-white hover:text-white text-contentMuted font-bold py-5 rounded-2xl transition-all tracking-wide"
              disabled={loading}
            >
              CANCEL
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !formData.text.trim()}
              className="w-full sm:w-2/3 bg-neon-cyan hover:bg-white text-charcoal font-extrabold py-5 rounded-2xl transition-all flex items-center justify-center gap-3 text-lg tracking-widest shadow-[0_0_20px_rgba(0,240,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-neon-cyan disabled:hover:shadow-[0_0_20px_rgba(0,240,255,0.3)] group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 pointer-events-none"></div>
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-charcoal" />
                  <span>SENDING...</span>
                </>
              ) : (
                <>
                  <Send size={24} className="fill-current group-hover:scale-110 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                  <span>SEND BROADCAST</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}