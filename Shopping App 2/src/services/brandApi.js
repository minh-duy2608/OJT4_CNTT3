import { getStoredAccessToken, getStoredRefreshToken, setStoredTokens, clearStoredTokens, authApi } from './authApi';

const API_BASE_URL = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api/v1` 
  : '/api/v1';

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
      let errorMessage = data?.message || 'Có lỗi xảy ra khi gọi API Thương hiệu';
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
      const connErr = new Error('Không thể kết nối đến máy chủ backend (Brand Service).');
      connErr.status = 503;
      throw connErr;
    }
    throw error;
  }
}

export const brandApi = {
  /**
   * STT 33: GET /brands - Danh sách thương hiệu (Public)
   * @param {Object} params - { status: 'ACTIVE' | 'INACTIVE' }
   */
  async getBrands(params = {}) {
    const query = new URLSearchParams();
    if (params.status) query.set('status', params.status);
    const qs = query.toString();
    return await request(`/brands${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },

  /**
   * STT 34: GET /brands/{brandId} - Chi tiết thương hiệu (Public)
   */
  async getBrandById(brandId) {
    return await request(`/brands/${brandId}`, { method: 'GET' });
  },

  /**
   * STT 35: GET /brands/{brandId}/products - Sản phẩm thuộc thương hiệu (Public)
   * @param {number|string} brandId
   * @param {Object} params - { page, size, sortBy, sortDir }
   */
  async getBrandProducts(brandId, params = {}) {
    const query = new URLSearchParams();
    if (params.page !== undefined) query.set('page', params.page);
    if (params.size !== undefined) query.set('size', params.size);
    if (params.sortBy) query.set('sortBy', params.sortBy);
    if (params.sortDir) query.set('sortDir', params.sortDir);
    const qs = query.toString();
    return await request(`/brands/${brandId}/products${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },

  /**
   * STT 36: POST /admin/brands - Tạo thương hiệu mới (ADMIN)
   * @param {Object} data - { name, slug, logoUrl, description, status }
   */
  async createBrand(data) {
    return await request('/admin/brands', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  /**
   * STT 37: PATCH /admin/brands/{brandId} - Cập nhật thương hiệu (ADMIN)
   * @param {number|string} brandId
   * @param {Object} data - { name, slug, logoUrl, description, status }
   */
  async updateBrand(brandId, data) {
    return await request(`/admin/brands/${brandId}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  /**
   * STT 38: DELETE /admin/brands/{brandId} - Xóa hoặc ngừng sử dụng thương hiệu (ADMIN)
   * @param {number|string} brandId
   * @param {boolean} force - true nếu muốn ngừng sử dụng an toàn khi có sản phẩm
   */
  async deleteBrand(brandId, force = false) {
    return await request(`/admin/brands/${brandId}${force ? '?force=true' : ''}`, {
      method: 'DELETE'
    });
  }
};

