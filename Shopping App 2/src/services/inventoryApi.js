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
      const error = new Error(data?.message || 'Lỗi thao tác kho hàng');
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data?.data !== undefined ? data.data : data;
  } catch (err) {
    throw err;
  }
}

export const inventoryApi = {
  /**
   * STT 70: GET /shops/{shopId}/inventory - Danh sách tồn kho của cửa hàng (Shop permission)
   */
  async getShopInventory(shopId, { keyword, page = 0, size = 10 } = {}) {
    const params = new URLSearchParams();
    if (keyword) params.append('keyword', keyword);
    params.append('page', page);
    params.append('size', size);
    return await request(`/shops/${shopId}/inventory?${params.toString()}`, { method: 'GET' });
  },

  /**
   * STT 71: GET /shops/{shopId}/inventory/{inventoryId} - Chi tiết tồn kho (Shop permission)
   */
  async getInventoryDetail(shopId, inventoryId) {
    return await request(`/shops/${shopId}/inventory/${inventoryId}`, { method: 'GET' });
  },

  /**
   * STT 72: PATCH /shops/{shopId}/inventory/{inventoryId} - Điều chỉnh tồn kho theo nghiệp vụ (Quyền quản lý kho)
   */
  async adjustInventory(shopId, inventoryId, payload) {
    return await request(`/shops/${shopId}/inventory/${inventoryId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  },

  /**
   * STT 73: GET /shops/{shopId}/inventory/low-stock - Danh sách sản phẩm sắp hết hàng (Quyền quản lý kho)
   */
  async getLowStockInventory(shopId, threshold = 10) {
    return await request(`/shops/${shopId}/inventory/low-stock?threshold=${threshold}`, { method: 'GET' });
  }
};
