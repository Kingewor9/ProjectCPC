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
      answer: 'When you accept a request, the campaign is added to your scheduled campaigns. And you are expected to post the promotion manually within 48 hours of accepting the request.',
    },
    {
      question: 'What happens if I fail to post within 48 hours?',
      answer: 'If you fail to post the promotion within 48 hours of accepting the request, your CPC balance will be deducted as a penalty, and your account may be reviewed for further actions.',
    },
    {
      question: 'What is CPC and how do I earn it?',
      answer: 'CPC stands for "Cross Promotions Coin." You earn CPC by allowing other users to promote their channels on yours. Each successful promotion adds to your CPC balance, which you can use to request promotions on other channels. NOTE: CPC cannot be withdrawn as it currently holds no monetary value.',
    },
    {
      question: 'How is the CPC cost calculated?',
      answer: 'Each partner sets their own pricing for different duration lengths. You can see the exact cost before confirming your request. The cost is deducted from your CPC balance when the campaign starts.',
    },
    {
      question: 'Can I change or cancel a scheduled promotion?',
      answer: 'Once a promotion is scheduled, it cannot be changed or canceled. Please ensure all details are correct before confirming the request.',
    },
    {
      question: 'Can I schedule promotions for multiple days?',
      answer: 'Currently, each request is for a single day and time slot. You can create multiple requests for different days if you want an extended promotion period.',
    },
    {
      question: 'How do I add an image to my promo?',
      answer: 'To add an image to your promo, visit an image link generator site like imgbb.com or postimages.org, upload your image there, and copy the direct image link provided. Paste this link into the image URL field when creating your promo.',

    },
    {
      question: 'How do I track my campaigns?',
      answer: 'Visit the "Campaigns" page to see all your scheduled, running, and completed campaigns. You can monitor their status, timing, and performance.',
    },
    {
      question:  'What are the criterias to get my channel approved on the platform?',
      answer: 'To get your channel approved on CP Gram, ensure it has atleast 500 subscribers, Atleast 150 average 24 hours views per post, and complies with our content guidelines which prohibit spam, adult content, and copyright violations.',
    }
  ];

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Help & Support</h1>
          <p className="text-grey-400">Get answers to common questions about CP Gram</p>
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
              ----
            </a>
          </div>

          <div className="bg-darkBlue-800 border border-grey-700 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <MessageCircle size={24} className="text-blue-400" />
              <h3 className="text-lg font-bold text-white">Telegram Support</h3>
            </div>
            <p className="text-grey-400 mb-4">
              Reach out to our support team on Telegram.
            </p>
            <a
              href="https://t.me/cpgramsupport"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 font-medium"
            >
              @cpgramsupport
            </a>
          </div>
        </div>
      </div>
    </Layout>
  );
}
