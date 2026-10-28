package com.example.demo.service.impl;

import com.example.demo.service.EmailService;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailServiceImpl implements EmailService {

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${spring.mail.username:son666727@gmail.com}")
    private String fromEmail;

    @Value("${spring.mail.password:}")
    private String mailPassword;

    @Async
    @Override
    public void sendVerificationOtp(String toEmail, String fullName, String otpCode) {
        log.info("================================================================================");
        log.info("[OTP VERIFICATION DISPATCH] From: {} -> To: {}", fromEmail, toEmail);
        log.info(">>> 6-DIGIT OTP VERIFICATION CODE: {} <<<", otpCode);
        log.info("================================================================================");

        if (mailSender == null || mailPassword == null || mailPassword.trim().isEmpty()) {
            log.warn("Gmail App Password (${MAIL_PASSWORD}) chưa được cấu hình. Sử dụng mã OTP trên log console để kiểm thử.");
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail, "Cyber Tech Shop");
            helper.setTo(toEmail);
            helper.setSubject("[Cyber Tech Shop] Mã xác minh tài khoản của bạn: " + otpCode);

            String displayName = (fullName != null && !fullName.trim().isEmpty()) ? fullName.trim() : "Quý khách";

            String htmlBody = """
                    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px 24px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                        <div style="text-align: center; margin-bottom: 24px;">
                            <h1 style="color: #111827; font-size: 24px; font-weight: 700; margin: 0; letter-spacing: -0.025em;">Cyber Tech Shop</h1>
                            <p style="color: #6b7280; font-size: 14px; margin-top: 6px;">Hệ thống mua sắm thiết bị công nghệ hiện đại</p>
                        </div>
                        
                        <div style="padding: 24px 0; border-top: 1px solid #f3f4f6; border-bottom: 1px solid #f3f4f6;">
                            <p style="font-size: 15px; color: #374151; margin-bottom: 16px;">Xin chào <strong>%s</strong>,</p>
                            <p style="font-size: 15px; color: #4b5563; line-height: 1.6; margin-bottom: 24px;">
                                Cảm ơn bạn đã đăng ký tài khoản tại Cyber Tech Shop. Để hoàn tất kích hoạt tài khoản, vui lòng nhập mã xác minh (OTP) 6 chữ số dưới đây vào ứng dụng:
                            </p>
                            
                            <div style="text-align: center; margin: 28px 0;">
                                <div style="display: inline-block; background-color: #f0fdf4; border: 2px dashed #16a34a; border-radius: 10px; padding: 14px 32px;">
                                    <span style="font-family: 'SF Mono', Consolas, Monaco, monospace; font-size: 34px; font-weight: 700; color: #15803d; letter-spacing: 8px;">%s</span>
                                </div>
                                <p style="font-size: 12px; color: #9ca3af; margin-top: 10px;">Mã xác minh này có hiệu lực trong vòng 24 giờ</p>
                            </div>
                            
                            <p style="font-size: 13px; color: #6b7280; line-height: 1.5;">
                                Nếu bạn không thực hiện yêu cầu đăng ký này, vui lòng bỏ qua email. Tuyệt đối không cung cấp mã xác minh cho bất kỳ ai khác.
                            </p>
                        </div>
                        
                        <div style="text-align: center; margin-top: 24px; font-size: 12px; color: #9ca3af;">
                            <p style="margin: 0;">Email gửi tự động từ hệ thống: <strong>%s</strong></p>
                            <p style="margin: 4px 0 0 0;">&copy; 2026 Cyber Tech Shop. All rights reserved.</p>
                        </div>
                    </div>
                    """.formatted(displayName, otpCode, fromEmail);

            helper.setText(htmlBody, true);
            mailSender.send(message);
            log.info("Email xác minh tài khoản đã được gửi thành công đến: {}", toEmail);

        } catch (Exception e) {
            log.error("Lỗi khi gửi email qua SMTP: {}", e.getMessage(), e);
        }
    }

    @Async
    @Override
    public void sendPasswordResetEmail(String toEmail, String resetToken) {
        log.info("================================================================================");
        log.info("[PASSWORD RESET DISPATCH] From: {} -> To: {}", fromEmail, toEmail);
        log.info(">>> PASSWORD RESET TOKEN: {} <<<", resetToken);
        log.info("================================================================================");

        if (mailSender == null || mailPassword == null || mailPassword.trim().isEmpty()) {
            log.warn("Gmail App Password (${MAIL_PASSWORD}) chưa được cấu hình. Sử dụng token trên log để kiểm thử.");
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail, "Cyber Tech Shop");
            helper.setTo(toEmail);
            helper.setSubject("[Cyber Tech Shop] Mã xác minh đặt lại mật khẩu: " + resetToken);

            String htmlBody = """
                    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px 24px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                        <div style="text-align: center; margin-bottom: 24px;">
                            <h1 style="color: #111827; font-size: 24px; font-weight: 700; margin: 0; letter-spacing: -0.025em;">Cyber Tech Shop</h1>
                            <p style="color: #6b7280; font-size: 14px; margin-top: 6px;">Yêu cầu đặt lại mật khẩu tài khoản</p>
                        </div>
                        
                        <div style="padding: 24px 0; border-top: 1px solid #f3f4f6; border-bottom: 1px solid #f3f4f6;">
                            <p style="font-size: 15px; color: #374151; margin-bottom: 16px;">Xin chào,</p>
                            <p style="font-size: 15px; color: #4b5563; line-height: 1.6; margin-bottom: 24px;">
                                Hệ thống nhận được yêu cầu đặt lại mật khẩu cho tài khoản liên kết với email: <strong>%s</strong>.<br>
                                Vui lòng sử dụng mã xác minh (OTP) gồm 6 chữ số dưới đây để hoàn tất việc đổi mật khẩu mới:
                            </p>
                            
                            <div style="text-align: center; margin: 28px 0;">
                                <div style="display: inline-block; background-color: #eff6ff; border: 2px dashed #2563eb; border-radius: 10px; padding: 14px 32px;">
                                    <span style="font-family: 'SF Mono', Consolas, Monaco, monospace; font-size: 34px; font-weight: 700; color: #1d4ed8; letter-spacing: 8px;">%s</span>
                                </div>
                                <p style="font-size: 12px; color: #9ca3af; margin-top: 10px;">Mã xác minh này có hiệu lực trong vòng 15 phút</p>
                            </div>
                            
                            <p style="font-size: 13px; color: #6b7280; line-height: 1.5;">
                                Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này. Mật khẩu hiện tại của bạn vẫn an toàn tuyệt đối.
                            </p>
                        </div>
                        
                        <div style="text-align: center; margin-top: 24px; font-size: 12px; color: #9ca3af;">
                            <p style="margin: 0;">Email gửi tự động từ hệ thống: <strong>%s</strong></p>
                            <p style="margin: 4px 0 0 0;">&copy; 2026 Cyber Tech Shop. All rights reserved.</p>
                        </div>
                    </div>
                    """.formatted(toEmail, resetToken, fromEmail);

            helper.setText(htmlBody, true);
            mailSender.send(message);
            log.info("Email khôi phục mật khẩu đã gửi thành công đến: {}", toEmail);

        } catch (Exception e) {
            log.error("Lỗi khi gửi email khôi phục mật khẩu: {}", e.getMessage(), e);
        }
    }
}

