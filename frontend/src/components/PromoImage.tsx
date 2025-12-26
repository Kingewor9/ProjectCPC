import { useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';

interface PromoImageProps {
  src?: string;
  alt: string;
  className?: string;
}

export default function PromoImage({
  src,
  alt,
  className = ''
}: PromoImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleError = () => {
    console.log('Promo image failed to load:', src); // Debug log
    setIsLoading(false);
    setHasError(true);
  };

  const handleLoad = () => {
    console.log('Promo image loaded successfully:', src); // Debug log
    setIsLoading(false);
  };

  // If no src or error, show fallback
  if (!src || src.trim() === '' || hasError) {
    return (
      <div
        className={`w-full h-48 bg-darkBlue-700 rounded-lg flex flex-col items-center justify-center text-grey-400 mb-3 ${className}`}
      >
        <ImageIcon size={28} className="mb-2" />
        <span className="text-sm">No promo image</span>
      </div>
    );
  }

  return (
    <div className={`w-full h-48 bg-darkBlue-900 rounded-lg overflow-hidden relative mb-3 ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 bg-darkBlue-700 flex items-center justify-center animate-pulse z-10">
          <ImageIcon size={28} className="text-grey-600" />
        </div>
      )}

      <img
        src={src}
        alt={alt}
        onLoad={handleLoad}
        onError={handleError}
        className={`w-full h-full object-cover transition-opacity duration-200 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        }`}
        crossOrigin="anonymous"
      />
    </div>
  );
}