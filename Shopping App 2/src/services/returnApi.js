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
      const error = new Error(data?.message || 'Lỗi yêu cầu trả hàng/hoàn tiền');
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data?.data !== undefined ? data.data : data;
  } catch (err) {
    throw err;
  }
}

export const returnApi = {
  /**
   * STT 135: POST /orders/{orderId}/returns - Tạo yêu cầu trả hàng từ đơn hàng
   */
  async requestReturn(orderId, payload) {
    return await request(`/orders/${orderId}/returns`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  /**
   * STT 136: GET /returns/my - Danh sách yêu cầu trả hàng của người mua
   */
  async getMyReturns(params = {}) {
    const query = new URLSearchParams();
    if (params.page !== undefined) query.append('page', params.page);
    if (params.size !== undefined) query.append('size', params.size);

    const qs = query.toString();
    return await request(`/returns/my${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },

  /**
   * STT 137: GET /returns/{returnId} - Chi tiết yêu cầu trả hàng
   */
  async getReturnDetail(returnId) {
    return await request(`/returns/${returnId}`, { method: 'GET' });
  },

  /**
   * STT 138: GET /shops/{shopId}/returns - Danh sách yêu cầu trả hàng của cửa hàng
   */
  async getShopReturns(shopId, params = {}) {
    const query = new URLSearchParams();
    if (params.status && params.status !== 'all') query.append('status', params.status.toUpperCase());
    if (params.page !== undefined) query.append('page', params.page);
    if (params.size !== undefined) query.append('size', params.size);

    const qs = query.toString();
    return await request(`/shops/${shopId}/returns${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },

  /**
   * STT 139: PATCH /shops/{shopId}/returns/{returnId}/status - Cửa hàng xử lý yêu cầu trả hàng
   */
  async updateShopReturnStatus(shopId, returnId, payload) {
    return await request(`/shops/${shopId}/returns/${returnId}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  },

  /**
   * STT 140: GET /admin/returns - Quản trị viên xem toàn bộ yêu cầu trả hàng
   */
  async getAdminReturns(params = {}) {
    const query = new URLSearchParams();
    if (params.status && params.status !== 'all') query.append('status', params.status.toUpperCase());
    if (params.page !== undefined) query.append('page', params.page);
    if (params.size !== undefined) query.append('size', params.size);

    const qs = query.toString();
    return await request(`/admin/returns${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },

  /**
   * STT 141: PATCH /admin/returns/{returnId}/status - Quản trị viên can thiệp trạng thái trả hàng
   */
  async updateAdminReturnStatus(returnId, payload) {
    return await request(`/admin/returns/${returnId}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  }
};
