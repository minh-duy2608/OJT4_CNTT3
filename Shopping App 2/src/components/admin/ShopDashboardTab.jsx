import React, { useState, useEffect } from 'react';
import { TrendingUp, ShoppingBag, Package, AlertTriangle, RefreshCw, DollarSign, CheckCircle2, Clock } from 'lucide-react';
import { revenueApi } from '../../services/revenueApi';
import { formatVND } from '../../data/products';

export const ShopDashboardTab = ({ shopId, shopName }) => {
  const [summary, setSummary] = useState(null);
  const [revenueData, setRevenueData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState('day');

  const fetchShopData = async () => {
    if (!shopId) return;
    try {
      setLoading(true);
      const [sumRes, revRes, topRes] = await Promise.all([
        revenueApi.getShopDashboardSummary(shopId).catch(() => null),
        revenueApi.getShopDashboardRevenue(shopId, period).catch(() => []),
        revenueApi.getShopTopProducts(shopId, 5).catch(() => [])
      ]);
      setSummary(sumRes);
      setRevenueData(Array.isArray(revRes) ? revRes : (revRes?.data || []));
      setTopProducts(Array.isArray(topRes) ? topRes : (topRes?.data || []));
    } catch (err) {
      console.error('Lỗi tải thống kê doanh thu cửa hàng', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShopData();
  }, [shopId, period]);

  return (
    <div className="admin-content-card">
      <div className="admin-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={22} color="#059669" />
            Báo cáo Doanh thu & Hiệu suất Bán hàng: {shopName || `Shop #${shopId}`}
          </h2>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.85rem' }}>
            Thống kê doanh thu thực tế, GMV, đơn hàng thành công và danh sách sản phẩm bán chạy nhất
          </p>
        </div>
        <button
          type="button"
          onClick={fetchShopData}
          className="admin-btn-secondary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Làm mới
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem', marginTop: '1.25rem' }}>
        {/* Doanh thu thực nhận */}
        <div style={{ background: '#f0fdf4', padding: '1rem', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#166534', fontSize: '0.8rem', fontWeight: 600 }}>
            <DollarSign size={16} /> Doanh thu Thực nhận
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#15803d', marginTop: '4px' }}>
            {formatVND(summary?.totalRevenue || 0)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#166534', marginTop: '2px' }}>
            Từ đơn đã giao thành công / đã thanh toán
          </div>
        </div>

        {/* Tổng giá trị đơn hàng GMV */}
        <div style={{ background: '#eff6ff', padding: '1rem', borderRadius: '10px', border: '1px solid #bfdbfe' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#1e40af', fontSize: '0.8rem', fontWeight: 600 }}>
            <TrendingUp size={16} /> Tổng GMV Đơn hàng
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1d4ed8', marginTop: '4px' }}>
            {formatVND(summary?.totalGmv || 0)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#1e40af', marginTop: '2px' }}>
            Tổng giá trị đơn phát sinh (trừ đơn hủy)
          </div>
        </div>

        {/* Đơn hàng thành công */}
        <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569', fontSize: '0.8rem', fontWeight: 600 }}>
            <CheckCircle2 size={16} color="#059669" /> Đơn hoàn tất / Tổng đơn
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
            {summary?.deliveredOrders || 0} / {summary?.totalOrders || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
            {summary?.processingOrders || 0} đang xử lý, {summary?.cancelledOrders || 0} đã hủy
          </div>
        </div>

        {/* Sản phẩm & Cảnh báo tồn kho */}
        <div style={{ background: '#fff7ed', padding: '1rem', borderRadius: '10px', border: '1px solid #fed7aa' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#9a3412', fontSize: '0.8rem', fontWeight: 600 }}>
            <Package size={16} color="#ea580c" /> Sản phẩm / Cảnh báo kho
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#c2410c', marginTop: '4px' }}>
            {summary?.activeProducts || 0} SP đang bán
          </div>
          <div style={{ fontSize: '0.75rem', color: '#9a3412', marginTop: '2px', fontWeight: 600 }}>
            {summary?.lowStockCount || 0} sản phẩm sắp hết hàng
          </div>
        </div>
      </div>

      {/* Top sản phẩm bán chạy nhất */}
      <div style={{ marginTop: '1.5rem', background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '1rem' }}>
        <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
          Top Sản phẩm Bán chạy nhất của Cửa hàng
        </h3>
        {topProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '1.5rem', color: '#94a3b8', fontSize: '0.85rem' }}>
            Chưa có dữ liệu sản phẩm bán chạy.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {topProducts.map((p, idx) => (
              <div key={p.productId || idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0.8rem', background: '#f8fafc', borderRadius: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontWeight: 800, color: idx === 0 ? '#f59e0b' : idx === 1 ? '#94a3b8' : '#cd7f32', fontSize: '0.9rem' }}>
                    #{idx + 1}
                  </span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#1e293b' }}>{p.productName}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Đã bán: <strong>{p.totalSold || 0}</strong> chiếc</div>
                  </div>
                </div>
                <div style={{ fontWeight: 700, color: '#059669', fontSize: '0.85rem' }}>
                  {formatVND(p.totalRevenue || 0)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

