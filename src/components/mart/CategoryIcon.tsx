import {
  Wheat,
  Apple,
  Milk,
  Coffee,
  Drumstick,
  Sparkles,
  Home,
  SprayCan,
  Cpu,
  Shirt,
  HeartPulse,
  PenTool,
  Wifi,
  Zap,
  Fuel,
  Film,
  Package,
  ShoppingBag,
  Tag,
  Utensils,
} from 'lucide-react';

const ICON_MAP = {
  wheat: Wheat,
  apple: Apple,
  milk: Milk,
  coffee: Coffee,
  drumstick: Drumstick,
  sparkles: Sparkles,
  home: Home,
  spray: SprayCan,
  cpu: Cpu,
  shirt: Shirt,
  'heart-pulse': HeartPulse,
  'pen-tool': PenTool,
  wifi: Wifi,
  zap: Zap,
  fuel: Fuel,
  film: Film,
  package: Package,
  bag: ShoppingBag,
  tag: Tag,
  utensils: Utensils,
} as const;

export const AVAILABLE_ICON_KEYS = Object.keys(ICON_MAP) as (keyof typeof ICON_MAP)[];

export function CategoryIcon({
  iconKey,
  className = 'w-5 h-5',
  strokeWidth = 2.2,
}: {
  iconKey?: string;
  className?: string;
  strokeWidth?: number;
}) {
  const IconComp = (iconKey && ICON_MAP[iconKey as keyof typeof ICON_MAP]) || Package;
  return <IconComp className={className} strokeWidth={strokeWidth} />;
}
