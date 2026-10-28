/**
 * Bộ quy tắc kiểm tra tính hợp lệ dữ liệu (Frontend Validation)
 */

// 1. Kiểm tra họ và tên
export const validateName = (name) => {
  if (!name || !name.trim()) {
    return 'Họ và tên không được để trống.';
  }
  if (name.trim().length < 2) {
    return 'Họ và tên phải có ít nhất 2 ký tự.';
  }
  if (name.trim().length > 50) {
    return 'Họ và tên không được vượt quá 50 ký tự.';
  }
  // Cho phép chữ cái tiếng Việt có dấu, khoảng trắng
  const nameRegex = /^[a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼỀỀỂưăạảấầẩẫậắằẳẵặẹẻẽềềểỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪễệỉịọỏốồổỗộớờởỡợụủứừỬỮỰỲỴÝỶỸửữựỳỵỷỹ\s]+$/;
  if (!nameRegex.test(name.trim())) {
    return 'Họ và tên chỉ được chứa chữ cái và khoảng trắng.';
  }
  return null;
};

// 2. Kiểm tra Email 
export const validateEmail = (email) => {
  if (!email || !email.trim()) {
    return 'Địa chỉ email không được để trống.';
  }
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email.trim())) {
    return 'Địa chỉ email không đúng định dạng (VD: example@domain.com).';
  }
  return null;
};

// 3. Kiểm tra số điện thoại (Việt Nam gồm đúng 10 chữ số)
export const validatePhone = (phone) => {
  if (!phone || !phone.trim()) {
    return 'Số điện thoại không được để trống.';
  }
  const cleanPhone = phone.replace(/[\s-.]/g, '');
  if (!/^\d+$/.test(cleanPhone)) {
    return 'Số điện thoại chỉ được chứa các chữ số.';
  }
  if (cleanPhone.length !== 10) {
    return `Số điện thoại phải gồm đúng 10 chữ số (hiện có ${cleanPhone.length} số).`;
  }
  if (!cleanPhone.startsWith('0')) {
    return 'Số điện thoại phải bắt đầu bằng số 0.';
  }
  return null;
};

// 4. Đo độ mạnh của mật khẩu
export const getPasswordStrength = (password) => {
  if (!password) return { score: 0, label: '', color: '', percent: 0 };

  let score = 0;
  if (password.length >= 6) score += 1;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 1) {
    return { score: 1, label: 'Mật khẩu yếu', color: '#ef4444', percent: 25 };
  } else if (score <= 3) {
    return { score: 2, label: 'Mật khẩu trung bình', color: '#f59e0b', percent: 60 };
  } else if (score === 4) {
    return { score: 3, label: 'Mật khẩu mạnh', color: '#10b981', percent: 85 };
  } else {
    return { score: 4, label: 'Mật khẩu rất mạnh', color: '#059669', percent: 100 };
  }
};

// 5. Kiểm tra mật khẩu mới
export const validateNewPassword = (password) => {
  if (!password) {
    return 'Vui lòng nhập mật khẩu mới.';
  }
  if (password.length < 6) {
    return 'Mật khẩu mới phải có tối thiểu 6 ký tự.';
  }
  return null;
};

// 6. Kiểm tra xác nhận mật khẩu
export const validateConfirmPassword = (password, confirmPassword) => {
  if (!confirmPassword) {
    return 'Vui lòng xác nhận lại mật khẩu mới.';
  }
  if (password !== confirmPassword) {
    return 'Mật khẩu xác nhận không trùng khớp.';
  }
  return null;
};
