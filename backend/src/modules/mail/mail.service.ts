import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly mailerService: MailerService) {}

  /**
   * Gửi email xác minh tài khoản
   */
  async sendVerificationEmail(
    to: string,
    username: string,
    verifyLink: string,
  ): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to,
        subject: 'Xác minh tài khoản - Cây Xanh Đà Nẵng',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <style>
                body {
                  font-family: Arial, sans-serif;
                  line-height: 1.6;
                  color: #333;
                  max-width: 600px;
                  margin: 0 auto;
                  padding: 20px;
                }
                .header {
                  background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);
                  color: white;
                  padding: 30px;
                  text-align: center;
                  border-radius: 10px 10px 0 0;
                }
                .header h1 {
                  margin: 0;
                  font-size: 28px;
                }
                .content {
                  background: #f9f9f9;
                  padding: 30px;
                  border-radius: 0 0 10px 10px;
                }
                .button {
                  display: inline-block;
                  padding: 15px 40px;
                  background: #2ecc71;
                  color: white !important;
                  text-decoration: none;
                  border-radius: 5px;
                  font-weight: bold;
                  margin: 20px 0;
                  text-align: center;
                }
                .button:hover {
                  background: #27ae60;
                }
                .warning {
                  background: #fff3cd;
                  border-left: 4px solid #ffc107;
                  padding: 15px;
                  margin: 20px 0;
                  border-radius: 4px;
                }
                .footer {
                  text-align: center;
                  margin-top: 30px;
                  color: #666;
                  font-size: 14px;
                }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>🌳 Chào mừng ${username}!</h1>
              </div>
              <div class="content">
                <p>Cảm ơn bạn đã đăng ký tài khoản tại <strong>Hệ thống Quản lý Cây Xanh Đà Nẵng</strong>.</p>
                
                <p>Để hoàn tất quá trình đăng ký, vui lòng bấm nút bên dưới để xác minh tài khoản của bạn:</p>
                
                <div style="text-align: center;">
                  <a href="${verifyLink}" class="button">Xác minh tài khoản</a>
                </div>
                
                <p>Hoặc copy link sau vào trình duyệt:</p>
                <p style="word-break: break-all; background: #fff; padding: 10px; border-radius: 4px;">
                  ${verifyLink}
                </p>
                
                <div class="warning">
                  <strong>⚠️ Lưu ý:</strong> Link xác minh này có hiệu lực trong <strong>24 giờ</strong>.
                </div>
                
                <p style="color: #666; font-size: 14px; margin-top: 30px;">
                  Nếu bạn không thực hiện đăng ký này, vui lòng bỏ qua email này.
                </p>
              </div>
              <div class="footer">
                <p>© 2026 Hệ thống Quản lý Cây Xanh Đà Nẵng</p>
                <p>Email này được gửi tự động, vui lòng không trả lời.</p>
              </div>
            </body>
          </html>
        `,
      });

      this.logger.log(`Verification email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${to}`, error);
      throw error;
    }
  }

  /**
   * Gửi email chào mừng sau khi xác minh thành công
   */
  async sendWelcomeEmail(to: string, username: string): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to,
        subject: 'Chào mừng bạn đến với Hệ thống Quản lý Cây Xanh Đà Nẵng!',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <style>
                body {
                  font-family: Arial, sans-serif;
                  line-height: 1.6;
                  color: #333;
                  max-width: 600px;
                  margin: 0 auto;
                  padding: 20px;
                }
                .header {
                  background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);
                  color: white;
                  padding: 30px;
                  text-align: center;
                  border-radius: 10px 10px 0 0;
                }
                .header h1 {
                  margin: 0;
                  font-size: 28px;
                }
                .content {
                  background: #f9f9f9;
                  padding: 30px;
                  border-radius: 0 0 10px 10px;
                }
                .success-box {
                  background: #d4edda;
                  border-left: 4px solid #28a745;
                  padding: 15px;
                  margin: 20px 0;
                  border-radius: 4px;
                }
                .info-box {
                  background: #e7f3ff;
                  border-left: 4px solid #2196F3;
                  padding: 15px;
                  margin: 20px 0;
                  border-radius: 4px;
                }
                .footer {
                  text-align: center;
                  margin-top: 30px;
                  color: #666;
                  font-size: 14px;
                }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>🎉 Xác minh thành công!</h1>
              </div>
              <div class="content">
                <p>Xin chào <strong>${username}</strong>,</p>
                
                <div class="success-box">
                  <strong>✅ Tài khoản của bạn đã được xác minh thành công!</strong>
                </div>
                
                <p>Bạn đã có thể đăng nhập vào hệ thống và bắt đầu sử dụng các tính năng quản lý cây xanh.</p>
                
                <div class="info-box">
                  <strong>📋 Hướng dẫn đăng nhập:</strong>
                  <ol style="margin: 10px 0 0 0; padding-left: 20px;">
                    <li>Truy cập trang đăng nhập: <a href="http://localhost:5173/login">http://localhost:5173/login</a></li>
                    <li>Nhập <strong>tên đăng nhập</strong> hoặc <strong>email</strong>: <strong>${username}</strong> hoặc <strong>${to}</strong></li>
                    <li>Nhập mật khẩu bạn đã đăng ký</li>
                    <li>Bấm "Đăng nhập"</li>
                  </ol>
                </div>
                
                <p style="margin-top: 30px;">Chúc bạn có trải nghiệm tốt với hệ thống!</p>
              </div>
              <div class="footer">
                <p>© 2026 Hệ thống Quản lý Cây Xanh Đà Nẵng</p>
                <p>Email này được gửi tự động, vui lòng không trả lời.</p>
              </div>
            </body>
          </html>
        `,
      });

      this.logger.log(`Welcome email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send welcome email to ${to}`, error);
      throw error;
    }
  }

  /**
   * Gửi email đặt lại mật khẩu
   */
  async sendPasswordResetEmail(to: string, resetLink: string): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to,
        subject: 'Đặt lại mật khẩu - Cây Xanh Đà Nẵng',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <style>
                body {
                  font-family: Arial, sans-serif;
                  line-height: 1.6;
                  color: #333;
                  max-width: 600px;
                  margin: 0 auto;
                  padding: 20px;
                }
                .header {
                  background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
                  color: white;
                  padding: 30px;
                  text-align: center;
                  border-radius: 10px 10px 0 0;
                }
                .header h1 {
                  margin: 0;
                  font-size: 28px;
                }
                .content {
                  background: #f9f9f9;
                  padding: 30px;
                  border-radius: 0 0 10px 10px;
                }
                .button {
                  display: inline-block;
                  padding: 15px 40px;
                  background: #3498db;
                  color: white !important;
                  text-decoration: none;
                  border-radius: 5px;
                  font-weight: bold;
                  margin: 20px 0;
                  text-align: center;
                }
                .button:hover {
                  background: #2980b9;
                }
                .warning {
                  background: #ffebee;
                  border-left: 4px solid #f44336;
                  padding: 15px;
                  margin: 20px 0;
                  border-radius: 4px;
                }
                .footer {
                  text-align: center;
                  margin-top: 30px;
                  color: #666;
                  font-size: 14px;
                }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>🔐 Đặt lại mật khẩu</h1>
              </div>
              <div class="content">
                <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
                
                <p>Để đặt lại mật khẩu, vui lòng bấm nút bên dưới:</p>
                
                <div style="text-align: center;">
                  <a href="${resetLink}" class="button">Đặt lại mật khẩu</a>
                </div>
                
                <p>Hoặc copy link sau vào trình duyệt:</p>
                <p style="word-break: break-all; background: #fff; padding: 10px; border-radius: 4px;">
                  ${resetLink}
                </p>
                
                <div class="warning">
                  <strong>⚠️ Lưu ý quan trọng:</strong>
                  <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                    <li>Link này có hiệu lực trong <strong>15 phút</strong></li>
                    <li>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này</li>
                    <li>Không chia sẻ link này với bất kỳ ai</li>
                  </ul>
                </div>
              </div>
              <div class="footer">
                <p>© 2026 Hệ thống Quản lý Cây Xanh Đà Nẵng</p>
                <p>Email này được gửi tự động, vui lòng không trả lời.</p>
              </div>
            </body>
          </html>
        `,
      });

      this.logger.log(`Password reset email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${to}`, error);
      throw error;
    }
  }
}
