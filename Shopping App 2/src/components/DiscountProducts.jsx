import React from 'react';
import { ProductCard } from './ProductCard';
import { DISCOUNT_PRODUCTS } from '../data/products';
import './DiscountProducts.css';

export const DiscountProducts = () => {
  return (
    <section className="container discount-products-section" aria-label="Sản phẩm giảm giá">
      <div className="discount-products-header">
        <h2 className="discount-products-title">Sản phẩm giảm giá</h2>
      </div>

      <div className="discount-products-grid">
        {DISCOUNT_PRODUCTS.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
};

