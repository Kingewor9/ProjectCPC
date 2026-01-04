import { useState, useEffect } from 'react';

interface ChannelAvatarProps {
  src: string;
  alt: string;
  className?: string;
  channelName?: string;
}

export default function ChannelAvatar({ 
  src, 
  alt, 
  className = 'w-12 h-12', 
  channelName 
}: ChannelAvatarProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Reset when src changes
    setHasError(false);
    setIsLoading(true);
    
    if (!src || src.trim() === '') {
      setHasError(true);
      setIsLoading(false);
      return;
    }

    // Preload image
    const img = new Image();
    
    const timeout = setTimeout(() => {
      console.warn(`[ChannelAvatar] Timeout loading: ${src}`);
      setHasError(true);
      setIsLoading(false);
    }, 8000); // Increased to 8 seconds
    
    img.onload = () => {
      clearTimeout(timeout);
      setIsLoading(false);
      setHasError(false);
      console.log(`[ChannelAvatar] Successfully loaded: ${src}`);
    };
    
    img.onerror = (e) => {
      clearTimeout(timeout);
      console.error(`[ChannelAvatar] Failed to load: ${src}`, e);
      setHasError(true);
      setIsLoading(false);
    };
    
    img.src = src;
    
    return () => clearTimeout(timeout);
  }, [src]);

  // Fallback UI
  if (!src || src.trim() === '' || hasError) {
    const initial = channelName ? channelName.charAt(0).toUpperCase() : '📺';
    return (
      <div
        className={`${className} rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center flex-shrink-0`}
        title={alt}
      >
        <span className="text-lg font-bold text-white">{initial}</span>
      </div>
    );
  }

  return (
    <div className={`${className} rounded-lg bg-grey-700 flex items-center justify-center overflow-hidden flex-shrink-0 relative`}>
      {isLoading && (
        <div className="absolute inset-0 bg-grey-700 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        onError={() => setHasError(true)}
        onLoad={() => setIsLoading(false)}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        }`}
        crossOrigin="anonymous"
      />
    </div>
  );
}