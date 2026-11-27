// apps/web/components/pos/PosMenuItemCard.tsx
'use client';

import { useState } from 'react';
import { UtensilsCrossed, SlidersHorizontal } from 'lucide-react';
import { getOptimizedMenuImageUrl } from '@/lib/cloudinary';

export interface PosMenuCardItem {
  id: string | number;
  name: string;
  price: number;
  image?: string | null;
  imageUrl?: string | null;
  imageCardUrl?: string | null;
  isAvailable?: boolean;
  is86ed?: boolean;
  hasModifiers?: boolean;
  category?: string;
}

interface PosMenuItemCardProps {
  item: PosMenuCardItem;
  currency?: string;
  onSelect: (item: PosMenuCardItem) => void;
}

export default function PosMenuItemCard({
  item,
  currency = 'KES',
  onSelect,
}: PosMenuItemCardProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const rawUrl = item.imageCardUrl || item.imageUrl || item.image || null;
  const src = !imgFailed ? getOptimizedMenuImageUrl(rawUrl, 'card') : null;
  const unavailable = item.isAvailable === false || item.is86ed === true;

  return (
    <button
      type="button"
      disabled={unavailable}
      onClick={() => onSelect(item)}
      className={`group text-left bg-white rounded-2xl border overflow-hidden shadow-2xs transition-all flex flex-col justify-between ${
        unavailable
          ? 'opacity-55 border-gray-200 cursor-not-allowed'
          : 'border-gray-200 hover:border-servora-core hover:shadow-md active:scale-[0.98] cursor-pointer'
      }`}
    >
      <div className="relative w-full aspect-[4/3] bg-servora-pale overflow-hidden">
        {src ? (
          <img
            src={src}
            alt={item.name}
            loading="lazy"
            decoding="async"
            onError={() => setImgFailed(true)}
            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-servora-deepTeal/30">
            <UtensilsCrossed size={28} />
          </div>
        )}

        {unavailable && (
          <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-bold uppercase tracking-wider">
            86ed
          </span>
        )}
        {!unavailable && item.hasModifiers && (
          <span className="absolute top-2 right-2 p-1 rounded-md bg-servora-navy/80 text-white">
            <SlidersHorizontal size={11} />
          </span>
        )}
      </div>

      <div className="p-3 space-y-1">
        <p className="text-xs font-bold text-servora-navy line-clamp-2 leading-snug">
          {item.name}
        </p>
        <p className="text-xs font-mono font-bold text-servora-core">
          {currency} {item.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </p>
      </div>
    </button>
  );
}