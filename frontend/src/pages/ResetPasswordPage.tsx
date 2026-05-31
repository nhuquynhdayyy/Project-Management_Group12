import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../api/auth';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Token không hợp lệ. Vui lòng yêu cầu đặt lại mật khẩu mới.');
    }
  }, [token]);

  function validatePasswords(): boolean {
    setValidationError('');

    if (newPassword.length < 6) {
      setValidationError('Mật khẩu phải có ít nhất 6 ký tự');
      return false;
    }

    if (newPassword !== confirmPassword) {
      setValidationError('Mật khẩu xác nhận không khớp');
      return false;
    }

    return true;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setValidationError('');

    if (!validatePasswords()) {
      return;
    }

    if (!token) {
      setError('Token không hợp lệ');
      return;
    }

    setLoading(true);

    try {
      await resetPassword(token, newPassword);
      setSuccess(true);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 3000);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Có lỗi xảy ra. Vui lòng thử lại sau.';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleResendEmail() {
    const email = prompt('Nhập email của bạn để gửi lại link đặt lại mật khẩu:');
    if (!email) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        alert('Email đã được gửi lại! Vui lòng kiểm tra hộp thư.');
      } else {
        const data = await response.json();
        alert(data.message || 'Không thể gửi lại email. Vui lòng thử lại sau.');
      }
    } catch (err) {
      alert('Không thể gửi lại email. Vui lòng thử lại sau.');
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-900 via-red-800 to-orange-700">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
              <svg
                className="w-8 h-8 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">
              Token không hợp lệ
            </h2>
            <p className="text-gray-600 mb-6">
              Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.
            </p>
            <div className="space-y-3">
              <button
                onClick={handleResendEmail}
                className="w-full py-2.5 px-4 rounded-lg bg-green-600 hover:bg-green-700 active:bg-green-800
                           text-white font-semibold text-sm transition
                           focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                Gửi lại email
              </button>
              <button
                onClick={() => navigate('/login')}
                className="w-full py-2.5 px-4 rounded-lg bg-gray-200 hover:bg-gray-300 active:bg-gray-400
                           text-gray-700 font-semibold text-sm transition
                           focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
              >
                Quay lại đăng nhập
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-900 via-green-800 to-emerald-700">
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
                d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Đặt lại mật khẩu
          </h1>
          <p className="text-green-200 mt-1 text-sm">
            Nhập mật khẩu mới cho tài khoản của bạn
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {success ? (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">
                Đổi mật khẩu thành công!
              </h2>
              <p className="text-gray-600 mb-6">
                Mật khẩu của bạn đã được cập nhật. Bạn có thể đăng nhập bằng mật khẩu mới.
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Đang chuyển hướng đến trang đăng nhập trong 3 giây...
              </p>
              <button
                onClick={() => navigate('/login', { replace: true })}
                className="w-full py-2.5 px-4 rounded-lg bg-green-600 hover:bg-green-700 active:bg-green-800
                           text-white font-semibold text-sm transition
                           focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                Đăng nhập ngay
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-gray-800 mb-6">
                Tạo mật khẩu mới
              </h2>

              {error && (
                <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                  {error}
                  {(error.includes('hết hạn') || error.includes('expired')) && (
                    <button
                      onClick={handleResendEmail}
                      className="block mt-2 text-green-600 hover:text-green-700 font-semibold underline"
                    >
                      Gửi lại email →
                    </button>
                  )}
                </div>
              )}

              {validationError && (
                <div className="mb-4 px-4 py-3 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-700 text-sm">
                  {validationError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label
                    htmlFor="newPassword"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Mật khẩu mới
                  </label>
                  <input
                    id="newPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400
                               focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                               transition text-sm"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Tối thiểu 6 ký tự
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Xác nhận mật khẩu
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400
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
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
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
                      Đang xử lý...
                    </span>
                  ) : (
                    'Đặt lại mật khẩu'
                  )}
                </button>
              </form>

              {/* Links */}
              <div className="mt-6 text-center">
                <button
                  onClick={() => navigate('/login')}
                  className="text-sm text-gray-600 hover:text-gray-800 font-medium"
                >
                  ← Quay lại đăng nhập
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
