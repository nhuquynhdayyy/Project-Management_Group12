import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function RegisterPage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    full_name: '',
    password: '',
    confirmPassword: '',
    role: 'Staff' as 'Manager' | 'Staff',
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    // Validate
    if (formData.password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    if (!formData.email) {
      setError('Email là bắt buộc để xác minh tài khoản');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/auth/register`, {
        username: formData.username,
        email: formData.email,
        full_name: formData.full_name,
        password: formData.password,
        roles: [formData.role],
      });

      setRegisteredEmail(formData.email);
      setSuccess(true);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Đăng ký thất bại. Vui lòng thử lại.';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleResendEmail() {
    setError('');
    setLoading(true);

    try {
      await axios.post(`${API_URL}/auth/resend-verification`, {
        email: registeredEmail,
      });
      alert('Email xác minh đã được gửi lại! Vui lòng kiểm tra hộp thư.');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Không thể gửi lại email. Vui lòng thử lại sau.';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-900 via-green-800 to-emerald-700 p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            {/* Success Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-800 text-center mb-4">
              Đăng ký thành công!
            </h2>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-700 mb-2">
                Chúng tôi đã gửi email xác minh đến:
              </p>
              <p className="text-sm font-semibold text-blue-700 break-all">
                {registeredEmail}
              </p>
            </div>

            <p className="text-sm text-gray-600 mb-6 text-center">
              Vui lòng kiểm tra hộp thư và bấm vào link xác minh để kích hoạt tài khoản.
            </p>

            {error && (
              <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={handleResendEmail}
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-lg bg-white border-2 border-green-600 text-green-600
                           hover:bg-green-50 font-semibold text-sm transition disabled:opacity-60"
              >
                {loading ? 'Đang gửi...' : 'Gửi lại email xác minh'}
              </button>

              <button
                onClick={() => navigate('/login')}
                className="w-full py-2.5 px-4 rounded-lg bg-green-600 hover:bg-green-700 text-white
                           font-semibold text-sm transition"
              >
                Về trang đăng nhập
              </button>
            </div>

            <p className="mt-6 text-xs text-gray-500 text-center">
              💡 Không thấy email? Kiểm tra thư mục Spam/Junk
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-900 via-green-800 to-emerald-700 p-4">
      <div className="w-full max-w-md">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/10 backdrop-blur mb-4">
            <svg
              className="w-9 h-9 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 3C8 3 5 6.5 5 10c0 2.5 1.3 4.7 3.3 6L8 20h8l-.3-4C17.7 14.7 19 12.5 19 10c0-3.5-3-7-7-7z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Đăng ký tài khoản
          </h1>
          <p className="text-green-200 mt-1 text-sm">
            Hệ thống quản lý cây xanh đô thị
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">
            Tạo tài khoản mới
          </h2>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tên đăng nhập <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
                placeholder="vd: nguyenvana"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-gray-900
                           focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                           transition text-sm"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="vd: nguyenvana@gmail.com"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-gray-900
                           focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                           transition text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Email dùng để xác minh tài khoản
              </p>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Họ và tên
              </label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) =>
                  setFormData({ ...formData, full_name: e.target.value })
                }
                placeholder="vd: Nguyễn Văn A"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-gray-900
                           focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                           transition text-sm"
              />
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vai trò <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.role}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    role: e.target.value as 'Manager' | 'Staff',
                  })
                }
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-gray-900
                           focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                           transition text-sm"
              >
                <option value="Staff">Nhân viên (Staff)</option>
                <option value="Manager">Quản lý (Manager)</option>
              </select>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mật khẩu <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                placeholder="Tối thiểu 6 ký tự"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-gray-900
                           focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                           transition text-sm"
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Xác nhận mật khẩu <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                required
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData({ ...formData, confirmPassword: e.target.value })
                }
                placeholder="Nhập lại mật khẩu"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-gray-900
                           focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                           transition text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg bg-green-600 hover:bg-green-700 active:bg-green-800
                         text-white font-semibold text-sm transition disabled:opacity-60 disabled:cursor-not-allowed
                         focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                    />
                  </svg>
                  Đang đăng ký...
                </span>
              ) : (
                'Đăng ký'
              )}
            </button>
          </form>

          {/* Link to Login */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Đã có tài khoản?{' '}
              <button
                onClick={() => navigate('/login')}
                className="text-green-600 hover:text-green-700 font-semibold"
              >
                Đăng nhập ngay
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
