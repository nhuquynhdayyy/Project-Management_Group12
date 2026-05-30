import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Token xác minh không hợp lệ');
      setLoading(false);
      return;
    }

    verifyEmail(token);
  }, [token]);

  async function verifyEmail(token: string) {
    try {
      const response = await axios.get(
        `${API_URL}/auth/verify-email?token=${token}`
      );

      if (response.data.success) {
        setSuccess(true);
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Xác minh thất bại. Link có thể đã hết hạn.';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleResendEmail() {
    const email = prompt('Nhập email của bạn để gửi lại link xác minh:');
    if (!email) return;

    try {
      await axios.post(`${API_URL}/auth/resend-verification`, { email });
      alert('Email xác minh đã được gửi lại! Vui lòng kiểm tra hộp thư.');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Không thể gửi lại email. Vui lòng thử lại sau.';
      alert(Array.isArray(msg) ? msg.join(', ') : msg);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-900 via-green-800 to-emerald-700">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/10 backdrop-blur mb-6">
            <svg
              className="animate-spin h-10 w-10 text-white"
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
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Đang xác minh email...
          </h2>
          <p className="text-green-200 text-sm">Vui lòng đợi trong giây lát</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-900 via-green-800 to-emerald-700 p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            {/* Success Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                <svg
                  className="w-12 h-12 text-green-600"
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
              Xác minh thành công!
            </h2>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-700 text-center">
                ✅ Tài khoản của bạn đã được kích hoạt thành công.
                <br />
                Bạn có thể đăng nhập ngay bây giờ!
              </p>
            </div>

            <button
              onClick={() => navigate('/login')}
              className="w-full py-3 px-4 rounded-lg bg-green-600 hover:bg-green-700 text-white
                         font-semibold text-sm transition shadow-lg hover:shadow-xl"
            >
              Đăng nhập ngay →
            </button>

            <p className="mt-6 text-xs text-gray-500 text-center">
              🎉 Chào mừng bạn đến với Hệ thống Quản lý Cây Xanh!
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-900 via-green-800 to-emerald-700 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Error Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
              <svg
                className="w-12 h-12 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-800 text-center mb-4">
            Xác minh thất bại
          </h2>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-700 text-center">{error}</p>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleResendEmail}
              className="w-full py-2.5 px-4 rounded-lg bg-green-600 hover:bg-green-700 text-white
                         font-semibold text-sm transition"
            >
              Gửi lại email xác minh
            </button>

            <button
              onClick={() => navigate('/login')}
              className="w-full py-2.5 px-4 rounded-lg bg-white border-2 border-gray-300 text-gray-700
                         hover:bg-gray-50 font-semibold text-sm transition"
            >
              Về trang đăng nhập
            </button>
          </div>

          <p className="mt-6 text-xs text-gray-500 text-center">
            💡 Link xác minh có hiệu lực trong 24 giờ
          </p>
        </div>
      </div>
    </div>
  );
}
