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
      let errorMessage = data?.message || 'Có lỗi xảy ra khi gọi API Sản phẩm';
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
      const connErr = new Error('Không thể kết nối đến máy chủ backend (Product Service).');
      connErr.status = 503;
      throw connErr;
    }
    throw error;
  }
}

function buildProductQueryParams(params = {}) {
  const query = new URLSearchParams();
  if (params.keyword) query.set('keyword', params.keyword);
  if (params.categoryId) query.set('categoryId', params.categoryId);
  if (params.brandId) query.set('brandId', params.brandId);
  if (params.shopId) query.set('shopId', params.shopId);
  if (params.minPrice !== undefined && params.minPrice !== null && params.minPrice !== '') {
    query.set('minPrice', params.minPrice);
  }
  if (params.maxPrice !== undefined && params.maxPrice !== null && params.maxPrice !== '') {
    query.set('maxPrice', params.maxPrice);
  }
  if (params.inStock !== undefined && params.inStock !== null) {
    query.set('inStock', params.inStock ? 'true' : 'false');
  }
  if (params.page !== undefined) query.set('page', params.page);
  if (params.size !== undefined) query.set('size', params.size);
  if (params.sort) query.set('sort', params.sort);
  if (params.sortBy) query.set('sort', params.sortBy);
  if (params.sortDir) query.set('sortDir', params.sortDir);
  return query.toString();
}

export const productApi = {
  /**
   * STT 39: GET /products - Danh sách sản phẩm có phân trang và lọc đa tiêu chí (Public)
   * @param {Object} params - { keyword, categoryId, brandId, shopId, minPrice, maxPrice, inStock, page, size, sort, sortDir }
   */
  async getProducts(params = {}) {
    const qs = buildProductQueryParams(params);
    return await request(`/products${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },

  /**
   * STT 40: GET /products/{productId} - Chi tiết sản phẩm (Public)
   * @param {number|string} productId
   */
  async getProductById(productId) {
    return await request(`/products/${productId}`, { method: 'GET' });
  },

  /**
   * STT 41: GET /products/{productId}/variants - Danh sách biến thể sản phẩm (Public)
   * @param {number|string} productId
   */
  async getProductVariants(productId) {
    return await request(`/products/${productId}/variants`, { method: 'GET' });
  },

  /**
   * STT 42: GET /products/{productId}/images - Danh sách hình ảnh sản phẩm (Public)
   * @param {number|string} productId
   */
  async getProductImages(productId) {
    return await request(`/products/${productId}/images`, { method: 'GET' });
  },

  /**
   * STT 43: GET /products/search - Tìm kiếm sản phẩm (Public)
   * @param {Object} params - { keyword, categoryId, brandId, minPrice, maxPrice, page, size, sort, sortDir }
   */
  async searchProducts(params = {}) {
    const qs = buildProductQueryParams(params);
    return await request(`/products/search${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },

  /**
   * STT 44: GET /shops/{shopId}/products - Sản phẩm công khai của cửa hàng (Public)
   * @param {number|string} shopId
   * @param {Object} params - { keyword, categoryId, brandId, minPrice, maxPrice, inStock, page, size, sort, sortDir }
   */
  async getShopProducts(shopId, params = {}) {
    const qs = buildProductQueryParams(params);
    return await request(`/shops/${shopId}/products${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },

  /**
   * Admin: POST /admin/products - Tạo sản phẩm mới kèm danh sách biến thể & hình ảnh (ADMIN)
   * @param {Object} productData
   */
  async createProduct(productData) {
    return await request('/admin/products', {
      method: 'POST',
      body: JSON.stringify(productData)
    });
  },

  /**
   * Admin: PUT /admin/products/{productId} - Cập nhật sản phẩm, biến thể & hình ảnh (ADMIN)
   * @param {number|string} productId
   * @param {Object} productData
   */
  async updateProduct(productId, productData) {
    return await request(`/admin/products/${productId}`, {
      method: 'PUT',
      body: JSON.stringify(productData)
    });
  },

  /**
   * Admin: DELETE /admin/products/{productId} - Xóa hoặc ngừng sử dụng sản phẩm (ADMIN)
   * @param {number|string} productId
   * @param {boolean} force
   */
  async deleteProduct(productId, force = false) {
    return await request(`/admin/products/${productId}?force=${force}`, {
      method: 'DELETE'
    });
  },

  /**
   * Upload hình ảnh sản phẩm lên máy chủ
   * @param {File} file
   */
  async uploadImage(file) {
    const formData = new FormData();
    formData.append('file', file);
    const token = getStoredAccessToken();

    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: formData
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(data?.message || 'Tải ảnh lên thất bại');
    }
    return data?.data !== undefined ? data.data : data;
  }
};

