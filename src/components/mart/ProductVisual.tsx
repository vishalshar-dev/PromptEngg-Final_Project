import { useState, useEffect } from 'react';
import { getCategoryStyle } from '../../utils/categoryStyles';
import { CategoryIcon } from './CategoryIcon';

interface ProductVisualProps {
  name: string;
  category: string;
  imageUrl?: string;
  iconKey?: string;
  accent?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<ProductVisualProps['size']>, string> = {
  xs: 'w-10 h-10 rounded-lg',
  sm: 'w-12 h-12 rounded-xl',
  md: 'w-full h-28 rounded-xl',
  lg: 'w-full h-44 rounded-2xl',
};

const ICON_SIZE_CLASSES: Record<NonNullable<ProductVisualProps['size']>, string> = {
  xs: 'w-4 h-4',
  sm: 'w-5 h-5',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
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
  className = '',
}: ProductVisualProps) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [imageUrl]);

  const style = getCategoryStyle(category, accent);
  const resolvedIconKey = iconKey ?? inferIconKeyForCategory(category);
  const showImage = Boolean(imageUrl && !imgError);

  return (
    <div
      className={`relative overflow-hidden border ${style.border} bg-gradient-to-br ${style.gradient} flex items-center justify-center flex-shrink-0 ${SIZE_CLASSES[size]} ${className}`}
    >
      {showImage ? (
        <>
          <img
            src={imageUrl}
            alt={name}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950/65 via-transparent to-transparent pointer-events-none" />
          <div
            className={`absolute bottom-1.5 right-1.5 ${
              size === 'xs' || size === 'sm' ? 'hidden' : 'flex'
            } w-6 h-6 rounded-lg bg-ink-950/80 backdrop-blur-sm border border-white/10 items-center justify-center ${style.text}`}
          >
            <CategoryIcon iconKey={resolvedIconKey} className="w-3.5 h-3.5" strokeWidth={2.2} />
          </div>
        </>
      ) : (
        <div className="relative w-full h-full flex items-center justify-center">
          <div
            className={`absolute inset-2 rounded-full opacity-20 blur-md ${style.dot}`}
          />
          <div
            className={`relative flex items-center justify-center rounded-xl bg-ink-950/40 border border-white/[0.06] ${
              size === 'xs'
                ? 'w-7 h-7'
                : size === 'sm'
                ? 'w-9 h-9'
                : size === 'md'
                ? 'w-14 h-14'
                : 'w-20 h-20'
            } ${style.text}`}
          >
            <CategoryIcon
              iconKey={resolvedIconKey}
              className={ICON_SIZE_CLASSES[size]}
              strokeWidth={1.9}
            />
          </div>
        </div>
      )}
    </div>
  );
}
