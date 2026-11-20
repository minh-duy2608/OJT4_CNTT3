import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bell,
  CheckCheck,
  CheckCircle,
  PackageCheck,
  Truck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X
} from 'lucide-react';
import { notificationApi } from '../services/notificationApi';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { useNavigate } from 'react-router-dom';
import './NotificationDropdown.css';

export const NotificationDropdown = () => {
  const { user, isAuthenticated } = useAuth();
  const chatContext = useChat?.();
  const subscribeNotifications = chatContext?.subscribeNotifications;

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toastNotif, setToastNotif] = useState(null);

  const dropdownRef = useRef(null);
  const toastTimerRef = useRef(null);
  const navigate = useNavigate();

  const isItemRead = (item) => Boolean(item?.isRead ?? item?.read ?? false);

  // 1. Tải danh sách thông báo của user
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated || !user?.id) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    try {
      setLoading(true);
      const res = await notificationApi.getNotificationsByUser(user.id);
      const list = Array.isArray(res) ? res : (res?.content || []);
      setNotifications(list);
      const unread = list.filter((n) => !isItemRead(n)).length;
      setUnreadCount(unread);
    } catch (err) {
      console.warn('Lỗi khi tải thông báo:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // 2. Xử lý khi có thông báo Real-time mới từ WebSocket
  const handleIncomingNotification = useCallback((incoming) => {
    if (!incoming) return;
    setNotifications((prev) => {
      if (incoming.id && prev.some((n) => n.id === incoming.id)) {
        return prev;
      }
      return [incoming, ...prev];
    });
    setUnreadCount((c) => c + 1);

    // Kích hoạt Toast nổi góc trên
    setToastNotif(incoming);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToastNotif(null);
    }, 5500);
  }, []);

  // Đăng ký lắng nghe WebSocket qua ChatContext và Window Event
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    let unsub = null;
    if (typeof subscribeNotifications === 'function') {
      unsub = subscribeNotifications(handleIncomingNotification);
    }

    const handleCustomEvent = (e) => {
      if (e?.detail) {
        handleIncomingNotification(e.detail);
      }
    };
    window.addEventListener('cyber:notification', handleCustomEvent);

    return () => {
      if (typeof unsub === 'function') unsub();
      window.removeEventListener('cyber:notification', handleCustomEvent);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, [isAuthenticated, user?.id, subscribeNotifications, handleIncomingNotification]);

  // 3. Tự động đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // 4. Đánh dấu 1 thông báo đã đọc
  const handleMarkAsRead = async (id, e) => {
    e?.stopPropagation();
    // Cập nhật giao diện ngay lập tức
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true, read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));

    try {
      await notificationApi.markAsRead(id);
    } catch (err) {
      console.error('Không thể đánh dấu đã đọc:', err);
    }
  };

  // 5. Đánh dấu tất cả thông báo đã đọc
  const handleMarkAllRead = async (e) => {
    e?.stopPropagation();
    // Cập nhật giao diện ngay lập tức: xóa số lượng trên chuông về 0
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true, read: true })));
    setUnreadCount(0);

    try {
      await notificationApi.markAllAsRead(user?.id);
    } catch (err) {
      console.error('Không thể đánh dấu tất cả đã đọc:', err);
    }
  };

  // 6. Click vào item thông báo -> đánh dấu đã đọc, giảm số lượng chuông, đóng dropdown, chuyển hướng tới /orders
  const handleItemClick = async (item) => {
    if (!isItemRead(item)) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, isRead: true, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      notificationApi.markAsRead(item.id).catch(console.warn);
    }
    setIsOpen(false);
    navigate('/orders');
  };

  // 7. Click vào toast nổi
  const handleToastClick = async () => {
    if (toastNotif) {
      if (!isItemRead(toastNotif)) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === toastNotif.id ? { ...n, isRead: true, read: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
        notificationApi.markAsRead(toastNotif.id).catch(console.warn);
      }
      setToastNotif(null);
      navigate('/orders');
    }
  };

  // 8. Định dạng thời gian hiển thị
  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    try {
      const d = new Date(timeStr);
      return new Intl.DateTimeFormat('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit'
      }).format(d);
    } catch {
      return timeStr;
    }
  };

  // 9. Lấy Icon theo trạng thái đơn hàng
  const getStatusIcon = (status = '', type = '') => {
    const s = (status || type || '').toUpperCase();
    if (s.includes('CONFIRMED')) {
      return (
        <div className="notif-status-circle status-confirmed" title="Đã xác nhận">
          <CheckCircle size={18} />
        </div>
      );
    }
    if (s.includes('WAITING') || s.includes('PICKUP') || s.includes('READY') || s.includes('PROCESSING')) {
      return (
        <div className="notif-status-circle status-packing" title="Chờ lấy hàng">
          <PackageCheck size={18} />
        </div>
      );
    }
    if (s.includes('SHIPP') || s.includes('DELIVERING')) {
      return (
        <div className="notif-status-circle status-shipping" title="Đang giao">
          <Truck size={18} />
        </div>
      );
    }
    if (s.includes('DELIVERED')) {
      return (
        <div className="notif-status-circle status-delivered" title="Giao thành công">
          <CheckCircle2 size={18} />
        </div>
      );
    }
    if (s.includes('CANCEL')) {
      return (
        <div className="notif-status-circle status-cancelled" title="Đã hủy">
          <XCircle size={18} />
        </div>
      );
    }
    return (
      <div className="notif-status-circle status-default" title="Thông báo đơn hàng">
        <AlertCircle size={18} />
      </div>
    );
  };

  // 10. Làm nổi bật mã đơn hàng trong nội dung tin nhắn
  const renderMessageContent = (message, orderCode) => {
    if (!message) return null;
    const targetCode = orderCode ? `#${orderCode}` : null;
    if (targetCode && message.includes(targetCode)) {
      const parts = message.split(targetCode);
      return (
        <span>
          {parts[0]}
          <strong className="notif-order-code-highlight">{targetCode}</strong>
          {parts.slice(1).join(targetCode)}
        </span>
      );
    }
    const regex = /(#[A-Za-z0-9_-]+)/g;
    const parts = message.split(regex);
    return (
      <span>
        {parts.map((part, idx) =>
          regex.test(part) ? (
            <strong key={idx} className="notif-order-code-highlight">{part}</strong>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  return (
    <div className="notif-wrapper" ref={dropdownRef}>
      {/* Nút Chuông Navbar */}
      <button
        type="button"
        className="cyber-action-btn notif-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Thông báo đơn hàng"
        title="Thông báo đơn hàng"
      >
        <Bell size={21} strokeWidth={1.8} />
        {unreadCount > 0 && (
          <span className="notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {/* Dropdown Menu Nổi */}
      {isOpen && (
        <div className="notif-dropdown" role="region" aria-label="Menu thông báo">
          {/* Header */}
          <div className="notif-dropdown-header">
            <div className="notif-title-row">
              <span className="notif-title">Thông báo</span>
              {unreadCount > 0 && (
                <span className="notif-unread-count-pill">{unreadCount} mới</span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                className="notif-mark-all-btn"
                onClick={handleMarkAllRead}
                title="Đánh dấu đã đọc tất cả"
              >
                <CheckCheck size={14} />
                <span>Đánh dấu đã đọc tất cả</span>
              </button>
            )}
          </div>

          {/* Danh sách Item */}
          <div className="notif-list">
            {loading && notifications.length === 0 ? (
              <div className="notif-empty">Đang tải thông báo...</div>
            ) : notifications.length === 0 ? (
              <div className="notif-empty">
                <Bell size={32} className="notif-empty-icon" />
                <p>Bạn chưa có thông báo nào</p>
              </div>
            ) : (
              notifications.map((item) => {
                const isUnread = !isItemRead(item);
                return (
                  <div
                    key={item.id}
                    className={`notif-item ${isUnread ? 'unread' : ''}`}
                    onClick={() => handleItemClick(item)}
                  >
                    {/* Cột trái: Vòng tròn icon màu theo trạng thái */}
                    <div className="notif-col-left">
                      {getStatusIcon(item.status, item.type)}
                    </div>

                    {/* Cột giữa: Tiêu đề in đậm, mô tả nổi bật mã đơn, thời gian */}
                    <div className="notif-col-center">
                      <div className="notif-item-title">{item.title}</div>
                      <div className="notif-item-desc">
                        {renderMessageContent(item.message, item.orderCode)}
                      </div>
                      <div className="notif-item-time">{formatTime(item.createdAt)}</div>
                    </div>

                    {/* Cột phải: Chấm tròn xanh nếu chưa đọc */}
                    <div className="notif-col-right">
                      {isUnread && <span className="notif-unread-dot" title="Chưa đọc" />}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Toast Thông báo Nhỏ Real-time khi có cập nhật mới */}
      {toastNotif && (
        <div className="notif-realtime-toast" onClick={handleToastClick} role="alert">
          <div className="notif-toast-icon">
            {getStatusIcon(toastNotif.status, toastNotif.type)}
          </div>
          <div className="notif-toast-content">
            <div className="notif-toast-title">{toastNotif.title}</div>
            <div className="notif-toast-desc">
              {renderMessageContent(toastNotif.message, toastNotif.orderCode)}
            </div>
          </div>
          <button
            type="button"
            className="notif-toast-close"
            onClick={(e) => {
              e.stopPropagation();
              setToastNotif(null);
            }}
            aria-label="Đóng thông báo"
          >
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
};
