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
      const error = new Error(data?.message || 'Lỗi thao tác vận chuyển');
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data?.data !== undefined ? data.data : data;
  } catch (err) {
    throw err;
  }
}

export const shipmentApi = {
  /**
   * STT 118: GET /orders/{orderId}/shipments - Xem thông tin vận chuyển của đơn hàng
   */
  async getOrderShipments(orderId) {
    return await request(`/orders/${orderId}/shipments`, { method: 'GET' });
  },

  /**
   * STT 119: GET /shops/{shopId}/shipments - Danh sách giao hàng của cửa hàng
   */
  async getShopShipments(shopId, params = {}) {
    const query = new URLSearchParams();
    if (params.page !== undefined) query.append('page', params.page);
    if (params.size !== undefined) query.append('size', params.size);

    const qs = query.toString();
    return await request(`/shops/${shopId}/shipments${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },

  /**
   * STT 120: POST /shops/{shopId}/orders/{orderId}/shipments - Cửa hàng tạo thông tin giao hàng
   */
  async createShipment(shopId, orderId, payload) {
    return await request(`/shops/${shopId}/orders/${orderId}/shipments`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  /**
   * STT 121: PATCH /shops/{shopId}/shipments/{shipmentId} - Cập nhật thông tin/trạng thái vận chuyển
   */
  async updateShipment(shopId, shipmentId, payload) {
    return await request(`/shops/${shopId}/shipments/${shipmentId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  },

  /**
   * STT 122: GET /admin/shipments - Quản trị viên theo dõi toàn bộ vận chuyển
   */
  async getAdminShipments(params = {}) {
    const query = new URLSearchParams();
    if (params.page !== undefined) query.append('page', params.page);
    if (params.size !== undefined) query.append('size', params.size);

    const qs = query.toString();
    return await request(`/admin/shipments${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },

  /**
   * STT 123: PATCH /admin/shipments/{shipmentId} - Quản trị viên can thiệp thông tin giao hàng
   */
  async updateAdminShipment(shipmentId, payload) {
    return await request(`/admin/shipments/${shipmentId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  }
};
