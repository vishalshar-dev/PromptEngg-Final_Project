import { ShoppingCart } from './ShoppingCart';

interface CartDrawerProps {
  openSignal?: number;
  showFloatingBar?: boolean;
}

export function CartDrawer({ openSignal, showFloatingBar = true }: CartDrawerProps) {
  return (
    <ShoppingCart
      externalOpenRequest={openSignal}
      showFloatingBar={showFloatingBar}
    />
  );
}
