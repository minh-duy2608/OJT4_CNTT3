import React, { useState, useEffect, useMemo } from 'react';
import { 
  Landmark, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  Search, 
  RefreshCw, 
  QrCode, 
  Copy, 
  Check, 
  AlertCircle,
  ExternalLink,
  Store,
  DollarSign,
  ArrowRight,
  Calendar,
  Percent,
  Truck,
  X,
  Layers,
  CreditCard,
  ChevronDown,
  ChevronUp,
  Building,
  ArrowUpRight
} from 'lucide-react';
import { paymentApi } from '../../services/paymentApi';
import { formatVND } from '../../data/products';
import { useCart } from '../../context/CartContext';
import './AdminPayoutsTab.css';

export const AdminPayoutsTab = ({ showToast: propShowToast }) => {
  const cartContext = useCart();
  const showToast = propShowToast || cartContext?.showToast || ((msg) => console.log(msg));

  const [loading, setLoading] = useState(false);
  const [summaryData, setSummaryData] = useState({
    totalHoldingAmount: 0,
    totalHoldingCount: 0,
    totalReadyAmount: 0,
    totalReadyCount: 0,
    totalPaidOutAmount: 0,
    totalPaidOutCount: 0,
    totalPlatformFee: 0,
    totalShippingFee: 0,
    items: []
  });

  // Chế độ xem: 'SHOPS' (Danh sách Cửa hàng - Mặc định) hoặc 'ORDERS' (Chi tiết từng đơn hàng)
  const [viewMode, setViewMode] = useState('SHOPS');

  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchKeyword, setSearchKeyword] = useState('');
  
  // Modal Thanh toán cho Shop
  const [selectedShopForPayment, setSelectedShopForPayment] = useState(null);
  const [expandedShopId, setExpandedShopId] = useState(null);

  // Modal quét mã QR chuyển tiền cho từng đơn (khi ở chế độ xem đơn)
  const [selectedPayoutForQR, setSelectedPayoutForQR] = useState(null);
  
  // Modal xác nhận chuyển tiền từng đơn
  const [payoutToConfirm, setPayoutToConfirm] = useState(null);
  const [confirmNote, setConfirmNote] = useState('');
  const [confirmTxRef, setConfirmTxRef] = useState('');
  const [confirming, setConfirming] = useState(false);

  const [copiedField, setCopiedField] = useState(null);

  const fetchPayouts = async () => {
    setLoading(true);
    try {
      const res = await paymentApi.getPayoutSummary(statusFilter);
      if (res) {
        setSummaryData(res);
      }
    } catch (err) {
      console.error('Fetch payouts error:', err);
      if (showToast) showToast(err.message || 'Lỗi khi tải dữ liệu đối soát', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayouts();
  }, [statusFilter]);

  const handleCopy = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(String(text));
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Gom nhóm dữ liệu theo từng Cửa hàng (Shop List)
  const shopList = useMemo(() => {
    const map = new Map();

    (summaryData.items || []).forEach(item => {
      const sId = item.shopId || 0;
      if (!map.has(sId)) {
        map.set(sId, {
          shopId: sId,
          shopName: item.shopName || `Cửa hàng #${sId}`,
          shopBankName: item.shopBankName || 'BIDV',
          shopBankBin: item.shopBankBin || '970418',
          shopBankAccountNumber: item.shopBankAccountNumber || '8814310515',
          shopBankAccountName: item.shopBankAccountName || 'CHỦ CỬA HÀNG',
          orders: [],
          totalGrossRevenue: 0,      // Doanh thu trước phí (tiền hàng)
          totalShippingFee: 0,       // Tiền ship
          totalPlatformFee: 0,       // Phí sàn (2.5%)
          totalNetRevenue: 0,        // Doanh thu sau khi trừ phí (97.5%)
          readyToPayAmount: 0,       // Số tiền thực Admin phải trả ngay (các đơn READY_FOR_PAYOUT)
          holdingAmount: 0,          // Tiền sàn đang tạm giữ (HOLDING)
          paidOutAmount: 0,          // Tiền đã thanh toán xong (PAID_OUT)
          readyOrdersCount: 0,
          holdingOrdersCount: 0,
          paidOutOrdersCount: 0,
        });
      }

      const shop = map.get(sId);
      shop.orders.push(item);

      const pAmount = Number(item.productAmount || item.totalAmount || 0);
      const sFee = Number(item.shippingFee || 0);
      const fFee = Number(item.platformFee || 0);
      const net = Number(item.shopPayoutAmount || (pAmount - fFee) || 0);

      shop.totalGrossRevenue += pAmount;
      shop.totalShippingFee += sFee;
      shop.totalPlatformFee += fFee;
      shop.totalNetRevenue += net;

      if (item.shopPayoutStatus === 'READY_FOR_PAYOUT') {
        shop.readyToPayAmount += net;
        shop.readyOrdersCount += 1;
      } else if (item.shopPayoutStatus === 'HOLDING') {
        shop.holdingAmount += net;
        shop.holdingOrdersCount += 1;
      } else if (item.shopPayoutStatus === 'PAID_OUT') {
        shop.paidOutAmount += net;
        shop.paidOutOrdersCount += 1;
      }

      if (item.shopBankAccountNumber && (!shop.shopBankAccountNumber || shop.shopBankAccountNumber === '8814310515')) {
        shop.shopBankAccountNumber = item.shopBankAccountNumber;
        shop.shopBankAccountName = item.shopBankAccountName || shop.shopBankAccountName;
        shop.shopBankName = item.shopBankName || shop.shopBankName;
        shop.shopBankBin = item.shopBankBin || shop.shopBankBin;
      }
    });

    return Array.from(map.values());
  }, [summaryData.items]);

  // Lọc danh sách Shop theo tìm kiếm và trạng thái
  const filteredShops = useMemo(() => {
    return shopList.filter(shop => {
      if (searchKeyword.trim()) {
        const kw = searchKeyword.toLowerCase();
        const matchName = shop.shopName && shop.shopName.toLowerCase().includes(kw);
        const matchStk = shop.shopBankAccountNumber && shop.shopBankAccountNumber.toLowerCase().includes(kw);
        const matchAccName = shop.shopBankAccountName && shop.shopBankAccountName.toLowerCase().includes(kw);
        const matchOrder = shop.orders.some(o => o.orderCode && o.orderCode.toLowerCase().includes(kw));
        if (!matchName && !matchStk && !matchAccName && !matchOrder) return false;
      }

      if (statusFilter === 'READY_FOR_PAYOUT') {
        return shop.readyOrdersCount > 0;
      }
      if (statusFilter === 'HOLDING') {
        return shop.holdingOrdersCount > 0;
      }
      if (statusFilter === 'PAID_OUT') {
        return shop.paidOutOrdersCount > 0 && shop.readyOrdersCount === 0;
      }
      return true;
    });
  }, [shopList, searchKeyword, statusFilter]);

  // Lọc danh sách từng đơn hàng theo tìm kiếm
  const filteredItems = useMemo(() => {
    return (summaryData.items || []).filter(item => {
      if (!searchKeyword.trim()) return true;
      const kw = searchKeyword.toLowerCase();
      return (
        (item.orderCode && item.orderCode.toLowerCase().includes(kw)) ||
        (item.shopName && item.shopName.toLowerCase().includes(kw)) ||
        (item.shopBankAccountNumber && item.shopBankAccountNumber.toLowerCase().includes(kw)) ||
        (item.shopBankAccountName && item.shopBankAccountName.toLowerCase().includes(kw))
      );
    });
  }, [summaryData.items, searchKeyword]);

  // Xử lý xác nhận thanh toán toàn bộ cho Shop
  const handleConfirmShopAllPayout = async () => {
    if (!selectedShopForPayment) return;
    setConfirming(true);
    try {
      await paymentApi.confirmShopAllPayout(selectedShopForPayment.shopId, {
        note: confirmNote.trim(),
        transactionRef: confirmTxRef.trim()
      });
      if (showToast) showToast(`Đã xác nhận thanh toán quyết toán cho Cửa hàng ${selectedShopForPayment.shopName}!`, 'success');
      setSelectedShopForPayment(null);
      setConfirmNote('');
      setConfirmTxRef('');
      fetchPayouts();
    } catch (err) {
      // Fallback: nếu cần xác nhận từng đơn
      try {
        const readyOrders = selectedShopForPayment.orders.filter(o => o.shopPayoutStatus === 'READY_FOR_PAYOUT');
        if (readyOrders.length > 0) {
          for (const ord of readyOrders) {
            await paymentApi.confirmShopPayout(ord.orderId, {
              note: confirmNote.trim(),
              transactionRef: confirmTxRef.trim()
            });
          }
          if (showToast) showToast(`Đã xác nhận thanh toán cho Shop ${selectedShopForPayment.shopName}!`, 'success');
          setSelectedShopForPayment(null);
          setConfirmNote('');
          setConfirmTxRef('');
          fetchPayouts();
          return;
        }
      } catch (fallbackErr) {
        console.warn('Fallback single payout error:', fallbackErr);
      }
      if (showToast) showToast(err.message || 'Lỗi khi xác nhận thanh toán cho Shop', 'error');
    } finally {
      setConfirming(false);
    }
  };

  // Xử lý xác nhận chuyển tiền đơn lẻ
  const handleConfirmSinglePayout = async () => {
    if (!payoutToConfirm) return;
    setConfirming(true);
    try {
      await paymentApi.confirmShopPayout(payoutToConfirm.orderId, {
        note: confirmNote.trim(),
        transactionRef: confirmTxRef.trim()
      });
      if (showToast) showToast(`Đã xác nhận chuyển tiền đơn #${payoutToConfirm.orderCode} cho Shop!`, 'success');
      setPayoutToConfirm(null);
      setConfirmNote('');
      setConfirmTxRef('');
      fetchPayouts();
    } catch (err) {
      if (showToast) showToast(err.message || 'Lỗi khi xác nhận chuyển tiền', 'error');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="admin-payouts-container">
      {/* Header Info Banner */}
      <div className="payout-banner" style={{ background: 'linear-gradient(135deg, #065f46 0%, #047857 100%)' }}>
        <div className="payout-banner-icon">
          <Landmark size={28} />
        </div>
        <div className="payout-banner-content">
          <h3>Mô hình Đối soát & Quyết toán Tiền cho Cửa hàng (Escrow Marketplace)</h3>
          <p>
            Khách hàng thanh toán PayOS trực tiếp vào tài khoản Admin <strong>HOANG THIEN SON - 0362 4903 74 (MB Bank)</strong>.
            Hệ thống tự động trích trừ <strong>2.5%</strong> phí sàn trên doanh thu sản phẩm và cước ship. Tiền được giải ngân định kỳ về tài khoản ngân hàng liên kết của Shop.
          </p>
        </div>
      </div>

      {/* Banner Chu kỳ quyết toán định kỳ ngày 19 hàng tháng */}
      <div style={{
        background: '#eff6ff',
        border: '1px solid #bfdbfe',
        borderRadius: '10px',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px',
        marginBottom: '0.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ background: '#2563eb', color: '#fff', borderRadius: '8px', padding: '6px', display: 'flex' }}>
            <Calendar size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.88rem' }}>
              Chu kỳ quyết toán định kỳ: Ngày 19 hàng tháng • Hạn chuyển: 2 ngày (đến hết ngày 21)
            </div>
            <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: '2px' }}>
              Số tiền quyết toán chuyển cho Shop là <strong>97.5%</strong> tiền hàng (đã tự động cấn trừ 2.5% phí sàn). Cước ship (20.000đ/đơn) trả đơn vị giao vận.
            </div>
          </div>
        </div>
        <div style={{
          background: '#dcfce7',
          color: '#166534',
          padding: '5px 12px',
          borderRadius: '999px',
          fontWeight: 700,
          fontSize: '0.78rem',
          border: '1px solid #bbf7d0'
        }}>
          🏦 Mặc định tài khoản Shop mẫu: BIDV 8814310515 - HOANG THIEN SON
        </div>
      </div>

      {/* 4 Thẻ thống kê KPI */}
      <div className="payout-kpi-grid">
        <div className="payout-kpi-card ready">
          <div className="kpi-header">
            <span className="kpi-label">Cần chuyển Shop (97.5%)</span>
            <Clock size={20} className="kpi-icon" />
          </div>
          <div className="kpi-value">{formatVND(summaryData.totalReadyAmount || 0)}</div>
          <div className="kpi-subtext">{summaryData.totalReadyCount || 0} đơn sẵn sàng chuyển kỳ ngày 19</div>
        </div>

        <div className="payout-kpi-card fee">
          <div className="kpi-header">
            <span className="kpi-label">Lợi nhuận phí sàn (2.5%)</span>
            <Percent size={20} className="kpi-icon" style={{ color: '#10b981' }} />
          </div>
          <div className="kpi-value" style={{ color: '#059669' }}>{formatVND(summaryData.totalPlatformFee || 0)}</div>
          <div className="kpi-subtext">Lãi thuần sàn thu được từ các đơn hàng</div>
        </div>

        <div className="payout-kpi-card holding">
          <div className="kpi-header">
            <span className="kpi-label">Quỹ cước ship (Vận chuyển)</span>
            <Truck size={20} className="kpi-icon" />
          </div>
          <div className="kpi-value">{formatVND(summaryData.totalShippingFee || 0)}</div>
          <div className="kpi-subtext">Cước ship dành cho shipper / giao vận</div>
        </div>

        <div className="payout-kpi-card paid">
          <div className="kpi-header">
            <span className="kpi-label">Đã quyết toán xong</span>
            <CheckCircle2 size={20} className="kpi-icon" />
          </div>
          <div className="kpi-value">{formatVND(summaryData.totalPaidOutAmount || 0)}</div>
          <div className="kpi-subtext">{summaryData.totalPaidOutCount || 0} đơn đã chuyển khoản thành công</div>
        </div>
      </div>

      {/* Toolbar: Switcher Chế độ xem + Lọc + Tìm kiếm */}
      <div className="payout-toolbar">
        <div className="payout-toolbar-left">
          {/* TAB CHUYỂN ĐỔI CHẾ ĐỘ XEM */}
          <div className="payout-view-mode-tabs">
            <button 
              type="button"
              className={`payout-view-tab ${viewMode === 'SHOPS' ? 'active' : ''}`}
              onClick={() => setViewMode('SHOPS')}
              title="Xem đối soát tổng hợp theo từng Cửa hàng"
            >
              <Store size={15} />
              <span>Danh sách Cửa hàng</span>
              <span className="payout-view-tab-count">{filteredShops.length}</span>
            </button>
            <button 
              type="button"
              className={`payout-view-tab ${viewMode === 'ORDERS' ? 'active' : ''}`}
              onClick={() => setViewMode('ORDERS')}
              title="Xem chi tiết từng đơn hàng riêng lẻ"
            >
              <Layers size={15} />
              <span>Chi tiết Đơn hàng</span>
              <span className="payout-view-tab-count">{filteredItems.length}</span>
            </button>
          </div>

          <select 
            className="payout-filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">Tất cả trạng thái quyết toán</option>
            <option value="READY_FOR_PAYOUT">⚡ Cần chuyển tiền cho Shop (Khách đã nhận)</option>
            <option value="HOLDING">🛡️ Sàn đang giữ tiền (Đang giao hàng)</option>
            <option value="PAID_OUT">✅ Đã chuyển tiền cho Shop</option>
          </select>

          <div className="payout-search-box">
            <Search size={14} color="#94a3b8" />
            <input 
              type="text"
              placeholder={viewMode === 'SHOPS' ? "Tìm tên shop, số tài khoản..." : "Tìm mã đơn, tên shop, STK..."}
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
            />
            {searchKeyword && (
              <button type="button" onClick={() => setSearchKeyword('')} className="payout-search-clear">
                <X size={13} />
              </button>
            )}
          </div>

          <button 
            type="button" 
            className="payout-btn-refresh" 
            onClick={fetchPayouts}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Làm mới
          </button>
        </div>

        <div className="payout-toolbar-right">
          {viewMode === 'SHOPS' ? (
            <span>Tổng cộng <strong>{filteredShops.length}</strong> Cửa hàng</span>
          ) : (
            <span>Tìm thấy <strong>{filteredItems.length}</strong> đơn hàng</span>
          )}
        </div>
      </div>

      {/* ============================================================================
       * 1. CHẾ ĐỘ XEM: DANH SÁCH CỬA HÀNG (SHOP LIST VIEW) - THEO YÊU CẦU NGƯỜI DÙNG
       * ============================================================================ */}
      {viewMode === 'SHOPS' && (
        <>
          {loading ? (
            <div className="payout-loading">
              <RefreshCw size={24} className="animate-spin" />
              <span>Đang tải danh sách đối soát theo Cửa hàng...</span>
            </div>
          ) : filteredShops.length === 0 ? (
            <div className="payout-empty">
              <AlertCircle size={40} style={{ opacity: 0.3 }} />
              <div>Không có Cửa hàng nào phù hợp với bộ lọc hiện tại.</div>
            </div>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table payout-table">
                <thead>
                  <tr>
                    <th style={{ minWidth: '170px' }}>Thông tin Cửa hàng</th>
                    <th style={{ minWidth: '180px' }}>Tài khoản Ngân hàng Shop</th>
                    <th style={{ width: '130px', textAlign: 'right' }}>Doanh thu trước phí</th>
                    <th style={{ width: '110px', textAlign: 'right', color: '#059669' }}>Phí sàn (2.5%)</th>
                    <th style={{ width: '130px', textAlign: 'right' }}>Doanh thu sau phí</th>
                    <th style={{ width: '150px', textAlign: 'right' }}>Thực tế Admin phải trả</th>
                    <th style={{ width: '130px', textAlign: 'center' }}>Trạng thái</th>
                    <th className="sticky-col-right" style={{ width: '180px', textAlign: 'right' }}>Quyết toán & Thanh toán</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredShops.map(shop => {
                    const hasReady = shop.readyToPayAmount > 0;
                    const hasHolding = shop.holdingAmount > 0;
                    const isAllPaid = !hasReady && !hasHolding && shop.paidOutAmount > 0;
                    const isExpanded = expandedShopId === shop.shopId;

                    return (
                      <React.Fragment key={shop.shopId}>
                        <tr>
                          {/* 1. THÔNG TIN SHOP */}
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '8px',
                                background: '#f0fdf4',
                                border: '1px solid #bbf7d0',
                                color: '#16a34a',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                fontSize: '0.9rem',
                                flexShrink: 0
                              }}>
                                <Store size={18} />
                              </div>
                              <div>
                                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.92rem' }}>
                                  {shop.shopName}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span>ID: #{shop.shopId}</span>
                                  <span>•</span>
                                  <span><strong>{shop.orders.length}</strong> đơn hàng</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* 2. TÀI KHOẢN NGÂN HÀNG */}
                          <td>
                            {shop.shopBankAccountNumber ? (
                              <div>
                                <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.82rem' }}>
                                  {shop.shopBankName}
                                </div>
                                <div style={{ fontSize: '0.76rem', color: '#334155', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                  <span>STK: <strong>{shop.shopBankAccountNumber}</strong></span>
                                  <button
                                    type="button"
                                    className="payout-mini-copy"
                                    onClick={() => handleCopy(shop.shopBankAccountNumber, `shop_stk_${shop.shopId}`)}
                                    title="Sao chép số tài khoản"
                                  >
                                    {copiedField === `shop_stk_${shop.shopId}` ? <Check size={11} color="#059669" /> : <Copy size={11} />}
                                  </button>
                                </div>
                                <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase' }}>
                                  {shop.shopBankAccountName}
                                </div>
                              </div>
                            ) : (
                              <div style={{ fontSize: '0.75rem', color: '#dc2626', background: '#fee2e2', padding: '3px 8px', borderRadius: '4px', display: 'inline-block' }}>
                                ⚠️ Chưa cập nhật STK
                              </div>
                            )}
                          </td>

                          {/* 3. DOANH THU TRƯỚC PHÍ */}
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.92rem' }}>
                              {formatVND(shop.totalGrossRevenue)}
                            </div>
                            <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Tiền hàng</div>
                          </td>

                          {/* 4. PHÍ SÀN 2.5% */}
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 700, color: '#059669', fontSize: '0.88rem' }}>
                              -{formatVND(shop.totalPlatformFee)}
                            </div>
                            <div style={{ fontSize: '0.68rem', color: '#10b981' }}>2.5% phí sàn</div>
                          </td>

                          {/* 5. DOANH THU SAU KHI TRỪ PHÍ */}
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 700, color: '#334155', fontSize: '0.92rem' }}>
                              {formatVND(shop.totalNetRevenue)}
                            </div>
                            <div style={{ fontSize: '0.68rem', color: '#64748b' }}>97.5% thực tế</div>
                          </td>

                          {/* 6. SỐ TIỀN THỰC ADMIN PHẢI TRẢ CHO SHOP */}
                          <td style={{ textAlign: 'right' }}>
                            <div style={{
                              fontWeight: 800,
                              color: hasReady ? '#047857' : (hasHolding ? '#b45309' : '#64748b'),
                              fontSize: '1.02rem',
                              background: hasReady ? '#ecfdf5' : 'transparent',
                              padding: hasReady ? '3px 8px' : '0',
                              borderRadius: '6px',
                              display: 'inline-block'
                            }}>
                              {formatVND(hasReady ? shop.readyToPayAmount : (hasHolding ? shop.holdingAmount : 0))}
                            </div>
                            <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '2px' }}>
                              {hasReady ? (
                                <span style={{ color: '#047857', fontWeight: 600 }}>Cần chuyển ngay ({shop.readyOrdersCount} đơn)</span>
                              ) : hasHolding ? (
                                <span style={{ color: '#b45309' }}>Tạm giữ ({shop.holdingOrdersCount} đơn đang giao)</span>
                              ) : (
                                <span>Đã thanh toán hết</span>
                              )}
                            </div>
                          </td>

                          {/* 7. TRẠNG THÁI */}
                          <td style={{ textAlign: 'center' }}>
                            {hasReady && (
                              <span className="payout-status-badge ready" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                ⚡ Cần thanh toán
                              </span>
                            )}
                            {!hasReady && hasHolding && (
                              <span className="payout-status-badge holding">
                                🛡️ Đang giữ tiền
                              </span>
                            )}
                            {isAllPaid && (
                              <span className="payout-status-badge paid">
                                ✅ Đã thanh toán
                              </span>
                            )}
                          </td>

                          {/* 8. HÀNH ĐỘNG: NÚT THANH TOÁN CHO SHOP */}
                          <td className="sticky-col-right" style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                              {/* Nút Thanh toán cho Shop: Bấm vào mở Modal thông tin thanh toán */}
                              <button
                                type="button"
                                className={`payout-btn-pay-shop ${hasReady ? '' : 'secondary'}`}
                                onClick={() => {
                                  setSelectedShopForPayment(shop);
                                  setConfirmNote('');
                                  setConfirmTxRef('');
                                }}
                                title="Bấm vào để xem thông tin thanh toán của Shop và chuyển tiền"
                              >
                                <CreditCard size={14} />
                                <span>{hasReady ? 'Thanh toán' : 'Xem thanh toán'}</span>
                              </button>

                              {/* Nút thu gọn / mở rộng chi tiết các đơn hàng của shop */}
                              <button
                                type="button"
                                className="shop-expand-btn"
                                onClick={() => setExpandedShopId(isExpanded ? null : shop.shopId)}
                                title={isExpanded ? "Thu gọn danh sách đơn hàng" : "Xem chi tiết các đơn hàng của Shop"}
                              >
                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* HÀNG MỞ RỘNG: XEM NHANH TẤT CẢ CÁC ĐƠN HÀNG CỦA SHOP NÀY */}
                        {isExpanded && (
                          <tr style={{ background: '#f8fafc' }}>
                            <td colSpan={8} style={{ padding: '12px 18px' }}>
                              <div style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '12px 14px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                  <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Layers size={14} color="#059669" />
                                    <span>Danh sách đơn hàng của Shop {shop.shopName} ({shop.orders.length} đơn)</span>
                                  </div>
                                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                    Gồm: <strong style={{ color: '#2563eb' }}>{shop.readyOrdersCount}</strong> đơn sẵn sàng chuyển • <strong style={{ color: '#f59e0b' }}>{shop.holdingOrdersCount}</strong> đơn đang giữ • <strong style={{ color: '#059669' }}>{shop.paidOutOrdersCount}</strong> đơn đã chuyển
                                  </div>
                                </div>

                                <table className="shop-orders-collapsible-table">
                                  <thead>
                                    <tr>
                                      <th>Mã đơn</th>
                                      <th>Ngày tạo / Giao</th>
                                      <th>Người nhận</th>
                                      <th style={{ textAlign: 'right' }}>Tiền hàng</th>
                                      <th style={{ textAlign: 'right' }}>Phí sàn (2.5%)</th>
                                      <th style={{ textAlign: 'right' }}>Thực nhận (97.5%)</th>
                                      <th style={{ textAlign: 'center' }}>Trạng thái</th>
                                      <th style={{ textAlign: 'right' }}>Thao tác đơn</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {shop.orders.map(o => (
                                      <tr key={o.orderId}>
                                        <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0f172a' }}>
                                          #{o.orderCode || o.orderId}
                                        </td>
                                        <td style={{ fontSize: '0.74rem', color: '#64748b' }}>
                                          {o.createdAt ? new Date(o.createdAt).toLocaleDateString('vi-VN') : '-'}
                                        </td>
                                        <td>{o.recipientName || 'Khách mua'}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatVND(o.productAmount || o.totalAmount)}</td>
                                        <td style={{ textAlign: 'right', color: '#059669' }}>-{formatVND(o.platformFee)}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#2563eb' }}>{formatVND(o.shopPayoutAmount)}</td>
                                        <td style={{ textAlign: 'center' }}>
                                          {o.shopPayoutStatus === 'READY_FOR_PAYOUT' && <span className="payout-status-badge ready">⚡ Chờ chuyển</span>}
                                          {o.shopPayoutStatus === 'HOLDING' && <span className="payout-status-badge holding">🛡️ Đang giữ</span>}
                                          {o.shopPayoutStatus === 'PAID_OUT' && <span className="payout-status-badge paid">✅ Đã chuyển</span>}
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                          {o.shopPayoutStatus === 'READY_FOR_PAYOUT' && (
                                            <button
                                              type="button"
                                              className="payout-btn-action confirm"
                                              style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                                              onClick={() => {
                                                setPayoutToConfirm(o);
                                                setConfirmNote('');
                                                setConfirmTxRef('');
                                              }}
                                            >
                                              Xác nhận đơn này
                                            </button>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ============================================================================
       * 2. CHẾ ĐỘ XEM: CHI TIẾT TỪNG ĐƠN HÀNG (ORDERS DETAIL VIEW)
       * ============================================================================ */}
      {viewMode === 'ORDERS' && (
        <>
          {loading ? (
            <div className="payout-loading">
              <RefreshCw size={24} className="animate-spin" />
              <span>Đang tải danh sách đối soát đơn hàng...</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="payout-empty">
              <AlertCircle size={40} style={{ opacity: 0.3 }} />
              <div>Không có đơn hàng nào phù hợp với bộ lọc hiện tại.</div>
            </div>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table payout-table">
                <thead>
                  <tr>
                    <th style={{ width: '100px' }}>Mã đơn & Ngày</th>
                    <th style={{ minWidth: '130px' }}>Cửa hàng</th>
                    <th style={{ width: '100px', textAlign: 'right' }}>Tiền hàng</th>
                    <th style={{ width: '85px', textAlign: 'right' }}>Cước ship</th>
                    <th style={{ width: '95px', textAlign: 'right', color: '#059669' }}>Phí sàn (2.5%)</th>
                    <th style={{ width: '115px', textAlign: 'right' }}>Thực nhận (97.5%)</th>
                    <th style={{ minWidth: '180px' }}>Tài khoản Shop</th>
                    <th style={{ width: '120px', textAlign: 'center' }}>Trạng thái</th>
                    <th className="sticky-col-right" style={{ width: '180px', textAlign: 'right' }}>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map(item => {
                    const isReady = item.shopPayoutStatus === 'READY_FOR_PAYOUT';
                    const isPaidOut = item.shopPayoutStatus === 'PAID_OUT';
                    const isHolding = item.shopPayoutStatus === 'HOLDING';

                    return (
                      <tr key={item.orderId}>
                        <td>
                          <div style={{ fontWeight: 700, fontFamily: 'monospace', color: '#0f172a' }}>
                            #{item.orderCode || item.orderId}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                            {item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN') : ''}
                          </div>
                        </td>

                        <td>
                          <div style={{ fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Store size={14} color="#059669" />
                            <span>{item.shopName}</span>
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                            Khách: {item.recipientName || 'Người mua'}
                          </div>
                        </td>

                        <td style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>
                            {formatVND(item.productAmount || item.totalAmount || 0)}
                          </div>
                        </td>

                        <td style={{ textAlign: 'right', color: '#64748b', fontSize: '0.82rem' }}>
                          {formatVND(item.shippingFee || 0)}
                        </td>

                        <td style={{ textAlign: 'right', color: '#059669', fontWeight: 600, fontSize: '0.82rem' }}>
                          +{formatVND(item.platformFee || 0)}
                        </td>

                        <td style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 700, color: '#2563eb', fontSize: '0.92rem' }}>
                            {formatVND(item.shopPayoutAmount || 0)}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: '#64748b' }}>97.5% tiền hàng</div>
                        </td>

                        <td>
                          {item.shopBankAccountNumber ? (
                            <div>
                              <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.82rem' }}>
                                {item.shopBankName}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#334155', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                <span>STK: <strong>{item.shopBankAccountNumber}</strong></span>
                                <button
                                  type="button"
                                  className="payout-mini-copy"
                                  onClick={() => handleCopy(item.shopBankAccountNumber, `stk_${item.orderId}`)}
                                  title="Sao chép số tài khoản"
                                >
                                  {copiedField === `stk_${item.orderId}` ? <Check size={11} color="#059669" /> : <Copy size={11} />}
                                </button>
                              </div>
                              <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase' }}>
                                {item.shopBankAccountName}
                              </div>
                            </div>
                          ) : (
                            <div style={{ fontSize: '0.75rem', color: '#dc2626', background: '#fee2e2', padding: '3px 8px', borderRadius: '4px', display: 'inline-block' }}>
                              ⚠️ Shop chưa cài đặt STK ngân hàng
                            </div>
                          )}
                        </td>

                        <td style={{ textAlign: 'center' }}>
                          {isReady && (
                            <span className="payout-status-badge ready">
                              ⚡ Chờ chuyển tiền
                            </span>
                          )}
                          {isHolding && (
                            <span className="payout-status-badge holding">
                              🛡️ Sàn đang giữ tiền
                            </span>
                          )}
                          {isPaidOut && (
                            <span className="payout-status-badge paid">
                              ✅ Đã chuyển tiền
                            </span>
                          )}
                        </td>

                        <td className="sticky-col-right" style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                            {/* Nút Tạo mã VietQR chuyển tiền */}
                            {item.shopBankAccountNumber && (
                              <button
                                type="button"
                                className="payout-btn-action qr"
                                onClick={() => setSelectedPayoutForQR(item)}
                                title="Quét mã VietQR chuyển tiền cho Shop bằng App Ngân hàng"
                              >
                                <QrCode size={13} />
                                Quét QR
                              </button>
                            )}

                            {/* Nút Xác nhận đã chuyển tiền */}
                            {isReady && (
                              <button
                                type="button"
                                className="payout-btn-action confirm"
                                onClick={() => {
                                  setPayoutToConfirm(item);
                                  setConfirmNote('');
                                  setConfirmTxRef('');
                                }}
                                title="Xác nhận bạn đã chuyển khoản thành công cho Shop"
                              >
                                <CheckCircle2 size={13} />
                                Xác nhận đã chuyển
                              </button>
                            )}

                            {isPaidOut && (
                              <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 600 }}>
                                {item.shopPayoutAt ? new Date(item.shopPayoutAt).toLocaleDateString('vi-VN') : 'Hoàn tất'}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ============================================================================
       * 3. MODAL THANH TOÁN CHO CỬA HÀNG (KHI BẤM "THANH TOÁN" TRÊN SHOP LIST)
       * ============================================================================ */}
      {selectedShopForPayment && (() => {
        const shop = selectedShopForPayment;
        const amountToPay = shop.readyToPayAmount > 0 ? shop.readyToPayAmount : shop.totalNetRevenue;
        const vietQrUrl = shop.shopBankAccountNumber
          ? `https://img.vietqr.io/image/${shop.shopBankBin || '970418'}-${shop.shopBankAccountNumber}-compact2.png?amount=${Math.round(amountToPay)}&addInfo=${encodeURIComponent(`CYBER QT SHOP ${shop.shopId}`)}&accountName=${encodeURIComponent(shop.shopBankAccountName || 'CHỦ SHOP')}`
          : null;

        return (
          <div className="payout-modal-overlay" onClick={() => setSelectedShopForPayment(null)}>
            <div className="payout-modal-card shop-payment-box" onClick={(e) => e.stopPropagation()}>
              <div className="payout-modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ background: '#ecfdf5', color: '#047857', padding: '6px', borderRadius: '8px', display: 'flex' }}>
                    <CreditCard size={20} />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 800, color: '#0f172a' }}>
                      Thông tin Thanh toán & Quyết toán: {shop.shopName}
                    </h4>
                    <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                      ID Shop: #{shop.shopId} • Số đơn hàng: {shop.orders.length} đơn
                    </span>
                  </div>
                </div>
                <button type="button" className="payout-modal-close" onClick={() => setSelectedShopForPayment(null)}>
                  <X size={18} />
                </button>
              </div>

              <div className="shop-payment-modal-body">
                {/* 1. MÃ VIETQR VÀ THÔNG TIN TÀI KHOẢN NGÂN HÀNG CỦA SHOP */}
                <div className="shop-payment-grid">
                  {/* Mã QR quét tự động */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                    {vietQrUrl ? (
                      <>
                        <img 
                          src={vietQrUrl} 
                          alt="VietQR Payout" 
                          className="payout-qr-image"
                          style={{ width: '210px', height: '210px' }}
                        />
                        <div style={{ fontSize: '0.74rem', color: '#059669', fontWeight: 600, marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <QrCode size={13} /> Quét mã bằng App Ngân hàng
                        </div>
                      </>
                    ) : (
                      <div style={{ padding: '2rem 1rem', background: '#fee2e2', color: '#dc2626', borderRadius: '10px', fontSize: '0.8rem' }}>
                        ⚠️ Cửa hàng chưa cài đặt thông tin số tài khoản hợp lệ
                      </div>
                    )}
                  </div>

                  {/* Thông tin tài khoản ngân hàng của Shop */}
                  <div className="shop-bank-box">
                    <div className="shop-bank-header">
                      <Building size={16} color="#059669" />
                      <span>Tài khoản thụ hưởng của Cửa hàng</span>
                    </div>

                    <div className="shop-bank-item">
                      <span className="shop-bank-label">Ngân hàng thụ hưởng:</span>
                      <span className="shop-bank-val" style={{ color: '#0f172a' }}>
                        {shop.shopBankName}
                      </span>
                    </div>

                    <div className="shop-bank-item">
                      <span className="shop-bank-label">Số tài khoản nhận tiền:</span>
                      <div className="shop-bank-val" style={{ color: '#2563eb', fontFamily: 'monospace', fontSize: '1.05rem' }}>
                        <span>{shop.shopBankAccountNumber}</span>
                        <button
                          type="button"
                          className="payout-mini-copy"
                          onClick={() => handleCopy(shop.shopBankAccountNumber, 'modal_shop_stk')}
                          title="Sao chép số tài khoản"
                        >
                          {copiedField === 'modal_shop_stk' ? <Check size={12} color="#059669" /> : <Copy size={12} />}
                          <span style={{ fontSize: '0.7rem' }}>{copiedField === 'modal_shop_stk' ? 'Đã chép' : 'Chép STK'}</span>
                        </button>
                      </div>
                    </div>

                    <div className="shop-bank-item">
                      <span className="shop-bank-label">Chủ tài khoản thụ hưởng:</span>
                      <span className="shop-bank-val" style={{ textTransform: 'uppercase', color: '#0f172a' }}>
                        {shop.shopBankAccountName}
                      </span>
                    </div>

                    <div className="shop-bank-item">
                      <span className="shop-bank-label">Nội dung chuyển khoản (Memo):</span>
                      <div className="shop-bank-val" style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                        <span>{`CYBER QT SHOP ${shop.shopId}`}</span>
                        <button
                          type="button"
                          className="payout-mini-copy"
                          onClick={() => handleCopy(`CYBER QT SHOP ${shop.shopId}`, 'modal_shop_memo')}
                          title="Sao chép nội dung chuyển khoản"
                        >
                          {copiedField === 'modal_shop_memo' ? <Check size={12} color="#059669" /> : <Copy size={12} />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. BẢNG TỔNG HỢP DOANH THU & SỐ TIỀN THỰC ADMIN PHẢI TRẢ CHO SHOP */}
                <div className="shop-financial-card">
                  <div className="shop-financial-grid">
                    <div className="shop-financial-item">
                      <div className="shop-financial-label">Doanh thu trước phí (Tiền hàng)</div>
                      <div className="shop-financial-val">{formatVND(shop.totalGrossRevenue)}</div>
                    </div>
                    <div className="shop-financial-item">
                      <div className="shop-financial-label">Khấu trừ phí sàn (2.5%)</div>
                      <div className="shop-financial-val" style={{ color: '#059669' }}>
                        -{formatVND(shop.totalPlatformFee)}
                      </div>
                    </div>
                    <div className="shop-financial-item">
                      <div className="shop-financial-label">Doanh thu sau phí (97.5%)</div>
                      <div className="shop-financial-val" style={{ color: '#334155' }}>
                        {formatVND(shop.totalNetRevenue)}
                      </div>
                    </div>
                  </div>

                  {/* SỐ TIỀN THỰC TẾ ADMIN PHẢI TRẢ CHO SHOP */}
                  <div className="shop-highlight-payout">
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#065f46', textTransform: 'uppercase' }}>
                        💰 Số tiền thực Admin phải trả cho Shop:
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#047857', marginTop: '2px' }}>
                        {shop.readyOrdersCount > 0 
                          ? `(Quyết toán cho ${shop.readyOrdersCount} đơn hàng khách đã nhận thành công)`
                          : `(Tất cả đơn hàng của Shop đã được thanh toán hoàn tất)`}
                      </div>
                    </div>
                    <div className="shop-payout-amount-big">
                      {formatVND(amountToPay)}
                    </div>
                  </div>
                </div>

                {/* 3. DANH SÁCH CÁC ĐƠN HÀNG CỦA SHOP TRONG ĐỢT THANH TOÁN */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#1e293b', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Layers size={14} color="#059669" />
                    <span>Chi tiết các đơn hàng của Cửa hàng ({shop.orders.length} đơn):</span>
                  </div>

                  <table className="shop-orders-collapsible-table">
                    <thead>
                      <tr>
                        <th>Mã đơn</th>
                        <th>Ngày đặt</th>
                        <th style={{ textAlign: 'right' }}>Tiền hàng</th>
                        <th style={{ textAlign: 'right' }}>Phí sàn (2.5%)</th>
                        <th style={{ textAlign: 'right' }}>Thực nhận (97.5%)</th>
                        <th style={{ textAlign: 'center' }}>Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shop.orders.map(o => (
                        <tr key={o.orderId}>
                          <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0f172a' }}>
                            #{o.orderCode || o.orderId}
                          </td>
                          <td style={{ fontSize: '0.74rem', color: '#64748b' }}>
                            {o.createdAt ? new Date(o.createdAt).toLocaleDateString('vi-VN') : '-'}
                          </td>
                          <td style={{ textAlign: 'right' }}>{formatVND(o.productAmount || o.totalAmount)}</td>
                          <td style={{ textAlign: 'right', color: '#059669' }}>-{formatVND(o.platformFee)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: '#2563eb' }}>{formatVND(o.shopPayoutAmount)}</td>
                          <td style={{ textAlign: 'center' }}>
                            {o.shopPayoutStatus === 'READY_FOR_PAYOUT' && <span className="payout-status-badge ready">⚡ Chờ chuyển</span>}
                            {o.shopPayoutStatus === 'HOLDING' && <span className="payout-status-badge holding">🛡️ Đang giữ</span>}
                            {o.shopPayoutStatus === 'PAID_OUT' && <span className="payout-status-badge paid">✅ Đã chuyển</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 4. FORM NHẬP THÔNG TIN XÁC NHẬN CHUYỂN TIỀN */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
                    Xác nhận chuyển khoản sau khi Admin đã thực hiện chuyển tiền:
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '8px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>
                        Mã giao dịch ngân hàng / Ref
                      </label>
                      <input 
                        type="text"
                        className="payout-input"
                        placeholder="Ví dụ: MB123456789"
                        value={confirmTxRef}
                        onChange={(e) => setConfirmTxRef(e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>
                        Ghi chú quyết toán cho Shop
                      </label>
                      <input 
                        type="text"
                        className="payout-input"
                        placeholder="Ví dụ: Đã quyết toán kỳ ngày 19"
                        value={confirmNote}
                        onChange={(e) => setConfirmNote(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* FOOTER MODAL THANH TOÁN CHO SHOP */}
              <div className="payout-modal-footer">
                <button 
                  type="button" 
                  className="payout-btn-action-sec"
                  onClick={() => setSelectedShopForPayment(null)}
                  disabled={confirming}
                >
                  Đóng
                </button>

                <button
                  type="button"
                  className="payout-btn-action-pri"
                  onClick={handleConfirmShopAllPayout}
                  disabled={confirming || shop.readyOrdersCount === 0}
                  style={{
                    background: shop.readyOrdersCount > 0 ? '#059669' : '#94a3b8',
                    cursor: shop.readyOrdersCount > 0 ? 'pointer' : 'not-allowed'
                  }}
                >
                  {confirming ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" /> Đang cập nhật...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} /> 
                      <span>{shop.readyOrdersCount > 0 ? `Xác nhận đã chuyển ${formatVND(amountToPay)} cho Shop` : 'Tất cả đơn đã thanh toán xong'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL QUÉT MÃ VIETQR CHUYỂN TIỀN CHO TỪNG ĐƠN (CHẾ ĐỘ ĐƠN HÀNG) */}
      {selectedPayoutForQR && (
        <div className="payout-modal-overlay" onClick={() => setSelectedPayoutForQR(null)}>
          <div className="payout-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="payout-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <QrCode size={20} color="#059669" />
                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>
                  Quét mã VietQR chuyển tiền cho Shop
                </h4>
              </div>
              <button type="button" className="payout-modal-close" onClick={() => setSelectedPayoutForQR(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="payout-modal-body">
              <div className="payout-qr-center">
                {selectedPayoutForQR.vietQrUrl ? (
                  <img 
                    src={selectedPayoutForQR.vietQrUrl} 
                    alt="VietQR Payout" 
                    className="payout-qr-image"
                  />
                ) : (
                  <div style={{ color: '#dc2626' }}>Shop chưa cài đặt thông tin ngân hàng hợp lệ</div>
                )}
              </div>

              <div className="payout-transfer-details">
                <div className="detail-row">
                  <span>Cửa hàng thụ hưởng:</span>
                  <strong>{selectedPayoutForQR.shopName}</strong>
                </div>
                <div className="detail-row">
                  <span>Ngân hàng thụ hưởng:</span>
                  <strong>{selectedPayoutForQR.shopBankName}</strong>
                </div>
                <div className="detail-row">
                  <span>Số tài khoản:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <strong style={{ fontFamily: 'monospace', fontSize: '1rem', color: '#2563eb' }}>
                      {selectedPayoutForQR.shopBankAccountNumber}
                    </strong>
                    <button
                      type="button"
                      className="payout-mini-copy"
                      onClick={() => handleCopy(selectedPayoutForQR.shopBankAccountNumber, 'modal_stk')}
                    >
                      {copiedField === 'modal_stk' ? <Check size={12} color="#059669" /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>
                <div className="detail-row">
                  <span>Chủ tài khoản:</span>
                  <strong style={{ textTransform: 'uppercase' }}>{selectedPayoutForQR.shopBankAccountName}</strong>
                </div>
                <div className="detail-row">
                  <span>Tiền hàng:</span>
                  <strong>{formatVND(selectedPayoutForQR.productAmount || selectedPayoutForQR.totalAmount || 0)}</strong>
                </div>
                <div className="detail-row">
                  <span>Khấu trừ phí sàn Cyber (2.5%):</span>
                  <strong style={{ color: '#059669' }}>-{formatVND(selectedPayoutForQR.platformFee || 0)}</strong>
                </div>
                <div className="detail-row highlight">
                  <span>Số tiền thực chuyển (97.5%):</span>
                  <strong style={{ color: '#2563eb', fontSize: '1.2rem' }}>
                    {formatVND(selectedPayoutForQR.shopPayoutAmount || 0)}
                  </strong>
                </div>
                <div className="detail-row">
                  <span>Nội dung chuyển:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                      CYBER DON {selectedPayoutForQR.orderCode}
                    </span>
                    <button
                      type="button"
                      className="payout-mini-copy"
                      onClick={() => handleCopy(`CYBER DON ${selectedPayoutForQR.orderCode}`, 'modal_desc')}
                    >
                      {copiedField === 'modal_desc' ? <Check size={12} color="#059669" /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="payout-modal-footer">
              <button 
                type="button" 
                className="payout-btn-action-sec"
                onClick={() => setSelectedPayoutForQR(null)}
              >
                Đóng
              </button>
              <button
                type="button"
                className="payout-btn-action-pri"
                onClick={() => {
                  const item = selectedPayoutForQR;
                  setSelectedPayoutForQR(null);
                  setPayoutToConfirm(item);
                }}
              >
                <CheckCircle2 size={15} /> Đã chuyển xong & Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN CHUYỂN TIỀN CHO ĐƠN LẺ */}
      {payoutToConfirm && (
        <div className="payout-modal-overlay" onClick={() => setPayoutToConfirm(null)}>
          <div className="payout-modal-card confirm-box" onClick={(e) => e.stopPropagation()}>
            <div className="payout-modal-header">
              <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>
                Xác nhận đã chuyển tiền cho Shop
              </h4>
              <button type="button" className="payout-modal-close" onClick={() => setPayoutToConfirm(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="payout-modal-body">
              <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '1rem' }}>
                Bạn xác nhận đã dùng tài khoản ngân hàng chuyển thành công số tiền 
                <strong style={{ color: '#059669' }}> {formatVND(payoutToConfirm.shopPayoutAmount || payoutToConfirm.totalAmount)} </strong> 
                cho Shop <strong>{payoutToConfirm.shopName}</strong> (STK: {payoutToConfirm.shopBankAccountNumber} - {payoutToConfirm.shopBankName})?
              </p>

              <div style={{ marginBottom: '0.85rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Mã giao dịch ngân hàng / Ref (Tùy chọn)
                </label>
                <input 
                  type="text"
                  className="payout-input"
                  placeholder="Ví dụ: MB123456789 hoặc để trống"
                  value={confirmTxRef}
                  onChange={(e) => setConfirmTxRef(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Ghi chú cho Shop (Tùy chọn)
                </label>
                <textarea
                  className="payout-input"
                  rows="2"
                  placeholder="Ghi chú đối soát đơn hàng..."
                  value={confirmNote}
                  onChange={(e) => setConfirmNote(e.target.value)}
                />
              </div>
            </div>

            <div className="payout-modal-footer">
              <button 
                type="button" 
                className="payout-btn-action-sec"
                disabled={confirming}
                onClick={() => setPayoutToConfirm(null)}
              >
                Hủy
              </button>
              <button
                type="button"
                className="payout-btn-action-pri"
                disabled={confirming}
                onClick={handleConfirmSinglePayout}
              >
                {confirming ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" /> Đang lưu...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={15} /> Xác nhận chuyển tiền
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
