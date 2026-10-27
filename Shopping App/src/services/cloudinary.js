/**
 * Service tải ảnh trực tiếp lên Cloudinary từ Frontend (Client-side Unsigned Upload)
 * Chuẩn production an toàn, không lộ API Secret.
 */

export const uploadToCloudinary = async (file) => {
  if (!file) {
    throw new Error('Vui lòng chọn một file ảnh.');
  }

  // Kiểm tra định dạng file
  if (!file.type.startsWith('image/')) {
    throw new Error('File được chọn phải là định dạng hình ảnh (PNG, JPG, WEBP,...)');
  }

  // Giới hạn kích thước ảnh (VD: tối đa 5MB)
  const MAX_SIZE = 5 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    throw new Error('Kích thước ảnh không được vượt quá 5MB.');
  }

  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  // Nếu chưa cấu hình .env, cảnh báo và sử dụng Base64 tạm thời để test UI
  if (!cloudName || !uploadPreset) {
    console.warn(
      '[Cloudinary] Chưa cấu hình VITE_CLOUDINARY_CLOUD_NAME hoặc VITE_CLOUDINARY_UPLOAD_PRESET trong file .env. Ảnh tạm thời lưu cục bộ.'
    );
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve({
          url: reader.result,
          isCloudinary: false,
          warning: 'Chưa cấu hình .env Cloudinary! Ảnh đang lưu tạm Base64.'
        });
      };
      reader.readAsDataURL(file);
    });
  }

  // Chuẩn bị FormData để upload lên Cloudinary API
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);
  formData.append('folder', 'cyber_shop/avatars'); // Tổ chức folder trên Cloudinary

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: 'POST',
        body: formData
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Không thể tải ảnh lên Cloudinary.');
    }

    const data = await response.json();
    return {
      url: data.secure_url,
      isCloudinary: true,
      publicId: data.public_id
    };
  } catch (error) {
    console.error('Lỗi tải ảnh Cloudinary:', error);
    throw error;
  }
};

