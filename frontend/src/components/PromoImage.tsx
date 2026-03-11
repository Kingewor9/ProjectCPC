import { useState, useEffect } from 'react';
import { Image as ImageIcon } from 'lucide-react';

interface PromoImageProps {
  src?: string;
  alt: string;
  className?: string;
}

/**
 * Convert external image URL to proxied URL
 * This solves CORS and Telegram Mini App CSP issues
 */
function getProxiedImageUrl(originalUrl: string | undefined): string | null {
  if (!originalUrl || originalUrl.trim() === '') {
    return null;
  }

  // If it's already a proxied URL, return as-is
  if (originalUrl.startsWith('/api/')) {
    return originalUrl;
  }

  try {
    // Encode the URL in base64 to safely pass it as a query parameter
    const encoded = btoa(originalUrl);
    return `/api/proxy/image?url=${encoded}`;
  } catch (error) {
    console.error('Error encoding image URL:', error);
    return null;
  }
}

export default function PromoImage({
  src,
  alt,
  className = ''
}: PromoImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [proxiedSrc, setProxiedSrc] = useState<string | null>(null);

  useEffect(() => {
    // Reset states when src changes
    setHasError(false);
    setIsLoading(true);

    // Get proxied URL
    const proxyUrl = getProxiedImageUrl(src);
    
    if (!proxyUrl) {
      setHasError(true);
      setIsLoading(false);
      return;
    }

    // Test if the proxied image loads
    const testImage = new Image();
    
    const loadTimeout = setTimeout(() => {
      // If image takes more than 8 seconds, show fallback
      setHasError(true);
      setIsLoading(false);
    }, 8000);
    
    testImage.onload = () => {
      clearTimeout(loadTimeout);
      setProxiedSrc(proxyUrl);
      setIsLoading(false);
      setHasError(false);
    };
    
    testImage.onerror = () => {
      clearTimeout(loadTimeout);
      setHasError(true);
      setIsLoading(false);
    };
    
    // Start loading
    testImage.src = proxyUrl;
    
    return () => {
      clearTimeout(loadTimeout);
    };
  }, [src]);

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  // If no src or error, show fallback
  if (!src || src.trim() === '' || hasError) {
    return (
      <div
        className={`w-full h-48 bg-charcoal border border-surfaceBorder rounded-2xl flex flex-col items-center justify-center text-contentMuted mb-3 relative overflow-hidden ${className}`}
      >
        <div className="absolute inset-0 bg-glass-gradient opacity-30"></div>
        <ImageIcon size={32} className="mb-3 text-surfaceBorder drop-shadow-md relative z-10" />
        <span className="text-sm font-sans tracking-wide relative z-10">No promo image</span>
      </div>
    );
  }

  return (
    <div className={`w-full h-48 bg-charcoal border border-surfaceBorder rounded-2xl overflow-hidden relative mb-3 overflow-hidden shadow-glass-panel ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 bg-surface flex items-center justify-center animate-pulse z-10 backdrop-blur-sm">
          <ImageIcon size={32} className="text-neon-cyan/20" />
        </div>
      )}

      {proxiedSrc && (
        <img
          src={proxiedSrc}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          className={`w-full h-full object-cover transition-opacity duration-200 ${
            isLoading ? 'opacity-0' : 'opacity-100'
          }`}
          referrerPolicy="no-referrer"
        />
      )}
    </div>
  );
}