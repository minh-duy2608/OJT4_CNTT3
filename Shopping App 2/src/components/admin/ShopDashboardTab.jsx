import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  ShoppingBag, 
  Package, 
  AlertTriangle, 
  RefreshCw, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  Landmark, 
  CreditCard, 
  Edit3, 
  ShieldCheck,
  Calendar,
  X,
  Check
} from 'lucide-react';
import { revenueApi } from '../../services/revenueApi';
import { shopApi } from '../../services/shopApi';
import { paymentApi } from '../../services/paymentApi';
import { formatVND } from '../../data/products';

export const ShopDashboardTab = ({ shopId, shopName }) => {
  const [summary, setSummary] = useState(null);
  const [revenueData, setRevenueData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [payoutSummary, setPayoutSummary] = useState(null);
  const [shopDetail, setShopDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState('day');

  // Modal cập nhật tài khoản ngân hàng
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [bankName, setBankName] = useState('');
  const [bankBin, setBankBin] = useState('970422');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [savingBank, setSavingBank] = useState(false);

  const fetchShopData = async () => {
    if (!shopId) return;
    try {
      setLoading(true);
      const [sumRes, revRes, topRes, shopRes, payoutRes] = await Promise.all([
        revenueApi.getShopDashboardSummary(shopId).catch(() => null),
        revenueApi.getShopDashboardRevenue(shopId, period).catch(() => []),
        revenueApi.getShopTopProducts(shopId, 5).catch(() => []),
        shopApi.getShopById(shopId).catch(() => null),
        paymentApi.getShopPayouts(shopId).catch(() => null)
      ]);
      setSummary(sumRes);
      setRevenueData(Array.isArray(revRes) ? revRes : (revRes?.data || []));
      setTopProducts(Array.isArray(topRes) ? topRes : (topRes?.data || []));
      if (shopRes) {
        setShopDetail(shopRes);
        setBankName(shopRes.bankName || 'BIDV (Ngân hàng TMCP Đầu tư và Phát triển Việt Nam)');
        setBankBin(shopRes.bankBin || '970418');
        setBankAccountNumber(shopRes.bankAccountNumber || '8814310515');
        setBankAccountName(shopRes.bankAccountName || 'HOANG THIEN SON');
      }
      if (payoutRes) {
        setPayoutSummary(payoutRes);
      }
    } catch (err) {
      console.error('Lỗi tải thống kê doanh thu cửa hàng', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShopData();
  }, [shopId, period]);

  const handleSaveBankAccount = async (e) => {
    e.preventDefault();
    if (!bankAccountNumber.trim() || !bankAccountName.trim()) {
      alert('Vui lòng điền đầy đủ số tài khoản và tên chủ tài khoản!');
      return;
    }
    setSavingBank(true);
    try {
      const res = await paymentApi.updateShopBankAccount(shopId, {
        bankName: bankName.trim(),
        bankBin: bankBin.trim(),
        bankAccountNumber: bankAccountNumber.trim(),
        bankAccountName: bankAccountName.trim().toUpperCase()
      });
      if (res) {
        setShopDetail(res);
      }
      setIsBankModalOpen(false);
      fetchShopData();
    } catch (err) {
      alert(err.message || 'Lỗi khi lưu tài khoản ngân hàng');
    } finally {
      setSavingBank(false);
    }
  };

  return (
    <div className="admin-content-card">
      <div className="admin-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={22} color="#059669" />
            Báo cáo Doanh thu & Đối soát Cửa hàng: {shopName || `Shop #${shopId}`}
          </h2>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.85rem' }}>
            Thống kê doanh thu, tiến độ quyết toán từ Sàn Cyber và số tài khoản ngân hàng nhận tiền
          </p>
        </div>
        <button
          type="button"
          onClick={fetchShopData}
          className="admin-btn-refresh"
          title="Làm mới số liệu thống kê doanh thu"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Làm mới
        </button>
      </div>

      {/* Banner Chu kỳ quyết toán dành cho Shop */}
      <div style={{
        background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
        border: '1px solid #a7f3d0',
        borderRadius: '10px',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px',
        marginTop: '1.25rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={18} color="#059669" />
          <div style={{ fontSize: '0.82rem', color: '#065f46' }}>
            <strong>Chính sách quyết toán định kỳ:</strong> Doanh thu được chốt vào <strong>ngày 19 hàng tháng</strong> (Hạn giải ngân: <strong>2 ngày</strong>, đến hết ngày 21). Mức phí sàn dịch vụ tự động trích trừ: <strong>2.5%</strong> trên doanh thu sản phẩm.
          </div>
        </div>
        <div style={{ fontSize: '0.78rem', color: '#047857', fontWeight: 600 }}>
          🏦 STK nhận tiền: <strong>{bankName} - {bankAccountNumber || '8814310515'} ({bankAccountName || 'HOANG THIEN SON'})</strong>
        </div>
      </div>

      {/* Box thông tin tài khoản ngân hàng nhận tiền của Shop */}
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem 1.25rem', marginTop: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Landmark size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
              Tài khoản ngân hàng nhận tiền quyết toán từ Admin
            </div>
            {shopDetail?.bankAccountNumber ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px', flexWrap: 'wrap' }}>
                <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{shopDetail.bankName}</strong>
                <span style={{ color: '#94a3b8' }}>•</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563eb', fontSize: '0.95rem' }}>
                  STK: {shopDetail.bankAccountNumber}
                </span>
                <span style={{ color: '#94a3b8' }}>•</span>
                <span style={{ fontWeight: 600, color: '#334155', textTransform: 'uppercase', fontSize: '0.85rem' }}>
                  ({shopDetail.bankAccountName})
                </span>
              </div>
            ) : (
              <div style={{ color: '#dc2626', fontSize: '0.85rem', fontWeight: 600, marginTop: '2px' }}>
                ⚠️ Chưa thiết lập số tài khoản. Vui lòng bấm "Cập nhật ngân hàng" để Admin có thể chuyển tiền cho bạn!
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsBankModalOpen(true)}
          style={{ background: '#ffffff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '0.45rem 0.9rem', fontSize: '0.84rem', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <Edit3 size={14} /> Cập nhật ngân hàng
        </button>
      </div>

      {/* 3 Thẻ tiến độ tiền đối soát Escrow */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
        {/* Sàn đang tạm giữ */}
        <div style={{ background: '#fffbeb', padding: '1rem', borderRadius: '10px', border: '1px solid #fde68a' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#b45309', fontSize: '0.8rem', fontWeight: 600 }}>
            <ShieldCheck size={16} /> Sàn Cyber đang tạm giữ
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#d97706', marginTop: '4px' }}>
            {formatVND(payoutSummary?.totalHoldingAmount || 0)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#b45309', marginTop: '2px' }}>
            {payoutSummary?.totalHoldingCount || 0} đơn đang giao (chờ khách nhận hàng)
          </div>
        </div>

        {/* Chờ Admin chuyển tiền */}
        <div style={{ background: '#eff6ff', padding: '1rem', borderRadius: '10px', border: '1px solid #bfdbfe' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#1d4ed8', fontSize: '0.8rem', fontWeight: 600 }}>
            <Clock size={16} /> Chờ Admin chuyển tiền cho Shop
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#2563eb', marginTop: '4px' }}>
            {formatVND(payoutSummary?.totalReadyAmount || 0)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#1d4ed8', marginTop: '2px' }}>
            {payoutSummary?.totalReadyCount || 0} đơn khách đã nhận thành công
          </div>
        </div>

        {/* Đã nhận tiền về tài khoản */}
        <div style={{ background: '#f0fdf4', padding: '1rem', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#166534', fontSize: '0.8rem', fontWeight: 600 }}>
            <CheckCircle2 size={16} /> Tiền đã chuyển về tài khoản
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#15803d', marginTop: '4px' }}>
            {formatVND(payoutSummary?.totalPaidOutAmount || 0)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#166534', marginTop: '2px' }}>
            {payoutSummary?.totalPaidOutCount || 0} đơn đã được Admin chuyển khoản
          </div>
        </div>
      </div>

      {/* KPI Cards thông thường */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
        {/* Doanh thu thực nhận */}
        <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569', fontSize: '0.8rem', fontWeight: 600 }}>
            <DollarSign size={16} /> Tổng Doanh thu Cửa hàng
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
            {formatVND(summary?.totalRevenue || 0)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
            Từ đơn hoàn tất / đã thanh toán
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

      {/* MODAL CẬP NHẬT TÀI KHOẢN NGÂN HÀNG */}
      {isBankModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#ffffff', borderRadius: '14px', width: '100%', maxWidth: '440px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Landmark size={20} color="#2563eb" />
                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>Cài đặt Tài khoản Ngân hàng</h4>
              </div>
              <button type="button" onClick={() => setIsBankModalOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveBankAccount} style={{ padding: '1.25rem' }}>
              <p style={{ margin: '0 0 1rem 0', fontSize: '0.82rem', color: '#64748b', lineHeight: 1.5 }}>
                Tài khoản này dùng để Admin chuyển tiền thanh toán đơn hàng (PayOS) về cho cửa hàng của bạn sau khi khách nhận hàng thành công.
              </p>

              <div style={{ marginBottom: '0.85rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Tên Ngân hàng
                </label>
                <select
                  value={bankName}
                  onChange={(e) => {
                    setBankName(e.target.value);
                    if (e.target.value.includes('MB')) setBankBin('970422');
                    else if (e.target.value.includes('Vietcombank')) setBankBin('970436');
                    else if (e.target.value.includes('Techcombank')) setBankBin('970407');
                    else if (e.target.value.includes('ACB')) setBankBin('970416');
                    else if (e.target.value.includes('BIDV')) setBankBin('970418');
                    else if (e.target.value.includes('VPBank')) setBankBin('970432');
                    else if (e.target.value.includes('VietinBank')) setBankBin('970415');
                    else if (e.target.value.includes('TPBank')) setBankBin('970423');
                  }}
                  style={{ width: '100%', height: '38px', padding: '0 0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.85rem', outline: 'none' }}
                >
                  <option value="MB Bank (Ngân hàng Quân Đội)">MB Bank (Ngân hàng Quân Đội)</option>
                  <option value="Vietcombank (Ngoại Thương Việt Nam)">Vietcombank (Ngoại Thương Việt Nam)</option>
                  <option value="Techcombank (Kỹ Thương Việt Nam)">Techcombank (Kỹ Thương Việt Nam)</option>
                  <option value="VietinBank (Công Thương Việt Nam)">VietinBank (Công Thương Việt Nam)</option>
                  <option value="BIDV (Đầu Tư & Phát Triển)">BIDV (Đầu Tư & Phát Triển)</option>
                  <option value="ACB (Á Châu)">ACB (Á Châu)</option>
                  <option value="VPBank (Việt Nam Thịnh Vượng)">VPBank (Việt Nam Thịnh Vượng)</option>
                  <option value="TPBank (Tiên Phong)">TPBank (Tiên Phong)</option>
                  <option value="Ngân hàng khác">Ngân hàng khác</option>
                </select>
              </div>

              <div style={{ marginBottom: '0.85rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Số tài khoản nhận tiền
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: 0362490374"
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value)}
                  style={{ width: '100%', height: '38px', padding: '0 0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.85rem', outline: 'none', fontFamily: 'monospace', fontWeight: 600 }}
                  required
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Tên chủ tài khoản (In hoa không dấu)
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: NGUYEN VAN A"
                  value={bankAccountName}
                  onChange={(e) => setBankAccountName(e.target.value.toUpperCase())}
                  style={{ width: '100%', height: '38px', padding: '0 0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.85rem', outline: 'none', fontWeight: 600, textTransform: 'uppercase' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setIsBankModalOpen(false)}
                  style={{ background: '#fff', border: '1px solid #cbd5e1', padding: '0.45rem 0.9rem', borderRadius: '8px', fontSize: '0.84rem', cursor: 'pointer', color: '#475569' }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={savingBank}
                  style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '0.45rem 1.1rem', borderRadius: '8px', fontSize: '0.84rem', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  {savingBank ? 'Đang lưu...' : 'Lưu tài khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
