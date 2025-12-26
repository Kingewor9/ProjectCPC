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
  className = 'w-full h-48'
}: PromoImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  if (!src || hasError) {
    return (
      <div
        className={`${className} bg-darkBlue-700 rounded-lg flex flex-col items-center justify-center text-grey-400`}
      >
        <ImageIcon size={28} className="mb-2" />
        <span className="text-sm">No promo image</span>
      </div>
    );
  }

  return (
    <div
      className={`${className} bg-darkBlue-900 rounded-lg overflow-hidden relative`}
    >
      {isLoading && (
        <div className="absolute inset-0 bg-darkBlue-700 flex items-center justify-center animate-pulse">
          <ImageIcon size={28} className="text-grey-600" />
        </div>
      )}

      <img
        src={src}
        alt={alt}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
        className={`w-full h-full object-cover transition-opacity duration-200 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        }`}
      />
    </div>
  );
}
