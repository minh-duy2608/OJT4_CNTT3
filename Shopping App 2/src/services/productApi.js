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
   * GET /products/bestsellers - Lấy top 5 sản phẩm bán chạy nhất (Public)
   */
  async getTopBestsellers() {
    try {
      const res = await request('/products/bestsellers', { method: 'GET' });
      if (Array.isArray(res) && res.length > 0) return res;
      if (res?.data && Array.isArray(res.data) && res.data.length > 0) return res.data;
    } catch (e) {
      console.warn('API getTopBestsellers error, fallback to getProducts:', e);
    }
    const fallback = await this.getProducts({ size: 5, sort: 'createdAt', sortDir: 'desc' });
    return fallback?.content || [];
  },

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
   * STT 45: GET /shops/{shopId}/manage/products - Danh sách sản phẩm trong phạm vi quản lý (Shop permission)
   */
  async getShopManagedProducts(shopId, params = {}) {
    const qs = buildProductQueryParams(params);
    return await request(`/shops/${shopId}/manage/products${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },

  /**
   * STT 46: POST /shops/{shopId}/products - Tạo sản phẩm thuộc cửa hàng (Shop permission)
   */
  async createShopProduct(shopId, productData) {
    return await request(`/shops/${shopId}/products`, {
      method: 'POST',
      body: JSON.stringify(productData)
    });
  },

  /**
   * STT 47: GET /shops/{shopId}/products/{productId} - Chi tiết sản phẩm trong phạm vi quản lý (Shop permission)
   */
  async getShopProductDetail(shopId, productId) {
    return await request(`/shops/${shopId}/products/${productId}`, { method: 'GET' });
  },

  /**
   * STT 48: PATCH /shops/{shopId}/products/{productId} - Cập nhật thông tin sản phẩm (Shop permission)
   */
  async updateShopProduct(shopId, productId, productData) {
    return await request(`/shops/${shopId}/products/${productId}`, {
      method: 'PATCH',
      body: JSON.stringify(productData)
    });
  },

  /**
   * STT 49: PATCH /shops/{shopId}/products/{productId}/status - Thay đổi trạng thái sản phẩm (Shop permission)
   */
  async updateShopProductStatus(shopId, productId, status) {
    return await request(`/shops/${shopId}/products/${productId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  },

  /**
   * STT 50: DELETE /shops/{shopId}/products/{productId} - Ngừng kinh doanh hoặc xóa sản phẩm (Shop permission)
   */
  async deleteShopProduct(shopId, productId, force = false) {
    return await request(`/shops/${shopId}/products/${productId}?force=${force}`, {
      method: 'DELETE'
    });
  },

  /**
   * STT 51: POST /shops/{shopId}/products/{productId}/variants - Tạo biến thể sản phẩm (Shop permission)
   */
  async createShopProductVariant(shopId, productId, variantData) {
    return await request(`/shops/${shopId}/products/${productId}/variants`, {
      method: 'POST',
      body: JSON.stringify(variantData)
    });
  },

  /**
   * STT 52: PATCH /shops/{shopId}/products/{productId}/variants/{variantId} - Cập nhật biến thể (Shop permission)
   */
  async updateShopProductVariant(shopId, productId, variantId, variantData) {
    return await request(`/shops/${shopId}/products/${productId}/variants/${variantId}`, {
      method: 'PATCH',
      body: JSON.stringify(variantData)
    });
  },

  /**
   * STT 53: DELETE /shops/{shopId}/products/{productId}/variants/{variantId} - Xóa biến thể (Shop permission)
   */
  async deleteShopProductVariant(shopId, productId, variantId, force = false) {
    return await request(`/shops/${shopId}/products/${productId}/variants/${variantId}?force=${force}`, {
      method: 'DELETE'
    });
  },

  /**
   * STT 54: POST /shops/{shopId}/products/{productId}/images - Thêm hình ảnh sản phẩm (Shop permission)
   */
  async addShopProductImage(shopId, productId, imageData) {
    return await request(`/shops/${shopId}/products/${productId}/images`, {
      method: 'POST',
      body: JSON.stringify(imageData)
    });
  },

  /**
   * STT 55: PATCH /shops/{shopId}/products/{productId}/images/{imageId} - Cập nhật hình ảnh (Shop permission)
   */
  async updateShopProductImage(shopId, productId, imageId, imageData) {
    return await request(`/shops/${shopId}/products/${productId}/images/${imageId}`, {
      method: 'PATCH',
      body: JSON.stringify(imageData)
    });
  },

  /**
   * STT 56: DELETE /shops/{shopId}/products/{productId}/images/{imageId} - Xóa hình ảnh sản phẩm (Shop permission)
   */
  async deleteShopProductImage(shopId, productId, imageId) {
    return await request(`/shops/${shopId}/products/${productId}/images/${imageId}`, {
      method: 'DELETE'
    });
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

