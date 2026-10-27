import React from 'react';
import { useCart } from '../context/CartContext';
import './FlyToCartAnimation.css';

export const FlyToCartAnimation = () => {
  const { flyingItem } = useCart();

  if (!flyingItem) return null;

  const style = {
    '--start-x': `${flyingItem.startX}px`,
    '--start-y': `${flyingItem.startY}px`,
    '--target-x': `${flyingItem.targetX}px`,
    '--target-y': `${flyingItem.targetY}px`
  };

  return (
    <div className="fly-to-cart-container" aria-hidden="true">
      <div className="flying-product-ghost" style={style}>
        <img src={flyingItem.image} alt="Sản phẩm đang bay vào giỏ" />
      </div>
    </div>
  );
};

