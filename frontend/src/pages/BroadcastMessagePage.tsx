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
        setSuccess(`Broadcast sent successfully to ${response.sent_count} users!`);
        
        // Reset after 3 seconds
        setTimeout(() => {
          setFormData({
            text: '',
            image: '',
            link: '',
            cta: 'Learn More'
          });
          setSuccess('');
        }, 3000);
      } else {
        setError(response.error || 'Failed to send broadcast');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send broadcast message');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-blue-400 hover:text-blue-300 mb-4 flex items-center gap-2"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-4xl font-bold text-white mb-2">
            📢 Broadcast Message
          </h1>
          <p className="text-grey-400">
            Send a message to all users of the platform
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-500/20 border border-red-500 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={20} />
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-500/20 border border-green-500 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="text-green-400 flex-shrink-0 mt-0.5" size={20} />
            <p className="text-green-300">{success}</p>
          </div>
        )}

        <div className="space-y-6">
          <div className="bg-darkBlue-800 border border-grey-700 rounded-lg p-6">
            <label className="flex items-center gap-2 text-white font-medium mb-3">
              <MessageSquare size={20} />
              Message Text *
            </label>
            <textarea
              value={formData.text}
              onChange={(e) => handleChange('text', e.target.value)}
              placeholder="Enter your broadcast message here..."
              rows={6}
              className="w-full bg-darkBlue-900 border border-grey-700 rounded-lg px-4 py-3 text-white placeholder-grey-500 focus:outline-none focus:border-blue-500"
            />
            <p className="text-grey-400 text-sm mt-2">
              {formData.text.length} characters
            </p>
          </div>

          <div className="bg-darkBlue-800 border border-grey-700 rounded-lg p-6">
            <label className="flex items-center gap-2 text-white font-medium mb-3">
              <Image size={20} />
              Image URL (Optional)
            </label>
            <input
              type="url"
              value={formData.image}
              onChange={(e) => handleChange('image', e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="w-full bg-darkBlue-900 border border-grey-700 rounded-lg px-4 py-3 text-white placeholder-grey-500 focus:outline-none focus:border-blue-500"
            />
            <p className="text-grey-400 text-sm mt-2">
              Add an image to make your message more engaging
            </p>
          </div>

          <div className="bg-darkBlue-800 border border-grey-700 rounded-lg p-6">
            <label className="flex items-center gap-2 text-white font-medium mb-3">
              <LinkIcon size={20} />
              Link URL (Optional)
            </label>
            <input
              type="url"
              value={formData.link}
              onChange={(e) => handleChange('link', e.target.value)}
              placeholder="https://example.com"
              className="w-full bg-darkBlue-900 border border-grey-700 rounded-lg px-4 py-3 text-white placeholder-grey-500 focus:outline-none focus:border-blue-500"
            />
            <p className="text-grey-400 text-sm mt-2">
              Add a link for users to take action
            </p>
          </div>

          <div className="bg-darkBlue-800 border border-grey-700 rounded-lg p-6">
            <label className="flex items-center gap-2 text-white font-medium mb-3">
              <Send size={20} />
              Button Text
            </label>
            <input
              type="text"
              value={formData.cta}
              onChange={(e) => handleChange('cta', e.target.value)}
              placeholder="Learn More"
              className="w-full bg-darkBlue-900 border border-grey-700 rounded-lg px-4 py-3 text-white placeholder-grey-500 focus:outline-none focus:border-blue-500"
            />
            <p className="text-grey-400 text-sm mt-2">
              Text for the call-to-action button (only shown if link is provided)
            </p>
          </div>

          {formData.text && (
            <div className="bg-darkBlue-800 border border-grey-700 rounded-lg p-6">
              <h3 className="text-white font-medium mb-3">Preview</h3>
              <div className="bg-darkBlue-900 border border-grey-600 rounded-lg p-4">
                {formData.image && (
                  <img
                    src={formData.image}
                    alt="Preview"
                    className="w-full rounded-lg mb-3 max-h-64 object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )}
                <p className="text-white whitespace-pre-wrap mb-3">
                  {formData.text}
                </p>
                {formData.link && (
                  <button
                    type="button"
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
                  >
                    {formData.cta}
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex-1 bg-grey-700 hover:bg-grey-600 text-white font-bold py-4 rounded-lg transition-all"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !formData.text.trim()}
              className="flex-1 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-4 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  Sending...
                </>
              ) : (
                <>
                  <Send size={20} />
                  Send Broadcast
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}