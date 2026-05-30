import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { login } from '../api/auth';

export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isUnverified, setIsUnverified] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setIsUnverified(false);
    setLoading(true);
    try {
      const data = await login(username, password);
      signIn(data);
      navigate('/map', { replace: true });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.';
      const errorMsg = Array.isArray(msg) ? msg.join(', ') : msg;
      setError(errorMsg);
      
      // Check if error is about unverified email
      if (errorMsg.includes('chưa được xác minh') || errorMsg.includes('not verified')) {
        setIsUnverified(true);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResendVerification() {
    const email = prompt('Nhập email của bạn để gửi lại link xác minh:');
    if (!email) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        alert('Email xác minh đã được gửi lại! Vui lòng kiểm tra hộp thư.');
      } else {
        const data = await response.json();
        alert(data.message || 'Không thể gửi lại email. Vui lòng thử lại sau.');
      }
    } catch (err) {
      alert('Không thể gửi lại email. Vui lòng thử lại sau.');
    }
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
                d="M12 3C8 3 5 6.5 5 10c0 2.5 1.3 4.7 3.3 6L8 20h8l-.3-4C17.7 14.7 19 12.5 19 10c0-3.5-3-7-7-7z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Quản Lý Cây Xanh
          </h1>
          <p className="text-green-200 mt-1 text-sm">
            Hệ thống quản lý cây xanh đô thị
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Đăng nhập</h2>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
              {isUnverified && (
                <button
                  onClick={handleResendVerification}
                  className="block mt-2 text-blue-600 hover:text-blue-700 font-semibold underline"
                >
                  Gửi lại email xác minh →
                </button>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Tên đăng nhập hoặc Email
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin hoặc admin@example.com"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400
                           focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                           transition text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Mật khẩu
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
                  Đang đăng nhập...
                </span>
              ) : (
                'Đăng nhập'
              )}
            </button>
          </form>

          {/* Dev hint */}
          <p className="mt-6 text-xs text-gray-400 text-center">
            Tài khoản thử nghiệm: <span className="font-mono">admin</span> /{' '}
            <span className="font-mono">Test@123</span>
          </p>

          {/* Links */}
          <div className="mt-6 space-y-2 text-center">
            <p className="text-sm text-gray-600">
              Chưa có tài khoản?{' '}
              <button
                onClick={() => navigate('/register')}
                className="text-green-600 hover:text-green-700 font-semibold"
              >
                Đăng ký ngay
              </button>
            </p>
            <p className="text-sm text-gray-600">
              <button
                onClick={() => navigate('/forgot-password')}
                className="text-gray-500 hover:text-gray-700"
              >
                Quên mật khẩu?
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
