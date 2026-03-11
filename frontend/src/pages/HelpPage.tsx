import Layout from '../components/Layout';
import { HelpCircle, Mail, MessageCircle, FileText } from 'lucide-react';

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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 pb-32 animate-fade-in-up">
        <div className="mb-10 sm:mb-12">
          <h1 className="text-4xl sm:text-5xl font-heading font-extrabold text-white mb-3 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">Help & Support</h1>
          <p className="text-contentMuted text-lg font-sans">Get answers to common questions about CP Gram</p>
        </div>

        {/* FAQs */}
        <div className="mb-12">
          <h2 className="text-2xl sm:text-3xl font-heading font-bold text-white mb-8 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-neon-cyan/10 border border-neon-cyan/30 flex items-center justify-center">
              <HelpCircle size={24} className="text-neon-cyan" />
            </div>
            Frequently Asked Questions
          </h2>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <details
                key={index}
                className="group glass-panel rounded-xl cursor-pointer hover:border-neon-cyan/50 transition-all overflow-hidden"
              >
                <summary className="px-6 py-5 font-heading font-bold text-lg text-white flex items-center justify-between list-none">
                  {faq.question}
                  <span className="text-neon-cyan group-open:rotate-180 transition-transform duration-300 w-8 h-8 rounded-full bg-neon-cyan/10 flex items-center justify-center shrink-0 ml-4">
                    ▼
                  </span>
                </summary>
                <div className="px-6 pb-6 text-contentMuted font-sans border-t border-surfaceBorder/50 pt-4 bg-surface/30">
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>
        </div>

        {/* Contact Support */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="glass-panel p-6 sm:p-8 hover:border-contentMuted transition-colors group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-neon-emerald/5 rounded-full blur-2xl pointer-events-none group-hover:bg-neon-emerald/10 transition-colors"></div>
            <div className="flex items-center gap-4 mb-4 relative z-10">
              <div className="w-12 h-12 rounded-xl bg-neon-emerald/10 border border-neon-emerald/30 flex items-center justify-center">
                <Mail size={24} className="text-neon-emerald" />
              </div>
              <h3 className="text-lg font-heading font-bold text-white">Email Support</h3>
            </div>
            <p className="text-contentMuted text-sm font-sans mb-6 relative z-10">
              Have a question or need help? Reach out to our support team.
            </p>
            <a
              href="mailto:support@growthguru.io"
              className="text-neon-emerald hover:text-white font-mono font-bold text-sm transition-colors relative z-10 flex items-center gap-2 tracking-widest uppercase"
            >
              Email Us
            </a>
          </div>

          <div className="glass-panel p-6 sm:p-8 hover:border-contentMuted transition-colors group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-neon-cyan/5 rounded-full blur-2xl pointer-events-none group-hover:bg-neon-cyan/10 transition-colors"></div>
            <div className="flex items-center gap-4 mb-4 relative z-10">
              <div className="w-12 h-12 rounded-xl bg-neon-cyan/10 border border-neon-cyan/30 flex items-center justify-center">
                <MessageCircle size={24} className="text-neon-cyan" />
              </div>
              <h3 className="text-lg font-heading font-bold text-white">Telegram</h3>
            </div>
            <p className="text-contentMuted text-sm font-sans mb-6 relative z-10">
              Reach out to our support team on Telegram for quick answers.
            </p>
            <a
              href="https://t.me/Mike_cpgram"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neon-cyan hover:text-white font-mono font-bold text-sm transition-colors relative z-10 flex items-center gap-2"
            >
              @Mike_cpgram
            </a>
          </div>

          <div className="glass-panel p-6 sm:p-8 hover:border-contentMuted transition-colors group relative overflow-hidden md:col-span-2 lg:col-span-1">
            <div className="absolute top-0 right-0 w-32 h-32 bg-neon-violet/5 rounded-full blur-2xl pointer-events-none group-hover:bg-neon-violet/10 transition-colors"></div>
            <div className="flex items-center gap-4 mb-4 relative z-10">
              <div className="w-12 h-12 rounded-xl bg-neon-violet/10 border border-neon-violet/30 flex items-center justify-center">
                <FileText size={24} className="text-neon-violet" />
              </div>
              <h3 className="text-lg font-heading font-bold text-white">Documentation</h3>
            </div>
            <p className="text-contentMuted text-sm font-sans mb-6 relative z-10">
              Read our documentation for detailed information & guidance.
            </p>
            <a
              href="https://cross-promotions-gram.gitbook.io/cross-promotions-gram-docs/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neon-violet hover:text-white font-mono font-bold text-sm transition-colors relative z-10 flex items-center gap-2 uppercase tracking-widest"
            >
              Read Docs
            </a>
          </div>
        </div>
      </div>
    </Layout>
  );
}
