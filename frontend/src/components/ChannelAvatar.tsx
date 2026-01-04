import { useState, useEffect } from 'react';
import { Image as ImageIcon } from 'lucide-react';

interface ChannelAvatarProps {
  src: string;
  alt: string;
  className?: string;
  channelName?: string;
}

/**
 * Channel Avatar component optimized for Telegram Mini Apps
 * Handles Telegram's strict CSP and image loading policies
 */
export default function ChannelAvatar({ 
  src, 
  alt, 
  className = 'w-12 h-12', 
  channelName 
}: ChannelAvatarProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [imageSrc, setImageSrc] = useState<string>('');

  useEffect(() => {
    // Reset states when src changes
    setHasError(false);
    setIsLoading(true);
    
    // Validate and process the image source
    if (!src || src.trim() === '') {
      setHasError(true);
      setIsLoading(false);
      return;
    }

    // For Telegram Mini Apps, we need to ensure the URL is properly formatted
    let processedSrc = src;
    
    // If it's a Telegram file URL, ensure it's using HTTPS
    if (src.includes('api.telegram.org')) {
      processedSrc = src.replace('http://', 'https://');
    }
    
    // Test if image can be loaded by creating a test Image object
    const testImage = new Image();
    
    const loadTimeout = setTimeout(() => {
      // If image takes more than 5 seconds, show fallback
      setHasError(true);
      setIsLoading(false);
    }, 5000);
    
    testImage.onload = () => {
      clearTimeout(loadTimeout);
      setImageSrc(processedSrc);
      setIsLoading(false);
      setHasError(false);
    };
    
    testImage.onerror = () => {
      clearTimeout(loadTimeout);
      setHasError(true);
      setIsLoading(false);
    };
    
    // Start loading the test image
    testImage.src = processedSrc;
    
    return () => {
      clearTimeout(loadTimeout);
    };
  }, [src]);

  const handleImageError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  // Show fallback if no src, empty src, or loading failed
  if (!src || src.trim() === '' || hasError) {
    const initial = channelName ? channelName.charAt(0).toUpperCase() : '📺';
    return (
      <div
        className={`${className} rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center flex-shrink-0`}
        title={hasError ? `Image failed to load for ${alt}` : `No image for ${alt}`}
      >
        <div className="flex flex-col items-center justify-center">
          <ImageIcon size={16} className="text-white/70 mb-0.5" />
          <span className="text-xs font-bold text-white">{initial}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className} rounded-lg bg-grey-700 flex items-center justify-center overflow-hidden flex-shrink-0 relative`}>
      {isLoading && (
        <div className="absolute inset-0 bg-grey-700 flex items-center justify-center z-10">
          <div className="animate-pulse">
            <ImageIcon size={20} className="text-grey-600" />
          </div>
        </div>
      )}
      {imageSrc && (
        <img
          src={imageSrc}
          alt={alt}
          onError={handleImageError}
          onLoad={handleImageLoad}
          className={`w-full h-full object-cover transition-opacity duration-200 ${
            isLoading ? 'opacity-0' : 'opacity-100'
          }`}
          referrerPolicy="no-referrer"
        />
      )}
    </div>
  );
}