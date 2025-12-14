import Layout from '../components/Layout';
import { HelpCircle, Mail, MessageCircle } from 'lucide-react';

export default function HelpPage() {
  const faqs = [
    {
      question: 'How do I send a cross-promotion?',
      answer: 'Navigate to "Send Promo" and select the channel you want to promote, the partner channel, scheduling details, and the promo content. Once submitted, the partner will receive a notification to accept or decline.',
    },
    {
      question: 'What happens when I accept a request?',
      answer: 'When you accept a request, the campaign is automatically scheduled. The promotional content will be posted to your channel at the specified time and automatically removed after the duration expires.',
    },
    {
      question: 'How is the CPC cost calculated?',
      answer: 'Each partner sets their own pricing for different duration lengths. You can see the exact cost before confirming your request. The cost is deducted from your CPC balance when the campaign starts.',
    },
    {
      question: 'Can I schedule promotions for multiple days?',
      answer: 'Currently, each request is for a single day and time slot. You can create multiple requests for different days if you want an extended promotion period.',
    },
    {
      question: 'How do I track my campaigns?',
      answer: 'Visit the "Campaigns" page to see all your scheduled, running, and completed campaigns. You can monitor their status, timing, and performance.',
    },
  ];

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Help & Support</h1>
          <p className="text-grey-400">Get answers to common questions about Growth Guru</p>
        </div>

        {/* FAQs */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <HelpCircle size={28} className="text-blue-400" />
            Frequently Asked Questions
          </h2>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <details
                key={index}
                className="group bg-darkBlue-800 border border-grey-700 rounded-lg cursor-pointer hover:border-blue-600 transition-all"
              >
                <summary className="px-6 py-4 font-bold text-white flex items-center justify-between">
                  {faq.question}
                  <span className="text-blue-400 group-open:rotate-180 transition-transform">
                    ▼
                  </span>
                </summary>
                <div className="px-6 pb-4 text-grey-300 border-t border-grey-700 pt-4">
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>
        </div>

        {/* Contact Support */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-darkBlue-800 border border-grey-700 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Mail size={24} className="text-blue-400" />
              <h3 className="text-lg font-bold text-white">Email Support</h3>
            </div>
            <p className="text-grey-400 mb-4">
              Have a question or need help? Reach out to our support team.
            </p>
            <a
              href="mailto:support@growthguru.io"
              className="text-blue-400 hover:text-blue-300 font-medium"
            >
              support@growthguru.io
            </a>
          </div>

          <div className="bg-darkBlue-800 border border-grey-700 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <MessageCircle size={24} className="text-blue-400" />
              <h3 className="text-lg font-bold text-white">Telegram Community</h3>
            </div>
            <p className="text-grey-400 mb-4">
              Join our community for updates, tips, and discussions.
            </p>
            <a
              href="https://t.me/growthguruofficial"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 font-medium"
            >
              @growthguruofficial
            </a>
          </div>
        </div>
      </div>
    </Layout>
  );
}
