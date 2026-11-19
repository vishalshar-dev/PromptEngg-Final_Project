import { useState, useEffect } from 'react';
import { CATEGORY_IMAGES } from '../../data/martCatalog';
import { getCategoryStyle } from '../../utils/categoryStyles';
import { CategoryIcon } from './CategoryIcon';
import { getProductArtwork } from './ProductArtwork';

interface ProductVisualProps {
  name: string;
  category: string;
  imageUrl?: string;
  iconKey?: string;
  accent?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  preferCategoryPhoto?: boolean;
  className?: string;
}

const SHARED_CATEGORY_IMAGE_SET = new Set(Object.values(CATEGORY_IMAGES));

const SIZE_CLASSES: Record<NonNullable<ProductVisualProps['size']>, string> = {
  xs: 'w-10 h-10 rounded-lg',
  sm: 'w-12 h-12 rounded-xl',
  md: 'w-full h-28 rounded-xl',
  lg: 'w-full h-44 rounded-2xl',
};

const ARTWORK_SCALE_CLASSES: Record<NonNullable<ProductVisualProps['size']>, string> = {
  xs: 'scale-[0.6]',
  sm: 'scale-[0.74]',
  md: 'scale-100 group-hover:scale-105 transition-transform duration-200',
  lg: 'scale-[1.35]',
};

export function inferIconKeyForCategory(category: string): string {
  const lower = category.toLowerCase();
  if (lower.includes('grocer') || lower.includes('staple')) return 'wheat';
  if (lower.includes('fruit') || lower.includes('veg')) return 'apple';
  if (lower.includes('dairy') || lower.includes('bakery')) return 'milk';
  if (lower.includes('snack') || lower.includes('beverag') || lower.includes('junk')) return 'coffee';
  if (lower.includes('meat') || lower.includes('egg')) return 'drumstick';
  if (lower.includes('personal') || lower.includes('care')) return 'sparkles';
  if (lower.includes('household')) return 'home';
  if (lower.includes('clean')) return 'spray';
  if (lower.includes('electron')) return 'cpu';
  if (lower.includes('cloth')) return 'shirt';
  if (lower.includes('medic') || lower.includes('health')) return 'heart-pulse';
  if (lower.includes('station')) return 'pen-tool';
  if (lower.includes('mobile') || lower.includes('internet') || lower.includes('bill')) return 'wifi';
  if (lower.includes('electric') || lower.includes('util')) return 'zap';
  if (lower.includes('fuel') || lower.includes('transport')) return 'fuel';
  if (lower.includes('entertain')) return 'film';
  return 'package';
}

export function ProductVisual({
  name,
  category,
  imageUrl,
  iconKey,
  accent,
  size = 'md',
  preferCategoryPhoto = false,
  className = '',
}: ProductVisualProps) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [imageUrl]);

  const style = getCategoryStyle(category, accent);
  const resolvedIconKey = iconKey ?? inferIconKeyForCategory(category);
  const isSharedCategoryPhoto = Boolean(imageUrl && SHARED_CATEGORY_IMAGE_SET.has(imageUrl));
  const showPhoto = Boolean(
    imageUrl && !imgError && (preferCategoryPhoto || !isSharedCategoryPhoto)
  );
  const artwork = getProductArtwork(name, category, resolvedIconKey);

  return (
    <div
      className={`relative overflow-hidden border border-[#E7EAF0] bg-gradient-to-br ${
        showPhoto ? style.gradient : artwork.bgClass
      } flex items-center justify-center flex-shrink-0 ${SIZE_CLASSES[size]} ${className}`}
    >
      {showPhoto ? (
        <>
          <img
            src={imageUrl}
            alt={name}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#151922]/15 via-transparent to-transparent pointer-events-none" />
          <div
            className={`absolute bottom-1.5 right-1.5 ${
              size === 'xs' || size === 'sm' ? 'hidden' : 'flex'
            } w-6 h-6 rounded-lg bg-white/95 border border-[#E7EAF0] shadow-xs items-center justify-center ${style.text}`}
          >
            <CategoryIcon iconKey={resolvedIconKey} className="w-3.5 h-3.5" strokeWidth={2.2} />
          </div>
        </>
      ) : (
        <div
          className={`relative w-full h-full flex items-center justify-center ${ARTWORK_SCALE_CLASSES[size]}`}
        >
          {artwork.renderSvg()}
        </div>
      )}
    </div>
  );
}
