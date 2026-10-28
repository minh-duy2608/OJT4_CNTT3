import { getStoredAccessToken, getStoredRefreshToken, setStoredTokens, clearStoredTokens, authApi } from './authApi';

const API_BASE_URL = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api/v1/addresses` 
  : '/api/v1/addresses';

/**
 * Base HTTP request wrapper for Address API with token authentication
 */
async function request(endpoint = '', options = {}, isRetry = false) {
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

    // If 401 Unauthorized, attempt auto-refresh token once
    if (response.status === 401 && !isRetry) {
      const refreshToken = getStoredRefreshToken();
      if (refreshToken) {
        try {
          const refreshRes = await authApi.refresh(refreshToken);
          if (refreshRes && refreshRes.accessToken) {
            setStoredTokens(refreshRes.accessToken, refreshRes.refreshToken);
            return request(endpoint, options, true);
          }
        } catch {
          clearStoredTokens();
        }
      }
    }

    if (!response.ok) {
      let errorMessage = data?.message || 'Có lỗi xảy ra khi xử lý địa chỉ';
      if (data?.data && typeof data.data === 'object') {
        const fieldErrors = Object.values(data.data).join(', ');
        if (fieldErrors) errorMessage = fieldErrors;
      }
      const err = new Error(errorMessage);
      err.status = response.status;
      err.data = data;
      throw err;
    }

    return data?.data !== undefined ? data.data : data;
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      const connErr = new Error('Không thể kết nối đến máy chủ backend (Address Service).');
      connErr.status = 503;
      throw connErr;
    }
    throw error;
  }
}

/**
 * Normalize frontend address format to backend request body
 */
const formatAddressPayload = (addr) => ({
  recipientName: (addr.recipientName || addr.fullName || '').trim(),
  phone: (addr.phone || '').trim(),
  province: (addr.province || addr.city || 'TP. Hồ Chí Minh').trim(),
  district: (addr.district || '').trim(),
  ward: (addr.ward || '').trim(),
  addressDetail: (addr.addressDetail || addr.detailAddress || '').trim(),
  deliveryNote: addr.deliveryNote || addr.type || 'home',
  isDefault: Boolean(addr.isDefault)
});

export const addressApi = {
  /**
   * Lấy danh sách địa chỉ của người dùng hiện tại
   * GET /api/v1/addresses
   */
  async getAll() {
    return await request('', { method: 'GET' });
  },

  /**
   * Thêm địa chỉ nhận hàng mới
   * POST /api/v1/addresses
   */
  async create(data) {
    const payload = formatAddressPayload(data);
    return await request('', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  /**
   * Cập nhật địa chỉ nhận hàng
   * PUT /api/v1/addresses/{id}
   */
  async update(id, data) {
    const payload = formatAddressPayload(data);
    return await request(`/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  /**
   * Thiết lập 1 địa chỉ làm mặc định duy nhất
   * PATCH /api/v1/addresses/{id}/default
   */
  async setDefault(id) {
    return await request(`/${id}/default`, {
      method: 'PATCH'
    });
  },

  /**
   * Xóa địa chỉ nhận hàng
   * DELETE /api/v1/addresses/{id}
   */
  async delete(id) {
    return await request(`/${id}`, {
      method: 'DELETE'
    });
  }
};
