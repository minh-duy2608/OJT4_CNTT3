import React, { useState, useEffect } from 'react';
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
  X
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
    items: []
  });

  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchKeyword, setSearchKeyword] = useState('');
  
  // Modal quét mã QR chuyển tiền
  const [selectedPayoutForQR, setSelectedPayoutForQR] = useState(null);
  
  // Modal xác nhận chuyển tiền
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

  const handleConfirmPayout = async () => {
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

  const filteredItems = (summaryData.items || []).filter(item => {
    if (!searchKeyword.trim()) return true;
    const kw = searchKeyword.toLowerCase();
    return (
      (item.orderCode && item.orderCode.toLowerCase().includes(kw)) ||
      (item.shopName && item.shopName.toLowerCase().includes(kw)) ||
      (item.shopBankAccountNumber && item.shopBankAccountNumber.toLowerCase().includes(kw)) ||
      (item.shopBankAccountName && item.shopBankAccountName.toLowerCase().includes(kw))
    );
  });

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
        marginBottom: '1rem'
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

      {/* Toolbar lọc và tìm kiếm */}
      <div className="payout-toolbar">
        <div className="payout-toolbar-left">
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
              placeholder="Tìm mã đơn, tên shop, STK..."
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
          <span>Tìm thấy <strong>{filteredItems.length}</strong> đơn hàng</span>
        </div>
      </div>

      {/* Bảng danh sách đơn hàng cần quyết toán */}
      {loading ? (
        <div className="payout-loading">
          <RefreshCw size={24} className="animate-spin" />
          <span>Đang tải danh sách đối soát...</span>
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
                <th style={{ minWidth: '180px' }}>Tài khoản BIDV Shop</th>
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
                            title="Quét mã VietQR chuyển tiền cho Shop bằng MB Bank"
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

      {/* MODAL QUÉT MÃ VIETQR CHUYỂN TIỀN CHO SHOP */}
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
                  <span>Tiền hàng sau giảm giá:</span>
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
                  <span>Kỳ quyết toán:</span>
                  <span style={{ fontSize: '0.8rem', color: '#475569' }}>Ngày 19 hàng tháng (Hạn 2 ngày)</span>
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

      {/* MODAL XÁC NHẬN CHUYỂN TIỀN CHO SHOP */}
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
                onClick={handleConfirmPayout}
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

