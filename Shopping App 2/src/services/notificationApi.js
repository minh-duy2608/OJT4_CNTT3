import { getStoredAccessToken, getStoredRefreshToken, setStoredTokens, clearStoredTokens, authApi } from './authApi';

const API_BASE_URL = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}` 
  : '';

async function request(endpoint, options = {}, isRetry = false) {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getStoredAccessToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const config = {
    ...options,
    headers
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json().catch(() => null);

    if (response.status === 401 && !isRetry) {
      const refreshToken = getStoredRefreshToken();
      if (refreshToken) {
        try {
          const refreshRes = await authApi.refresh(refreshToken);
          if (refreshRes && refreshRes.accessToken) {
            setStoredTokens(refreshRes.accessToken, refreshRes.refreshToken);
            return request(endpoint, options, true);
          }
        } catch (refreshErr) {
          clearStoredTokens();
        }
      }
    }

    if (!response.ok) {
      const error = new Error(data?.message || 'Lỗi xử lý thông báo');
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data?.data !== undefined ? data.data : data;
  } catch (err) {
    throw err;
  }
}

export const notificationApi = {
  /**
   * STT 142: GET /notifications - Danh sách thông báo người dùng
   */
  async getNotifications(params = {}) {
    const query = new URLSearchParams();
    if (params.unreadOnly !== undefined) query.append('unreadOnly', params.unreadOnly);
    if (params.page !== undefined) query.append('page', params.page);
    if (params.size !== undefined) query.append('size', params.size);

    const qs = query.toString();
    return await request(`/notifications${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },

  /**
   * STT 143: GET /notifications/{notificationId} - Chi tiết thông báo
   */
  async getNotificationDetail(id) {
    return await request(`/notifications/${id}`, { method: 'GET' });
  },

  /**
   * STT 144: PATCH /notifications/{notificationId}/read - Đánh dấu đã đọc thông báo
   */
  async markAsRead(id) {
    return await request(`/notifications/${id}/read`, { method: 'PATCH' });
  },

  /**
   * STT 145: PATCH /notifications/read-all - Đánh dấu đã đọc tất cả thông báo
   */
  async markAllAsRead() {
    return await request('/notifications/read-all', { method: 'PATCH' });
  },

  /**
   * STT 146: DELETE /notifications/{notificationId} - Xóa thông báo
   */
  async deleteNotification(id) {
    return await request(`/notifications/${id}`, { method: 'DELETE' });
  }
};

