import React, { useState, useEffect, useRef } from 'react';
import { Bell, CheckCheck, Trash2, ExternalLink, Info, AlertCircle, Package, Truck, RotateCcw } from 'lucide-react';
import { notificationApi } from '../services/notificationApi';
import { useNavigate } from 'react-router-dom';
import './NotificationDropdown.css';

export const NotificationDropdown = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await notificationApi.getNotifications({ size: 20 });
      const list = res?.content || (Array.isArray(res) ? res : []);
      setNotifications(list);
      const count = list.filter((n) => !n.isRead).length;
      setUnreadCount(count);
    } catch (err) {
      // Silently fail if not authenticated
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 45000);
    return () => clearInterval(interval);
  }, []);

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

  const handleMarkAsRead = async (id, e) => {
    e?.stopPropagation();
    try {
      await notificationApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error('Failed to mark read', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all read', err);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    try {
      await notificationApi.deleteNotification(id);
      setNotifications((prev) => {
        const item = prev.find((n) => n.id === id);
        if (item && !item.isRead) {
          setUnreadCount((c) => Math.max(0, c - 1));
        }
        return prev.filter((n) => n.id !== id);
      });
    } catch (err) {
      console.error('Failed to delete notification', err);
    }
  };

  const handleItemClick = (item) => {
    if (!item.isRead) {
      handleMarkAsRead(item.id);
    }
    setIsOpen(false);
    if (item.link) {
      navigate(item.link);
    } else if (item.type?.includes('ORDER')) {
      navigate('/orders');
    } else if (item.type?.includes('RETURN')) {
      navigate('/orders');
    }
  };

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

  const getTypeIcon = (type = '') => {
    if (type.includes('ORDER')) return <Package size={15} color="#2563eb" />;
    if (type.includes('SHIPMENT')) return <Truck size={15} color="#059669" />;
    if (type.includes('RETURN')) return <RotateCcw size={15} color="#ea580c" />;
    return <Info size={15} color="#64748b" />;
  };

  return (
    <div className="notif-wrapper" ref={dropdownRef}>
      <button
        type="button"
        className="cyber-action-btn notif-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Thông báo"
        title="Thông báo hệ thống"
      >
        <Bell size={21} strokeWidth={1.8} />
        {unreadCount > 0 && (
          <span className="notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notif-dropdown">
          <div className="notif-dropdown-header">
            <div className="notif-title-row">
              <span className="notif-title">Thông báo</span>
              {unreadCount > 0 && <span className="notif-unread-tag">{unreadCount} mới</span>}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                className="notif-mark-all-btn"
                onClick={handleMarkAllRead}
                title="Đánh dấu đã đọc tất cả"
              >
                <CheckCheck size={14} /> Đọc tất cả
              </button>
            )}
          </div>

          <div className="notif-list">
            {loading && notifications.length === 0 ? (
              <div className="notif-empty">Đang tải thông báo...</div>
            ) : notifications.length === 0 ? (
              <div className="notif-empty">Bạn chưa có thông báo nào</div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  className={`notif-item ${!item.isRead ? 'unread' : ''}`}
                  onClick={() => handleItemClick(item)}
                >
                  <div className="notif-icon-col">{getTypeIcon(item.type)}</div>
                  <div className="notif-body">
                    <div className="notif-heading">
                      <span className="notif-item-title">{item.title}</span>
                      <span className="notif-time">{formatTime(item.createdAt)}</span>
                    </div>
                    <p className="notif-message">{item.message}</p>
                  </div>
                  <button
                    type="button"
                    className="notif-del-btn"
                    title="Xóa thông báo"
                    onClick={(e) => handleDelete(item.id, e)}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
