import { ShoppingCart } from './ShoppingCart';

export function CartDrawer({ openSignal }: { openSignal?: number }) {
  return <ShoppingCart externalOpenRequest={openSignal} />;
}
