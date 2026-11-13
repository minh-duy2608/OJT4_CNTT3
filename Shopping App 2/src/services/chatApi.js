/**
 * chatApi.js — REST API calls cho tính năng Chat
 * WebSocket logic nằm trong ChatContext.jsx
 */

const BASE = '/api/chat';

const authHeader = () => {
  const token = localStorage.getItem('CYBER_ACCESS_TOKEN') || sessionStorage.getItem('CYBER_ACCESS_TOKEN');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const get = async (url) => {
  const res = await fetch(url, { headers: { ...authHeader(), 'Content-Type': 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

export const chatApi = {
  /** Lấy danh sách phòng chat của user */
  getRooms: (userId) => get(`${BASE}/rooms/${userId}`),

  /** Lấy lịch sử tin nhắn giữa 2 người (tự tạo room nếu chưa có) */
  getHistory: (userId1, userId2) => get(`${BASE}/history/${userId1}/${userId2}`),

  /** Đếm tổng tin nhắn chưa đọc */
  getUnreadCount: (userId) => get(`${BASE}/unread-count/${userId}`),
};

