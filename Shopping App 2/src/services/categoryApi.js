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
      let errorMessage = data?.message || 'Có lỗi xảy ra khi gọi API Danh mục';
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
      const connErr = new Error('Không thể kết nối đến máy chủ backend (Category Service).');
      connErr.status = 503;
      throw connErr;
    }
    throw error;
  }
}

export const categoryApi = {
  /**
   * STT 27: GET /categories - Danh sách danh mục sản phẩm (Public)
   * @param {Object} params - { status: 'ACTIVE' | 'INACTIVE', onlyRoots: boolean }
   */
  async getCategories(params = {}) {
    const query = new URLSearchParams();
    if (params.status) query.set('status', params.status);
    if (params.onlyRoots) query.set('onlyRoots', 'true');
    const qs = query.toString();
    return await request(`/categories${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },

  /**
   * STT 28: GET /categories/{categoryId} - Chi tiết danh mục (Public)
   */
  async getCategoryById(categoryId) {
    return await request(`/categories/${categoryId}`, { method: 'GET' });
  },

  /**
   * STT 29: GET /categories/{categoryId}/products - Danh sách sản phẩm thuộc danh mục (Public)
   * @param {number|string} categoryId
   * @param {Object} params - { page, size, sortBy, sortDir }
   */
  async getCategoryProducts(categoryId, params = {}) {
    const query = new URLSearchParams();
    if (params.page !== undefined) query.set('page', params.page);
    if (params.size !== undefined) query.set('size', params.size);
    if (params.sortBy) query.set('sortBy', params.sortBy);
    if (params.sortDir) query.set('sortDir', params.sortDir);
    const qs = query.toString();
    return await request(`/categories/${categoryId}/products${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },

  /**
   * STT 30: POST /admin/categories - Tạo danh mục mới (ADMIN)
   * @param {Object} data - { name, slug, description, imageUrl, parentId, sortOrder, status }
   */
  async createCategory(data) {
    return await request('/admin/categories', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  /**
   * STT 31: PATCH /admin/categories/{categoryId} - Cập nhật danh mục (ADMIN)
   * @param {number|string} categoryId
   * @param {Object} data - { name, slug, description, imageUrl, parentId, sortOrder, status }
   */
  async updateCategory(categoryId, data) {
    return await request(`/admin/categories/${categoryId}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  /**
   * STT 32: DELETE /admin/categories/{categoryId} - Xóa hoặc ngừng sử dụng danh mục (ADMIN)
   * @param {number|string} categoryId
   * @param {boolean} force - true nếu muốn ngừng sử dụng an toàn khi có sản phẩm
   */
  async deleteCategory(categoryId, force = false) {
    return await request(`/admin/categories/${categoryId}${force ? '?force=true' : ''}`, {
      method: 'DELETE'
    });
  }
};
