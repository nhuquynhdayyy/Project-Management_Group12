import { useEffect, useState } from 'react';
import { fetchAllSettings, updateSetting } from '../../api/settings';
import { DashboardPageFrame, Section } from './dashboardShared';

export default function SystemSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Geofencing radius state
  const [geofencingRadius, setGeofencingRadius] = useState(10);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    setError('');
    try {
      const data = await fetchAllSettings();

      // Load geofencing radius
      const geofencingSetting = data.find(s => s.key === 'geofencing_radius_meters');
      if (geofencingSetting) {
        setGeofencingRadius(parseFloat(geofencingSetting.value) || 10);
      }
    } catch (err) {
      setError('Không thể tải cấu hình. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveGeofencing() {
    setSaving(true);
    setSuccessMsg('');
    setError('');
    try {
      await updateSetting('geofencing_radius_meters', {
        value: String(geofencingRadius),
        description: 'Bán kính cho phép nhân viên xác nhận hoàn thành công việc (Geofencing) - đơn vị: mét',
      });
      setSuccessMsg('✅ Đã lưu cấu hình thành công!');
      setTimeout(() => setSuccessMsg(''), 3000);
      await loadSettings();
    } catch (err) {
      setError('❌ Không thể lưu cấu hình. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardPageFrame
      title="Cấu hình hệ thống"
      subtitle="Quản lý các tham số và cài đặt hệ thống"
      loading={loading}
      error={error}
    >
      {/* Success Message */}
      {successMsg && (
        <div className="mb-6 rounded-lg border border-green-800/40 bg-green-900/20 px-4 py-3 text-sm text-green-400">
          {successMsg}
        </div>
      )}

      {/* Geofencing Settings */}
      <Section title="Cấu hình Geofencing">
        <div className="space-y-6">
          {/* Description */}
          <div className="rounded-lg bg-gray-900 border border-gray-700 p-4">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-600/20 shrink-0">
                <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-white mb-1">Bán kính Geofencing</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Xác định khoảng cách tối đa (tính bằng mét) mà nhân viên được phép xác nhận hoàn thành công việc. 
                  Nhân viên phải ở trong bán kính này so với vị trí cây để có thể hoàn thành task.
                </p>
              </div>
            </div>
          </div>

          {/* Slider Control */}
          <div className="rounded-lg bg-gray-900 border border-gray-700 p-6">
            <div className="space-y-4">
              {/* Current Value Display */}
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-300">Bán kính hiện tại</label>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-bold text-green-400">{geofencingRadius}</span>
                  <span className="text-sm text-gray-500">mét</span>
                </div>
              </div>

              {/* Slider */}
              <div className="space-y-2">
                <input
                  type="range"
                  min="5"
                  max="100"
                  step="5"
                  value={geofencingRadius}
                  onChange={(e) => setGeofencingRadius(Number(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-600"
                  style={{
                    background: `linear-gradient(to right, #16a34a 0%, #16a34a ${((geofencingRadius - 5) / 95) * 100}%, #374151 ${((geofencingRadius - 5) / 95) * 100}%, #374151 100%)`,
                  }}
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>5m</span>
                  <span>25m</span>
                  <span>50m</span>
                  <span>75m</span>
                  <span>100m</span>
                </div>
              </div>

              {/* Visual Guide */}
              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className={`rounded-lg p-3 text-center transition-all ${geofencingRadius <= 20 ? 'bg-green-600/20 border border-green-600/40' : 'bg-gray-800 border border-gray-700'}`}>
                  <p className="text-xs font-semibold text-gray-300">Chặt chẽ</p>
                  <p className="text-xs text-gray-500 mt-1">5-20m</p>
                </div>
                <div className={`rounded-lg p-3 text-center transition-all ${geofencingRadius > 20 && geofencingRadius <= 50 ? 'bg-green-600/20 border border-green-600/40' : 'bg-gray-800 border border-gray-700'}`}>
                  <p className="text-xs font-semibold text-gray-300">Cân bằng</p>
                  <p className="text-xs text-gray-500 mt-1">25-50m</p>
                </div>
                <div className={`rounded-lg p-3 text-center transition-all ${geofencingRadius > 50 ? 'bg-green-600/20 border border-green-600/40' : 'bg-gray-800 border border-gray-700'}`}>
                  <p className="text-xs font-semibold text-gray-300">Linh hoạt</p>
                  <p className="text-xs text-gray-500 mt-1">55-100m</p>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-4">
                <button
                  onClick={handleSaveGeofencing}
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg bg-green-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Đang lưu...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Lưu thay đổi
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="rounded-lg bg-blue-900/20 border border-blue-800/40 p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-xs text-blue-300 leading-relaxed">
                <p className="font-semibold mb-1">💡 Lưu ý:</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Bán kính nhỏ (5-20m): Đảm bảo nhân viên thực sự ở gần cây, phù hợp cho khu vực đô thị.</li>
                  <li>Bán kính trung bình (25-50m): Cân bằng giữa độ chính xác và tính linh hoạt.</li>
                  <li>Bán kính lớn (55-100m): Phù hợp cho khu vực rộng hoặc có độ chính xác GPS thấp.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Future Settings Placeholder */}
      <Section title="Các cấu hình khác">
        <div className="rounded-lg bg-gray-900 border border-gray-700 p-8 text-center">
          <svg className="w-12 h-12 text-gray-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.607 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="text-sm text-gray-400">Các cấu hình khác sẽ được thêm vào trong tương lai</p>
        </div>
      </Section>
    </DashboardPageFrame>
  );
}
