import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';
import { useAuth } from '../hooks/useAuth';
import apiService from '../services/api';
import { Star, Wallet, ArrowRight, AlertCircle, CheckCircle, Info } from 'lucide-react';

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
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/cp-coins')}
            className="text-blue-400 hover:text-blue-300 mb-4 flex items-center gap-2"
          >
            ← Back to CP Coins
          </button>
          <h1 className="text-4xl font-bold text-white mb-2">Buy CP Coins</h1>
          <p className="text-grey-400">Purchase CP Coins using Telegram Stars</p>
        </div>

        {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}
        
        {success && (
          <div className="mb-6 bg-green-600/10 border border-green-600/30 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="text-green-400" size={20} />
              <p className="text-green-400">{success}</p>
            </div>
          </div>
        )}

        {/* Current Balance */}
        <div className="bg-darkBlue-800 border border-grey-700 rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-grey-400 text-sm mb-1">Current Balance</p>
              <p className="text-3xl font-bold text-white">{user?.cpcBalance || 0} CP</p>
            </div>
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Wallet className="text-blue-400" size={24} />
            </div>
          </div>
        </div>

        {/* Exchange Rate Info */}
        <div className="bg-blue-600/10 border border-blue-600/30 rounded-lg p-6 mb-8">
          <div className="flex items-start gap-3">
            <Info className="text-blue-400 flex-shrink-0 mt-1" size={20} />
            <div>
              <p className="text-blue-300 font-medium mb-2">Exchange Rate</p>
              <p className="text-blue-200 text-lg">
                <span className="font-bold">1 Star</span> = <span className="font-bold">1 CP Coin</span>
              </p>
              <p className="text-blue-200 text-sm mt-2">
                Minimum purchase: {exchangeRate.minimum_purchase} CP Coins
              </p>
            </div>
          </div>
        </div>

        {/* Purchase Form */}
        <div className="bg-darkBlue-800 border border-grey-700 rounded-lg p-8">
          <h2 className="text-2xl font-bold text-white mb-6">Purchase Amount</h2>

          {/* Amount Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-grey-300 mb-3">
              How many CP Coins do you want to buy?
            </label>
            <div className="relative">
              <input
                type="text"
                value={cpcAmount}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="Enter amount"
                className="w-full bg-darkBlue-700 border border-grey-600 rounded-lg px-4 py-4 text-white text-2xl font-bold focus:outline-none focus:border-blue-500"
              />
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                <span className="text-grey-400 text-lg">CP</span>
              </div>
            </div>
          </div>

          {/* Quick Amount Buttons */}
          <div className="mb-8">
            <p className="text-sm text-grey-400 mb-3">Quick Select:</p>
            <div className="grid grid-cols-3 gap-3">
              {quickAmounts.map((amount) => (
                <button
                  key={amount}
                  onClick={() => setQuickAmount(amount)}
                  className={`py-3 rounded-lg font-medium transition-all ${
                    cpcAmount === amount.toString()
                      ? 'bg-blue-600 text-white border-2 border-blue-400'
                      : 'bg-darkBlue-700 text-grey-300 hover:bg-darkBlue-600 border-2 border-transparent'
                  }`}
                >
                  {amount.toLocaleString()} CP
                </button>
              ))}
            </div>
          </div>

          {/* Cost Display */}
          <div className="bg-darkBlue-700 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-grey-400 text-sm mb-1">You will receive</p>
                <p className="text-3xl font-bold text-white">
                  {parseInt(cpcAmount) || 0} CP
                </p>
              </div>
              <ArrowRight className="text-grey-500" size={32} />
              <div>
                <p className="text-grey-400 text-sm mb-1">You will pay</p>
                <div className="flex items-center gap-2">
                  <Star className="text-yellow-400" size={24} fill="currentColor" />
                  <p className="text-3xl font-bold text-yellow-400">
                    {starsRequired.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-grey-600 pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-grey-400">Exchange Rate:</span>
                <span className="text-white">1 Star = 1 CP</span>
              </div>
            </div>
          </div>

          {/* Purchase Button */}
          <button
            onClick={handlePurchase}
            disabled={purchasing || !cpcAmount || parseInt(cpcAmount) < exchangeRate.minimum_purchase}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-grey-600 disabled:to-grey-700 disabled:cursor-not-allowed text-white font-bold py-4 rounded-lg transition-all flex items-center justify-center gap-3 text-lg"
          >
            {purchasing ? (
              <>
                <LoadingSpinner />
                Processing...
              </>
            ) : (
              <>
                <Star size={24} fill="currentColor" />
                Buy {parseInt(cpcAmount) || 0} CP with {starsRequired} Stars
              </>
            )}
          </button>

          {/* Info Text */}
          <p className="text-grey-400 text-xs text-center mt-4">
            You will be redirected to Telegram to complete the payment
          </p>
        </div>

        {/* How It Works */}
        <div className="mt-8 bg-darkBlue-800 border border-grey-700 rounded-lg p-6">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <AlertCircle className="text-blue-400" size={20} />
            How it works
          </h3>
          <ol className="space-y-3 text-grey-300">
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">1</span>
              <span>Enter the amount of CP Coins you want to purchase</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">2</span>
              <span>Click the "Buy" button to initiate the payment</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">3</span>
              <span>You'll be redirected to Telegram to complete the payment using Stars</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">4</span>
              <span>After successful payment, CP Coins will be instantly added to your balance</span>
            </li>
          </ol>
        </div>

        {/* Security Notice */}
        <div className="mt-6 bg-green-600/10 border border-green-600/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="text-green-400 flex-shrink-0 mt-1" size={20} />
            <div className="text-sm text-green-200">
              <p className="font-medium mb-1">Secure Payment</p>
              <p>All payments are processed securely through Telegram's official payment system. We never store your payment information.</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}