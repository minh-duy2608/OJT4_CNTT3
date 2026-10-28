package com.example.demo.service;

public interface EmailService {

    /**
     * Gửi mã OTP xác minh gồm 6 chữ số từ son666727@gmail.com đến email người dùng
     */
    void sendVerificationOtp(String toEmail, String fullName, String otpCode);

    /**
     * Gửi hướng dẫn và mã đặt lại mật khẩu đến email người dùng
     */
    void sendPasswordResetEmail(String toEmail, String resetToken);
}

