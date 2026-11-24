import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  ExternalLink, 
  Clock, 
  AlertTriangle, 
  QrCode, 
  ShieldCheck, 
  RefreshCw 
} from 'lucide-react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { paymentApi } from '../services/paymentApi';
import { formatVND } from '../data/products';
import './PayOSPaymentModal.css';

export const PayOSPaymentModal = ({
  isOpen,
  onClose,
  orderId,
  onPaymentSuccess
}) => {
  const [paymentData, setPaymentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [remainingSeconds, setRemainingSeconds] = useState(300); // 5 phút (giữ hàng & QR)
  const [isExpired, setIsExpired] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [copiedField, setCopiedField] = useState(null);
  const [redirectCountdown, setRedirectCountdown] = useState(3);

  const stompClientRef = useRef(null);
  const pollingTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const redirectTimerRef = useRef(null);

  // 1. Tải dữ liệu thanh toán PayOS & mã QR ban đầu
  const initPayment = useCallback(async () => {
    if (!orderId) return;
    try {
      setLoading(true);
      setError('');
      setIsExpired(false);
      setIsSuccess(false);

      const data = await paymentApi.createPayOSLink(orderId);
      setPaymentData(data);

      if (data?.status === 'PAID') {
        setIsSuccess(true);
        return;
      }

      if (data?.status === 'EXPIRED') {
        setIsExpired(true);
        return;
      }

      if (data?.remainingSeconds !== undefined) {
        setRemainingSeconds(data.remainingSeconds);
        if (data.remainingSeconds <= 0) {
          setIsExpired(true);
        }
      }
    } catch (err) {
      console.error('Failed to init PayOS payment:', err);
      setError(err.message || 'Không thể tạo liên kết thanh toán PayOS.');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (isOpen && orderId) {
      initPayment();
    }
    return () => {
      cleanupTimersAndSockets();
    };
  }, [isOpen, orderId, initPayment]);

  // Dọn dẹp timers và WebSocket khi đóng modal
  const cleanupTimersAndSockets = () => {
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (redirectTimerRef.current) {
      clearInterval(redirectTimerRef.current);
      redirectTimerRef.current = null;
    }
    if (stompClientRef.current) {
      try {
        stompClientRef.current.deactivate();
      } catch {}
      stompClientRef.current = null;
    }
  };

  // 2. Đồng hồ đếm ngược 15:00 phút
  useEffect(() => {
    if (!isOpen || isSuccess || isExpired || loading) return;

    countdownIntervalRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current);
          setIsExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [isOpen, isSuccess, isExpired, loading]);

  // 3. Xử lý khi nhận được thông báo chuyển tiền thành công
  const handlePaymentConfirmed = useCallback(() => {
    if (isSuccess) return;
    setIsSuccess(true);
    cleanupTimersAndSockets();

    // Bắt đầu đếm ngược 3 giây tự động chuyển tiếp
    let count = 3;
    setRedirectCountdown(count);
    redirectTimerRef.current = setInterval(() => {
      count -= 1;
      setRedirectCountdown(count);
      if (count <= 0) {
        clearInterval(redirectTimerRef.current);
        if (onPaymentSuccess) {
          onPaymentSuccess();
        }
      }
    }, 1000);
  }, [isSuccess, onPaymentSuccess]);

  // 4. Lắng nghe WebSocket Real-time STOMP (kênh /topic/payos.{orderId})
  useEffect(() => {
    if (!isOpen || !orderId || isSuccess || isExpired) return;

    try {
      const token =
        localStorage.getItem('CYBER_ACCESS_TOKEN') ||
        sessionStorage.getItem('CYBER_ACCESS_TOKEN') || '';

      const stompClient = new Client({
        webSocketFactory: () =>
          new SockJS(`${window.location.protocol}//${window.location.host}/ws-chat`),
        connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
        reconnectDelay: 3000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
        onConnect: () => {
          stompClient.subscribe(`/topic/payos.${orderId}`, (message) => {
            try {
              const body = JSON.parse(message.body);
              if (body?.status === 'PAID' || body?.event === 'PAYMENT_SUCCESS') {
                handlePaymentConfirmed();
              } else if (body?.status === 'EXPIRED') {
                setIsExpired(true);
              }
            } catch (e) {
              console.warn('Error parsing WS message:', e);
            }
          });
        }
      });

      stompClient.activate();
      stompClientRef.current = stompClient;
    } catch (e) {
      console.warn('Failed to connect PayOS WebSocket:', e);
    }

    return () => {
      if (stompClientRef.current) {
        try {
          stompClientRef.current.deactivate();
        } catch {}
      }
    };
  }, [isOpen, orderId, isSuccess, isExpired, handlePaymentConfirmed]);

  // 5. Polling kiểm tra trạng thái mỗi 2.5s phòng hờ WebSocket
  useEffect(() => {
    if (!isOpen || !orderId || isSuccess || isExpired || loading) return;

    pollingTimerRef.current = setInterval(async () => {
      try {
        const res = await paymentApi.getPayOSStatus(orderId);
        if (res?.status === 'PAID') {
          handlePaymentConfirmed();
        } else if (res?.status === 'EXPIRED') {
          setIsExpired(true);
        }
      } catch (e) {
        // bỏ qua lỗi mạng tạm thời khi polling
      }
    }, 2000);

    return () => {
      if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
    };
  }, [isOpen, orderId, isSuccess, isExpired, loading, handlePaymentConfirmed]);

  // Helper copy text vào clipboard
  const handleCopy = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(String(text));
    setCopiedField(fieldName);
    setTimeout(() => {
      setCopiedField((curr) => (curr === fieldName ? null : curr));
    }, 2000);
  };

  // Định dạng thời gian đếm ngược mm:ss
  const formatCountdown = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const qrImageSrc = paymentData?.qrCode
    ? (paymentData.qrCode.startsWith('http://') || 
       paymentData.qrCode.startsWith('https://') || 
       paymentData.qrCode.startsWith('data:image')
        ? paymentData.qrCode
        : `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(paymentData.qrCode)}&size=320x320`)
    : '';

  if (!isOpen) return null;

  return (
    <div className="payos-modal-overlay" onClick={isSuccess ? undefined : onClose}>
      <div className="payos-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="payos-modal-header">
          <div className="payos-header-brand">
            <span className="payos-logo-badge">payOS</span>
            <span className="payos-vietqr-badge">VietQR</span>
            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>
              Quét mã QR Thanh toán 24/7
            </span>
          </div>
          {!isSuccess && (
            <button
              type="button"
              className="payos-close-btn"
              onClick={onClose}
              title="Đóng cửa sổ"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* =================================================================== */}
        {/* VIEW 1: KHI CHUYỂN KHOẢN THÀNH CÔNG (HIỆU ỨNG DẤU TÍCH XANH LÁ)     */}
        {/* =================================================================== */}
        {isSuccess ? (
          <div className="payos-success-view">
            {/* SVG Checkmark Animation */}
            <div className="payos-success-checkmark-box">
              <svg className="payos-checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                <circle className="payos-checkmark-circle" cx="26" cy="26" r="25" fill="none" />
                <path className="payos-checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
              </svg>
            </div>

            <h3 className="payos-success-title">
              ĐÃ NHẬN TIỀN THÀNH CÔNG!
            </h3>

            <p className="payos-success-desc">
              Cửa hàng đã nhận được chuyển khoản thanh toán thật qua cổng PayOS. Đơn hàng của bạn đã được xác nhận tự động.
            </p>

            <div className="payos-success-amount-badge">
              +{formatVND(paymentData?.amount || 0)}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', maxWidth: '340px' }}>
              <div className="payos-auto-redirect-hint" style={{ justifyContent: 'center' }}>
                <RefreshCw size={14} className="animate-spin" />
                Tự động chuyển đến đơn hàng sau <strong>{redirectCountdown}</strong> giây...
              </div>

              <button
                type="button"
                className="payos-btn-action payos-btn-primary"
                onClick={onPaymentSuccess}
              >
                Xem chi tiết đơn hàng ngay
              </button>
            </div>
          </div>
        ) : loading ? (
          /* Trạng thái đang khởi tạo PayOS */
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#64748b' }}>
            <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 1rem', color: '#2563eb' }} />
            <div style={{ fontWeight: 600, color: '#0f172a' }}>Đang khởi tạo mã VietQR PayOS...</div>
            <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>Hệ thống đang liên kết cổng thanh toán tự động</div>
          </div>
        ) : error ? (
          /* Trạng thái lỗi */
          <div style={{ padding: '3rem 2rem', textAlign: 'center', color: '#ef4444' }}>
            <AlertTriangle size={40} style={{ margin: '0 auto 1rem' }} />
            <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.5rem' }}>Không thể tạo mã thanh toán</div>
            <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1.5rem' }}>{error}</p>
            <button type="button" className="payos-btn-action payos-btn-primary" onClick={initPayment}>
              Thử lại
            </button>
          </div>
        ) : (
          /* =================================================================== */
          /* VIEW 2: HIỂN THỊ MÃ QR VÀ ĐỒNG HỒ ĐẾM NGƯỢC 5 PHÚT                 */
          /* =================================================================== */
          <div className="payos-modal-body">
            {/* Banner thời gian giữ hàng 5 phút */}
            <div className={`payos-timer-banner ${remainingSeconds <= 60 ? 'warning' : ''}`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={18} />
                <span>Thời gian giữ hàng & thanh toán:</span>
              </div>
              <div className="payos-timer-badge">
                {isExpired ? '00:00 (HẾT HẠN)' : formatCountdown(remainingSeconds)}
              </div>
            </div>

            {/* Khung mã QR */}
            <div className={`payos-qr-wrapper ${isExpired ? 'is-expired' : ''}`}>
              <img
                src={qrImageSrc}
                alt="Mã QR PayOS VietQR"
                className="payos-qr-image"
              />
              <div className="payos-scan-hint">
                <QrCode size={15} color="#2563eb" />
                <span>Mở app ngân hàng bất kỳ để quét mã VietQR</span>
              </div>

              {/* Lớp phủ khi quá 5 phút */}
              {isExpired && (
                <div className="payos-qr-expired-overlay">
                  <AlertTriangle size={36} color="#ef4444" style={{ marginBottom: '8px' }} />
                  <div style={{ fontWeight: 700, color: '#dc2626', fontSize: '1rem' }}>Mã QR đã hết hạn</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px', maxWidth: '240px' }}>
                    Đã hết 5 phút giữ hàng. Đơn hàng được tự động hủy để giải phóng tồn kho.
                  </div>
                </div>
              )}
            </div>

            {/* Trạng thái lắng nghe thời gian thực */}
            {!isExpired && (
              <div className="payos-live-status">
                <span className="payos-pulse-dot"></span>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 600, color: '#0f172a' }}>
                    Hệ thống đang chờ nhận tiền chuyển khoản tự động 24/7...
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                    Sau khi bạn chuyển tiền từ App ngân hàng, hệ thống sẽ tự động xác nhận và hiển thị dấu tích xanh thành công ngay lập tức!
                  </div>
                </div>
              </div>
            )}

            {/* Bảng chi tiết chuyển khoản ngân hàng */}
            <div className="payos-info-card">
              <div className="payos-info-row">
                <span className="payos-info-label">Ngân hàng thụ hưởng:</span>
                <span className="payos-info-value">{paymentData?.bankName || 'MB Bank'}</span>
              </div>

              <div className="payos-info-row">
                <span className="payos-info-label">Số tài khoản:</span>
                <span className="payos-info-value">
                  <span>{paymentData?.accountNumber}</span>
                  <button
                    type="button"
                    className={`payos-copy-btn ${copiedField === 'acc' ? 'copied' : ''}`}
                    onClick={() => handleCopy(paymentData?.accountNumber, 'acc')}
                  >
                    {copiedField === 'acc' ? <Check size={12} /> : <Copy size={12} />}
                    {copiedField === 'acc' ? 'Đã sao chép' : 'Sao chép'}
                  </button>
                </span>
              </div>

              <div className="payos-info-row">
                <span className="payos-info-label">Chủ tài khoản:</span>
                <span className="payos-info-value">{paymentData?.accountName || 'CYBER SHOP'}</span>
              </div>

              <div className="payos-info-row">
                <span className="payos-info-label">Số tiền cần thanh toán:</span>
                <span className="payos-info-value" style={{ color: '#dc2626', fontSize: '1rem' }}>
                  <span>{formatVND(paymentData?.amount || 0)}</span>
                  <button
                    type="button"
                    className={`payos-copy-btn ${copiedField === 'amount' ? 'copied' : ''}`}
                    onClick={() => handleCopy(paymentData?.amount, 'amount')}
                  >
                    {copiedField === 'amount' ? <Check size={12} /> : <Copy size={12} />}
                    {copiedField === 'amount' ? 'Đã sao chép' : 'Sao chép'}
                  </button>
                </span>
              </div>

              <div className="payos-info-row" style={{ background: '#fef3c7', padding: '6px 8px', borderRadius: '8px', border: '1px solid #fde68a' }}>
                <span className="payos-info-label" style={{ color: '#92400e', fontWeight: 600 }}>Nội dung chuyển khoản:</span>
                <span className="payos-info-value">
                  <strong style={{ color: '#b45309' }}>{paymentData?.description}</strong>
                  <button
                    type="button"
                    className={`payos-copy-btn ${copiedField === 'desc' ? 'copied' : ''}`}
                    onClick={() => handleCopy(paymentData?.description, 'desc')}
                  >
                    {copiedField === 'desc' ? <Check size={12} /> : <Copy size={12} />}
                    {copiedField === 'desc' ? 'Đã sao chép' : 'Sao chép'}
                  </button>
                </span>
              </div>
            </div>

            <div style={{ fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center', lineHeight: 1.4 }}>
              ⚠️ Lưu ý: Vui lòng nhập đúng <strong>Chính xác Số tiền</strong> và <strong>Nội dung chuyển khoản</strong> để hệ thống tự động ghi nhận thanh toán trong 3 giây.
            </div>

            {/* Các nút bấm hành động */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', marginTop: '0.5rem' }}>
              {paymentData?.checkoutUrl && paymentData.checkoutUrl !== 'https://pay.payos.vn' && !isExpired && (
                <a
                  href={paymentData.checkoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="payos-btn-action payos-btn-primary"
                  style={{ textDecoration: 'none' }}
                >
                  <ExternalLink size={16} /> Mở trang thanh toán PayOS trực tiếp
                </a>
              )}

              {isExpired ? (
                <button
                  type="button"
                  className="payos-btn-action payos-btn-secondary"
                  onClick={onClose}
                >
                  Đóng & Đặt lại đơn hàng
                </button>
              ) : (
                <button
                  type="button"
                  className="payos-btn-action payos-btn-secondary"
                  onClick={onClose}
                >
                  Tôi sẽ thanh toán sau (Giữ đơn 5 phút)
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

