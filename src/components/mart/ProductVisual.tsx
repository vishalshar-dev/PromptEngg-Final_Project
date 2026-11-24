import { useState, useEffect } from 'react';
import { getCategoryStyle } from '../../utils/categoryStyles';
import { getProductArtwork } from './ProductArtwork';

export interface ProductVisualProps {
  name: string;
  category: string;
  imageUrl?: string;
  iconKey?: string;
  accent?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  preferCategoryPhoto?: boolean;
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<ProductVisualProps['size']>, string> = {
  xs: 'w-9 h-9 rounded-lg',
  sm: 'w-11 h-11 rounded-xl',
  md: 'w-full h-24 rounded-xl',
  lg: 'w-full h-44 rounded-2xl',
};

export function ProductVisual({
  name,
  category,
  imageUrl,
  iconKey,
  accent,
  size = 'md',
  className = '',
}: ProductVisualProps) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [imageUrl]);

  const style = getCategoryStyle(category, accent);
  const canShowPhoto = Boolean(imageUrl) && !imageFailed;

  if (canShowPhoto && imageUrl) {
    return (
      <div
        className={`relative overflow-hidden bg-[var(--bg-subtle)] border border-[var(--border-subtle)] shrink-0 ${SIZE_CLASSES[size]} ${className}`}
      >
        <img
          src={imageUrl}
          alt={name}
          loading="lazy"
          decoding="async"
          onError={() => setImageFailed(true)}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/15 to-transparent"
        />
      </div>
    );
  }

  const artwork = getProductArtwork(name, category, iconKey);

  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br ${artwork.bgClass || style.gradient} border ${style.border} flex items-center justify-center shrink-0 ${SIZE_CLASSES[size]} ${className}`}
    >
      <div className={size === 'xs' ? 'scale-[0.62]' : size === 'sm' ? 'scale-[0.76]' : ''}>
        {artwork.renderSvg()}
      </div>
    </div>
  );
}
