import React, { useState } from 'react';
import { 
  CreditCard, 
  X, 
  QrCode, 
  Building, 
  Copy, 
  Check, 
  Layers, 
  CheckCircle2, 
  RefreshCw, 
  ArrowRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { formatVND } from '../../data/products';
import { paymentApi } from '../../services/paymentApi';
import './AdminPayoutsTab.css';

export const ShopPaymentModal = ({ shop, onClose, onSuccess, showToast }) => {
  if (!shop) return null;

  const [copiedField, setCopiedField] = useState(null);
  const [confirmNote, setConfirmNote] = useState('');
  const [confirmTxRef, setConfirmTxRef] = useState('');
  const [confirming, setConfirming] = useState(false);

  // Chuẩn hóa dữ liệu cửa hàng (tương thích cả AdminPage và AdminPayoutsTab)
  const shopId = shop.shopId || shop.id;
  const shopName = shop.shopName || shop.name || `Cửa hàng #${shopId}`;
  const ownerName = shop.ownerName || shop.ownerDisplayName || 'Chủ cửa hàng';
  const ownerEmail = shop.ownerEmail || shop.email || '';
  const shopPhone = shop.shopPhone || shop.phone || '';

  // Thông tin ngân hàng
  const bankName = shop.shopBankName || shop.bankName || 'BIDV';
  const bankBin = shop.shopBankBin || shop.bankBin || '970418';
  const bankAccountNumber = shop.shopBankAccountNumber || shop.bankAccountNumber || '8814310515';
  const bankAccountName = (shop.shopBankAccountName || shop.bankAccountName || ownerName || 'CHỦ CỬA HÀNG').toUpperCase();

  // Dữ liệu tài chính
  const grossRev = Number(shop.totalGrossRevenue ?? shop.totalRevenue ?? 0);
  const platformFee = Number(shop.totalPlatformFee ?? Math.round(grossRev * 0.025));
  const netRev = Number(shop.totalNetRevenue ?? Math.max(0, grossRev - platformFee));
  const amountToPay = Number(shop.readyToPayAmount > 0 ? shop.readyToPayAmount : (netRev > 0 ? netRev : 0));

  // Danh sách đơn hàng
  const ordersList = Array.isArray(shop.orders) ? shop.orders : [];
  const totalOrdersCount = ordersList.length || shop.totalOrders || 0;
  const readyOrdersCount = shop.readyOrdersCount ?? ordersList.filter(o => o.shopPayoutStatus === 'READY_FOR_PAYOUT').length;

  const transferMemo = `CYBER QT SHOP ${shopId}`;
  const vietQrUrl = bankAccountNumber
    ? `https://img.vietqr.io/image/${bankBin}-${bankAccountNumber}-compact2.png?amount=${Math.round(amountToPay)}&addInfo=${encodeURIComponent(transferMemo)}&accountName=${encodeURIComponent(bankAccountName)}`
    : null;

  const handleCopy = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(String(text));
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleConfirmPayout = async () => {
    setConfirming(true);
    try {
      if (paymentApi && paymentApi.confirmShopAllPayout) {
        await paymentApi.confirmShopAllPayout(shopId, {
          note: confirmNote.trim(),
          transactionRef: confirmTxRef.trim()
        });
      }
      if (showToast) {
        showToast(`Đã ghi nhận chuyển khoản quyết toán cho Cửa hàng ${shopName}!`, 'success');
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.warn('Lỗi confirmShopAllPayout:', err);
      // Fallback nếu xác nhận đơn lẻ
      try {
        const readyOrders = ordersList.filter(o => o.shopPayoutStatus === 'READY_FOR_PAYOUT');
        if (readyOrders.length > 0) {
          for (const ord of readyOrders) {
            await paymentApi.confirmShopPayout(ord.orderId, {
              note: confirmNote.trim(),
              transactionRef: confirmTxRef.trim()
            });
          }
          if (showToast) showToast(`Đã thanh toán thành công cho ${shopName}!`, 'success');
          if (onSuccess) onSuccess();
          onClose();
          return;
        }
      } catch (fallbackErr) {
        console.error('Fallback single payout error:', fallbackErr);
      }
      if (showToast) showToast(err.message || 'Lỗi khi xác nhận thanh toán cho Shop', 'error');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="payout-modal-overlay" onClick={onClose} style={{ zIndex: 99999 }}>
      <div className="payout-modal-card shop-payment-box" onClick={(e) => e.stopPropagation()}>
        {/* HEADER MODAL */}
        <div className="payout-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: '#ecfdf5', color: '#047857', padding: '8px', borderRadius: '10px', display: 'flex' }}>
              <CreditCard size={22} />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                Thông tin Thanh toán & Quyết toán: {shopName}
              </h4>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                Mã Cửa hàng: <strong>#{shopId}</strong> &bull; Tổng đơn: <strong>{totalOrdersCount}</strong> đơn hàng
              </span>
            </div>
          </div>
          <button type="button" className="payout-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* BODY MODAL */}
        <div className="shop-payment-modal-body">
          {/* PHẦN 1: MÃ VIETQR VÀ THÔNG TIN TÀI KHOẢN NGÂN HÀNG CỦA SHOP */}
          <div className="shop-payment-grid">
            {/* Mã QR quét tự động */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              {vietQrUrl ? (
                <>
                  <img 
                    src={vietQrUrl} 
                    alt="VietQR Payout" 
                    className="payout-qr-image"
                    style={{ width: '220px', height: '220px' }}
                  />
                  <div style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 600, marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <QrCode size={14} /> Quét mã bằng App Ngân hàng (VietQR)
                  </div>
                </>
              ) : (
                <div style={{ padding: '2rem 1rem', background: '#fee2e2', color: '#dc2626', borderRadius: '10px', fontSize: '0.82rem' }}>
                  <AlertCircle size={20} style={{ margin: '0 auto 8px' }} />
                  Cửa hàng chưa thiết lập số tài khoản ngân hàng
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
                <span className="shop-bank-val" style={{ color: '#0f172a', fontWeight: 700 }}>
                  {bankName}
                </span>
              </div>

              <div className="shop-bank-item">
                <span className="shop-bank-label">Số tài khoản nhận tiền:</span>
                <div className="shop-bank-val" style={{ color: '#2563eb', fontFamily: 'monospace', fontSize: '1.08rem', fontWeight: 700 }}>
                  <span>{bankAccountNumber}</span>
                  <button
                    type="button"
                    className="payout-mini-copy"
                    onClick={() => handleCopy(bankAccountNumber, 'modal_stk')}
                    title="Sao chép số tài khoản"
                  >
                    {copiedField === 'modal_stk' ? <Check size={12} color="#059669" /> : <Copy size={12} />}
                    <span style={{ fontSize: '0.72rem' }}>{copiedField === 'modal_stk' ? 'Đã chép' : 'Sao chép'}</span>
                  </button>
                </div>
              </div>

              <div className="shop-bank-item">
                <span className="shop-bank-label">Chủ tài khoản thụ hưởng:</span>
                <span className="shop-bank-val" style={{ textTransform: 'uppercase', color: '#0f172a', fontWeight: 700 }}>
                  {bankAccountName}
                </span>
              </div>

              <div className="shop-bank-item">
                <span className="shop-bank-label">Nội dung chuyển khoản (Memo):</span>
                <div className="shop-bank-val" style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                  <span>{transferMemo}</span>
                  <button
                    type="button"
                    className="payout-mini-copy"
                    onClick={() => handleCopy(transferMemo, 'modal_memo')}
                    title="Sao chép nội dung chuyển khoản"
                  >
                    {copiedField === 'modal_memo' ? <Check size={12} color="#059669" /> : <Copy size={12} />}
                  </button>
                </div>
              </div>

              <div className="shop-bank-item" style={{ borderBottom: 'none' }}>
                <span className="shop-bank-label">Liên hệ chủ cửa hàng:</span>
                <span className="shop-bank-val" style={{ color: '#475569', fontSize: '0.8rem' }}>
                  {ownerName} {shopPhone ? `(${shopPhone})` : ''}
                </span>
              </div>
            </div>
          </div>

          {/* PHẦN 2: BẢNG TỔNG HỢP DOANH THU & SỐ TIỀN THỰC ADMIN PHẢI TRẢ CHO SHOP */}
          <div className="shop-financial-card">
            <div className="shop-financial-grid">
              <div className="shop-financial-item">
                <div className="shop-financial-label">Doanh thu trước phí (100%)</div>
                <div className="shop-financial-val">{formatVND(grossRev)}</div>
              </div>
              <div className="shop-financial-item">
                <div className="shop-financial-label">Khấu trừ phí sàn (2.5%)</div>
                <div className="shop-financial-val" style={{ color: '#dc2626' }}>
                  -{formatVND(platformFee)}
                </div>
              </div>
              <div className="shop-financial-item">
                <div className="shop-financial-label">Doanh thu sau phí (97.5%)</div>
                <div className="shop-financial-val" style={{ color: '#059669' }}>
                  {formatVND(netRev)}
                </div>
              </div>
            </div>

            {/* SỐ TIỀN THỰC TẾ ADMIN PHẢI TRẢ CHO SHOP */}
            <div className="shop-highlight-payout">
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#065f46', textTransform: 'uppercase' }}>
                  💰 Số tiền thực Admin phải trả cho Shop:
                </div>
                <div style={{ fontSize: '0.75rem', color: '#047857', marginTop: '2px' }}>
                  {readyOrdersCount > 0 
                    ? `(Quyết toán cho ${readyOrdersCount} đơn hàng khách đã nhận thành công)`
                    : totalOrdersCount > 0
                      ? `(Tổng tiền thanh toán sau khi trừ 2.5% phí sàn)`
                      : `(Chưa có đơn hàng phát sinh)`}
                </div>
              </div>
              <div className="shop-payout-amount-big">
                {formatVND(amountToPay)}
              </div>
            </div>
          </div>

          {/* PHẦN 3: DANH SÁCH CHI TIẾT ĐƠN HÀNG NẾU CÓ */}
          {ordersList.length > 0 && (
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#1e293b', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Layers size={14} color="#059669" />
                <span>Chi tiết các đơn hàng của Cửa hàng ({ordersList.length} đơn):</span>
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
                  {ordersList.map(o => (
                    <tr key={o.orderId || o.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0f172a' }}>
                        #{o.orderCode || o.orderId || o.id}
                      </td>
                      <td style={{ fontSize: '0.74rem', color: '#64748b' }}>
                        {o.createdAt ? new Date(o.createdAt).toLocaleDateString('vi-VN') : '-'}
                      </td>
                      <td style={{ textAlign: 'right' }}>{formatVND(o.productAmount || o.totalAmount)}</td>
                      <td style={{ textAlign: 'right', color: '#dc2626' }}>-{formatVND(o.platformFee)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#2563eb' }}>{formatVND(o.shopPayoutAmount || (o.totalAmount - (o.platformFee || 0)))}</td>
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
          )}

          {/* PHẦN 4: FORM NHẬP XÁC NHẬN CHUYỂN KHOẢN */}
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

        {/* FOOTER MODAL */}
        <div className="payout-modal-footer">
          <button 
            type="button" 
            className="payout-btn-action-sec"
            onClick={onClose}
            disabled={confirming}
          >
            Đóng
          </button>

          <button
            type="button"
            className="payout-btn-action-pri"
            onClick={handleConfirmPayout}
            disabled={confirming || amountToPay === 0}
            style={{
              background: amountToPay > 0 ? '#059669' : '#94a3b8',
              cursor: amountToPay > 0 ? 'pointer' : 'not-allowed'
            }}
          >
            {confirming ? (
              <>
                <RefreshCw size={14} className="animate-spin" /> Đang cập nhật...
              </>
            ) : (
              <>
                <CheckCircle2 size={16} /> 
                <span>
                  {amountToPay > 0 
                    ? `Xác nhận đã chuyển ${formatVND(amountToPay)} cho Shop` 
                    : 'Không có số dư cần thanh toán'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
