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
      const error = new Error(data?.message || 'Lỗi thao tác đơn hàng');
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data?.data !== undefined ? data.data : data;
  } catch (err) {
    throw err;
  }
}

export const orderApi = {
  /**
   * Tạo đơn hàng mới
   */
  async createOrder(payload) {
    return await request('/orders', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  /**
   * Lấy danh sách đơn hàng của người dùng hiện tại
   */
  async getMyOrders(params = {}) {
    const query = new URLSearchParams();
    if (params.status && params.status !== 'all') query.append('status', params.status.toUpperCase());
    if (params.page !== undefined) query.append('page', params.page);
    if (params.size !== undefined) query.append('size', params.size);

    const qs = query.toString();
    return await request(`/orders${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },

  /**
   * Lấy chi tiết đơn hàng
   */
  async getOrderDetail(id) {
    return await request(`/orders/${id}`, { method: 'GET' });
  },

  /**
   * STT 102: Theo dõi trạng thái đơn hàng (Tracking)
   */
  async getOrderTracking(id) {
    return await request(`/orders/${id}/tracking`, { method: 'GET' });
  },

  /**
   * Hủy đơn hàng
   */
  async cancelOrder(id, reason = '') {
    const query = reason ? `?reason=${encodeURIComponent(reason)}` : '';
    return await request(`/orders/${id}/cancel${query}`, { method: 'PATCH' });
  },

  /**
   * Quản trị: Lấy danh sách tất cả đơn hàng
   */
  async getAdminOrders(params = {}) {
    const query = new URLSearchParams();
    if (params.shopId) query.append('shopId', params.shopId);
    if (params.status && params.status !== 'all') query.append('status', params.status.toUpperCase());
    if (params.page !== undefined) query.append('page', params.page);
    if (params.size !== undefined) query.append('size', params.size);

    const qs = query.toString();
    return await request(`/admin/orders${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },

  /**
   * Quản trị: Cập nhật trạng thái đơn hàng
   */
  async updateOrderStatus(id, payload) {
    return await request(`/admin/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  }
};

