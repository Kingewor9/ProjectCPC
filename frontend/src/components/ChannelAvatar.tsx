import { useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';

interface ChannelAvatarProps {
  src: string;
  alt: string;
  className?: string;
  channelName?: string;
}

/**
 * Channel Avatar component with fallback handling
 * Handles broken/expired Telegram image URLs gracefully
 */
export default function ChannelAvatar({ 
  src, 
  alt, 
  className = 'w-12 h-12', 
  channelName 
}: ChannelAvatarProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  if (hasError) {
    // Fallback: Show a placeholder with channel icon and initial letter
    const initial = channelName ? channelName.charAt(0).toUpperCase() : '📺';
    return (
      <div
        className={`${className} rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center flex-shrink-0`}
        title={`Image failed to load for ${alt}`}
      >
        <div className="flex flex-col items-center justify-center">
          <ImageIcon size={16} className="text-white/70 mb-0.5" />
          <span className="text-xs font-bold text-white">{initial}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className} rounded-lg bg-grey-700 flex items-center justify-center overflow-hidden flex-shrink-0`}>
      {isLoading && (
        <div className="absolute inset-0 bg-grey-700 flex items-center justify-center">
          <div className="animate-pulse">
            <ImageIcon size={20} className="text-grey-600" />
          </div>
        </div>
      )}
      <img
        src={src}
        alt={alt}
        onError={handleError}
        onLoad={handleLoad}
        className={`w-full h-full object-cover ${isLoading ? 'opacity-0' : 'opacity-100'}`}
      />
    </div>
  );
}
