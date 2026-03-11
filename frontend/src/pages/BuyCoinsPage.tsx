import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';
import { useAuth } from '../hooks/useAuth';
import apiService from '../services/api';
import { Star, Wallet, ArrowRight, CheckCircle, Info } from 'lucide-react';

interface ExchangeRate {
  stars_per_cpc: number;
  cpc_per_star: number;
  minimum_purchase: number;
}

export default function BuyCoinsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [exchangeRate, setExchangeRate] = useState<ExchangeRate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Purchase state
  const [cpcAmount, setCpcAmount] = useState<string>('100');
  const [starsRequired, setStarsRequired] = useState<number>(100);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    fetchExchangeRate();
  }, [user, navigate]);

  useEffect(() => {
    // Calculate stars required when CPC amount changes
    if (exchangeRate && cpcAmount) {
      const amount = parseInt(cpcAmount) || 0;
      const stars = Math.ceil(amount * exchangeRate.stars_per_cpc);
      setStarsRequired(stars);
    }
  }, [cpcAmount, exchangeRate]);

  const fetchExchangeRate = async () => {
    try {
      setLoading(true);
      const data = await apiService.getExchangeRate();
      setExchangeRate(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load exchange rate');
    } finally {
      setLoading(false);
    }
  };

  const handleAmountChange = (value: string) => {
    // Only allow numbers
    const numValue = value.replace(/[^0-9]/g, '');
    setCpcAmount(numValue);
  };

  const setQuickAmount = (amount: number) => {
    setCpcAmount(amount.toString());
  };

  const validatePurchase = (): string | null => {
    if (!cpcAmount || cpcAmount === '0') {
      return 'Please enter an amount';
    }

    const amount = parseInt(cpcAmount);

    if (isNaN(amount)) {
      return 'Invalid amount';
    }

    if (!exchangeRate) {
      return 'Exchange rate not loaded';
    }

    if (amount < exchangeRate.minimum_purchase) {
      return `Minimum purchase is ${exchangeRate.minimum_purchase} CP Coins`;
    }

    return null;
  };

  const handlePurchase = async () => {
    setError(null);
    setSuccess(null);

    const validationError = validatePurchase();
    if (validationError) {
      setError(validationError);
      return;
    }

    setPurchasing(true);

    try {
      const amount = parseInt(cpcAmount);
      const result = await apiService.initiatePurchase(amount);

      if (result.ok && result.payment_url) {
        // Show success message
        setSuccess('Redirecting to Telegram payment...');

        // Redirect to Telegram payment
        setTimeout(() => {
          window.location.href = result.payment_url;
        }, 1000);
      } else {
        setError('Failed to initiate payment. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to initiate purchase');
    } finally {
      setPurchasing(false);
    }
  };

  if (loading || !exchangeRate) {
    return (
      <Layout>
        <LoadingSpinner />
      </Layout>
    );
  }

  const quickAmounts = [100, 500, 1000, 2500, 5000, 10000];

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 pb-32 animate-fade-in-up">
        {/* Header */}
        <div className="mb-10 sm:mb-12 text-center sm:text-left">
          <button
            onClick={() => navigate('/cp-coins')}
            className="text-contentMuted hover:text-white mb-6 flex items-center justify-center sm:justify-start gap-2 transition-colors font-bold tracking-wide text-sm mx-auto sm:mx-0"
          >
            ← BACK TO CP COINS
          </button>
          <h1 className="text-4xl sm:text-5xl font-heading font-extrabold text-white mb-3 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">Buy CP Coins</h1>
          <p className="text-contentMuted text-lg font-sans">Purchase CP Coins using Telegram Stars</p>
        </div>

        {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}
        
        {success && (
          <div className="mb-8 bg-neon-emerald/10 border border-neon-emerald/30 rounded-xl p-5 shadow-[0_0_15px_rgba(0,255,157,0.1)]">
            <div className="flex items-center gap-3">
              <CheckCircle className="text-neon-emerald" size={24} />
              <p className="text-neon-emerald font-bold tracking-wide">{success}</p>
            </div>
          </div>
        )}

        {/* Current Balance */}
        <div className="glass-panel p-6 sm:p-8 mb-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-neon-cyan/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none group-hover:bg-neon-cyan/10 transition-colors"></div>
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-contentMuted text-xs font-bold tracking-widest uppercase mb-2">Current Balance</p>
              <p className="text-3xl sm:text-4xl font-mono font-bold text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.2)] group-hover:text-neon-cyan transition-colors">
                {user?.cpcBalance?.toLocaleString() || 0} <span className="text-xl text-neon-cyan/80">CP</span>
              </p>
            </div>
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-neon-cyan/10 border border-neon-cyan/30 rounded-2xl flex items-center justify-center shadow-[0_0_15px_rgba(0,240,255,0.15)] group-hover:scale-110 transition-transform">
              <Wallet className="text-neon-cyan" size={28} />
            </div>
          </div>
        </div>

        {/* Exchange Rate Info */}
        <div className="bg-neon-violet/10 border border-neon-violet/30 rounded-xl p-6 sm:p-8 mb-8 shadow-[0_0_20px_rgba(138,43,226,0.1)]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="hidden sm:flex items-center justify-center w-12 h-12 bg-neon-violet/20 rounded-full flex-shrink-0">
              <Info className="text-neon-violet" size={24} />
            </div>
            <div className="flex-1">
              <p className="text-white font-heading font-bold text-lg mb-3 flex items-center gap-2">
                <span className="sm:hidden text-neon-violet"><Info size={20} /></span>
                Exchange Rate
              </p>
              <div className="flex flex-wrap items-center gap-3 bg-charcoal/50 p-3 rounded-lg border border-surfaceBorder mb-3">
                <span className="font-bold text-yellow-400 flex items-center gap-1.5"><Star size={18} fill="currentColor"/> 1 Star</span> 
                <span className="text-contentMuted">=</span> 
                <span className="font-bold text-neon-cyan drop-shadow-[0_0_5px_rgba(0,240,255,0.3)]">1 CP Coin</span>
              </div>
              <p className="text-contentMuted text-sm font-mono flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-neon-cyan"></span>
                Minimum purchase: <span className="text-white font-bold">{exchangeRate.minimum_purchase.toLocaleString()} CP</span>
              </p>
            </div>
          </div>
        </div>

        {/* Purchase Form */}
        <div className="glass-panel p-6 sm:p-8 mb-8">
          <h2 className="text-2xl font-heading font-bold text-white mb-8 flex items-center gap-3">
            <span className="text-neon-cyan">💎</span> Purchase Amount
          </h2>

          {/* Amount Input */}
          <div className="mb-8">
            <label className="block text-xs font-bold tracking-widest uppercase text-contentMuted mb-3 ml-1">
              How many CP Coins do you want to buy?
            </label>
            <div className="relative group">
              <input
                type="text"
                value={cpcAmount}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="Enter amount"
                className="w-full bg-charcoal border border-surfaceBorder rounded-2xl px-6 py-5 text-white text-3xl font-mono font-bold focus:outline-none focus:border-neon-cyan focus:shadow-[0_0_20px_rgba(0,240,255,0.15)] transition-all group-hover:border-neon-cyan/50"
              />
              <div className="absolute right-6 top-1/2 transform -translate-y-1/2 bg-charcoal pl-2">
                <span className="text-neon-cyan font-bold text-xl tracking-widest">CP</span>
              </div>
            </div>
          </div>

          {/* Quick Amount Buttons */}
          <div className="mb-10">
            <p className="text-xs font-bold tracking-widest uppercase text-contentMuted mb-4 ml-1">Quick Select</p>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {quickAmounts.map((amount) => (
                <button
                  key={amount}
                  onClick={() => setQuickAmount(amount)}
                  className={`py-3 rounded-xl font-mono font-bold tracking-wide transition-all duration-300 ${
                    cpcAmount === amount.toString()
                      ? 'bg-neon-cyan/20 border border-neon-cyan text-neon-cyan shadow-[0_0_15px_rgba(0,240,255,0.2)] transform scale-105'
                      : 'bg-surface border border-surfaceBorder text-contentMuted hover:border-neon-cyan/50 hover:text-white'
                  }`}
                >
                  {amount >= 1000 ? `${amount / 1000}k` : amount}
                </button>
              ))}
            </div>
          </div>

          {/* Cost Display */}
          <div className="bg-charcoal border border-surfaceBorder rounded-2xl p-6 sm:p-8 mb-8 relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-neon-cyan via-neon-violet to-neon-cyan opacity-50"></div>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="text-center sm:text-left w-full sm:w-auto">
                <p className="text-contentMuted text-xs font-bold tracking-widest uppercase mb-2">You will receive</p>
                <p className="text-3xl sm:text-4xl font-mono font-bold text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
                  {(parseInt(cpcAmount) || 0).toLocaleString()} <span className="text-xl text-neon-cyan">CP</span>
                </p>
              </div>
              
              <div className="hidden sm:flex items-center justify-center w-12 h-12 rounded-full bg-surface border border-surfaceBorder flex-shrink-0">
                <ArrowRight className="text-contentMuted" size={24} />
              </div>
              <div className="sm:hidden flex items-center justify-center w-8 h-8 rounded-full bg-surface border border-surfaceBorder my-2">
                <ArrowRight className="text-contentMuted rotate-90" size={16} />
              </div>

              <div className="text-center sm:text-right w-full sm:w-auto bg-yellow-500/10 sm:bg-transparent p-5 sm:p-0 rounded-xl border border-yellow-500/20 sm:border-transparent">
                <p className="text-contentMuted text-xs font-bold tracking-widest uppercase mb-2">You will pay</p>
                <div className="flex items-center justify-center sm:justify-end gap-3">
                  <Star className="text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" size={32} fill="currentColor" />
                  <p className="text-3xl sm:text-4xl font-mono font-bold text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.3)]">
                    {starsRequired.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Purchase Button */}
          <button
            onClick={handlePurchase}
            disabled={purchasing || !cpcAmount || parseInt(cpcAmount) < exchangeRate.minimum_purchase}
            className="w-full bg-neon-cyan hover:bg-white text-charcoal font-extrabold py-5 rounded-2xl transition-all flex items-center justify-center gap-3 text-lg tracking-widest shadow-[0_0_20px_rgba(0,240,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-neon-cyan disabled:hover:shadow-[0_0_20px_rgba(0,240,255,0.3)] group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 pointer-events-none"></div>
            {purchasing ? (
              <>
                <LoadingSpinner />
                <span>PROCESSING...</span>
              </>
            ) : (
              <>
                <Star size={24} className="fill-current group-hover:scale-110 transition-transform" />
                <span>BUY {(parseInt(cpcAmount) || 0).toLocaleString()} CP</span>
              </>
            )}
          </button>

          {/* Info Text */}
          <p className="text-contentMuted text-xs font-mono text-center mt-6">
            You will be redirected to Telegram to complete the payment
          </p>
        </div>

        {/* How It Works */}
        <div className="glass-panel p-6 sm:p-8 mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-neon-violet/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          <h3 className="text-xl sm:text-2xl font-heading font-bold text-white mb-6 flex items-center gap-3 relative z-10">
            <span className="text-neon-violet">ℹ️</span> How it works
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10">
            {[
              "Enter the amount of CP Coins you want to purchase",
              "Click the \"Buy\" button to initiate the payment",
              "You'll be redirected to Telegram to pay using Stars",
              "After successful payment, CP Coins will be added instantly"
            ].map((step, index) => (
              <div key={index} className="flex items-start gap-4 p-4 bg-surface/50 border border-surfaceBorder rounded-xl hover:border-neon-violet/30 transition-colors">
                <span className="w-8 h-8 rounded-lg bg-neon-violet/10 border border-neon-violet/30 flex items-center justify-center text-neon-violet font-mono font-bold flex-shrink-0 shadow-[0_0_10px_rgba(138,43,226,0.1)]">
                  {index + 1}
                </span>
                <span className="mt-1 leading-snug text-sm text-contentMuted hover:text-white transition-colors">{step}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Security Notice */}
        <div className="bg-neon-emerald/5 border border-neon-emerald/20 rounded-xl p-6 shadow-[0_0_15px_rgba(0,255,157,0.05)]">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
            <div className="w-12 h-12 rounded-full bg-neon-emerald/10 flex items-center justify-center flex-shrink-0">
               <CheckCircle className="text-neon-emerald" size={24} />
            </div>
            <div className="text-sm text-neon-emerald/80 leading-relaxed font-mono">
              <p className="font-bold tracking-widest text-neon-emerald mb-2 uppercase text-base">Secure Payment</p>
              <p>All payments are processed securely through Telegram's official payment system. We never store your payment information on our servers.</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}