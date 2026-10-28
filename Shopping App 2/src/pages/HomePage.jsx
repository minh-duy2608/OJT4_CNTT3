import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { HeroBanner } from '../components/HeroBanner';
import { ProductsPage } from './ProductsPage';
import { DiscountProducts } from '../components/DiscountProducts';
import { SummerSaleBanner } from '../components/SummerSaleBanner';

export const HomePage = () => {
  const [searchParams] = useSearchParams();
  const searchKeyword = searchParams.get('search');
  const categoryParam = searchParams.get('category');
  
  // Khi người dùng đang tìm kiếm hoặc chọn danh mục con, ẩn banner và các khối phụ để tập trung hiển thị kết quả
  const hasActiveFilter = Boolean(searchKeyword || categoryParam);

  return (
    <div className="home-page-container">
      {/* 1. Hero Banner 1: Trình chiếu sản phẩm Best Sale (Figma: Banner) */}
      {!hasActiveFilter && <HeroBanner />}

      {/* 2. Danh sách sản phẩm chính với 3 Tabs Figma (Figma: Products) */}
      <ProductsPage />

      {/* 3. Danh mục sản phẩm giảm giá (Figma: Discount Products) */}
      {!hasActiveFilter && <DiscountProducts />}

      {/* 4. Banner 2: Ưu đãi mùa hè (Figma: Banner 2) */}
      {!hasActiveFilter && <SummerSaleBanner />}
    </div>
  );
};
