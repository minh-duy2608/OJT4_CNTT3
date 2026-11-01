import React, { useState, useEffect } from 'react';
import { ProductCard } from './ProductCard';
import { productApi } from '../services/productApi';
import './DiscountProducts.css';

export const DiscountProducts = () => {
  const [discountProducts, setDiscountProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    productApi.getProducts({ size: 8, sort: 'createdAt', sortDir: 'desc' })
      .then((res) => {
        if (!isMounted) return;
        const items = res?.content || [];
        // Ưu tiên các sản phẩm có salePrice hoặc sản phẩm thật từ backend
        const discounted = items.filter((p) => p.salePrice && p.salePrice < p.minPrice);
        const finalItems = (discounted.length >= 4 ? discounted : items).slice(0, 4);
        setDiscountProducts(finalItems);
      })
      .catch((err) => {
        console.warn('Could not load discount products:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (!isLoading && discountProducts.length === 0) {
    return null;
  }

  return (
    <section className="container discount-products-section" aria-label="Sản phẩm giảm giá">
      <div className="discount-products-header">
        <h2 className="discount-products-title">Sản phẩm giảm giá</h2>
      </div>

      {isLoading ? (
        <div className="discount-products-grid" aria-label="Đang tải sản phẩm giảm giá...">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="cyber-product-card" style={{ pointerEvents: 'none', opacity: 0.6 }}>
              <div className="product-card-thumb-wrap" style={{ background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: '100px', height: '100px', background: '#e2e8f0', borderRadius: '8px' }} />
              </div>
              <div className="product-card-body" style={{ padding: '1rem', textAlign: 'center' }}>
                <div style={{ width: '80%', height: '16px', background: '#e2e8f0', borderRadius: '4px', margin: '0 auto 10px' }} />
                <div style={{ width: '50%', height: '18px', background: '#e2e8f0', borderRadius: '4px', margin: '0 auto 14px' }} />
                <div style={{ width: '100%', height: '38px', background: '#f1f5f9', borderRadius: '8px' }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="discount-products-grid">
          {discountProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </section>
  );
};


