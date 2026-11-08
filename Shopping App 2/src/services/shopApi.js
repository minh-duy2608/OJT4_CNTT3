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
      const error = new Error(data?.message || 'Lỗi thao tác cửa hàng');
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data?.data !== undefined ? data.data : data;
  } catch (err) {
    throw err;
  }
}

export const shopApi = {
  /**
   * Đăng ký mở cửa hàng mới
   */
  async registerShop(payload) {
    return await request('/shops/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  /**
   * Lấy thông tin cửa hàng của người dùng hiện tại
   */
  async getMyShop() {
    return await request('/shops/my-shop', { method: 'GET' });
  },

  /**
   * Lấy danh sách tất cả các cửa hàng
   */
  async getAllShops() {
    return await request('/shops', { method: 'GET' });
  },

  /**
   * Lấy chi tiết cửa hàng theo ID
   */
  async getShopById(shopId) {
    return await request(`/shops/${shopId}`, { method: 'GET' });
  },

  /**
   * Cập nhật thông tin cửa hàng
   */
  async updateShop(shopId, payload) {
    return await request(`/shops/${shopId}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  /**
   * STT 67: GET /admin/shops - Danh sách tất cả cửa hàng (ADMIN)
   */
  async getAdminShops({ keyword, status, page = 0, size = 10 } = {}) {
    const params = new URLSearchParams();
    if (keyword) params.append('keyword', keyword);
    if (status) params.append('status', status);
    params.append('page', page);
    params.append('size', size);
    return await request(`/admin/shops?${params.toString()}`, { method: 'GET' });
  },

  /**
   * STT 68: GET /admin/shops/{shopId} - Chi tiết cửa hàng phục vụ quản trị (ADMIN)
   */
  async getAdminShopById(shopId) {
    return await request(`/admin/shops/${shopId}`, { method: 'GET' });
  },

  /**
   * STT 69: PATCH /admin/shops/{shopId}/status - Duyệt, từ chối, tạm ngừng hoặc mở lại cửa hàng (ADMIN)
   */
  async updateAdminShopStatus(shopId, { status, rejectionReason }) {
    return await request(`/admin/shops/${shopId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, rejectionReason })
    });
  },

  /**
   * PUT /admin/shops/{shopId} - Cập nhật thông tin cửa hàng (ADMIN)
   */
  async adminUpdateShop(shopId, payload) {
    return await request(`/admin/shops/${shopId}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  /**
   * POST /admin/shops - Tạo / Đăng ký cửa hàng mới (ADMIN)
   */
  async adminCreateShop(payload) {
    return await request('/admin/shops', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  /**
   * STT 60: GET /shops/my - Danh sách cửa hàng người dùng quản lý
   */
  async getMyShops() {
    return await request('/shops/my', { method: 'GET' });
  },

  /**
   * STT 61: GET /shops/{shopId}/manage - Thông tin quản lý cửa hàng (metrics, doanh thu, đơn, sp)
   */
  async getShopManage(shopId) {
    return await request(`/shops/${shopId}/manage`, { method: 'GET' });
  },

  /**
   * STT 63: GET /shops/{shopId}/members - Danh sách thành viên của shop
   */
  async getShopMembers(shopId) {
    return await request(`/shops/${shopId}/members`, { method: 'GET' });
  },

  /**
   * STT 64: POST /shops/{shopId}/members - Thêm thành viên vào shop
   */
  async addShopMember(shopId, payload) {
    return await request(`/shops/${shopId}/members`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  /**
   * STT 65: PATCH /shops/{shopId}/members/{memberId} - Cập nhật vai trò/trạng thái thành viên
   */
  async updateShopMember(shopId, memberId, payload) {
    return await request(`/shops/${shopId}/members/${memberId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  },

  /**
   * STT 66: DELETE /shops/{shopId}/members/{memberId} - Xóa thành viên khỏi shop
   */
  async deleteShopMember(shopId, memberId) {
    return await request(`/shops/${shopId}/members/${memberId}`, {
      method: 'DELETE'
    });
  }
};
