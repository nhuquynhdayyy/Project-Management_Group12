import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ageStatsExportUrl, fetchAgeStats, fetchHealthStats, fetchStatsAreas } from '../api/stats';
import type { AdministrativeArea, AgeStatsItem, HealthStats } from '../types';

const HEALTH_COLORS = {
  healthy: '#22c55e',
  weak: '#eab308',
  dead: '#ef4444',
};

export default function StatsPage() {
  const [areas, setAreas] = useState<AdministrativeArea[]>([]);
  const [areaId, setAreaId] = useState('');
  const [health, setHealth] = useState<HealthStats>({ healthy: 0, weak: 0, dead: 0 });
  const [age, setAge] = useState<AgeStatsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStatsAreas().then(setAreas).catch(() => setAreas([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    setError('');
    const selectedArea = areaId ? Number(areaId) : undefined;
    Promise.all([fetchHealthStats(selectedArea), fetchAgeStats(selectedArea)])
      .then(([healthStats, ageStats]) => {
        setHealth(healthStats);
        setAge(ageStats);
      })
      .catch(() => setError('Không thể tải dữ liệu thống kê.'))
      .finally(() => setLoading(false));
  }, [areaId]);

  const healthData = [
    { key: 'healthy', name: 'Khỏe', value: health.healthy },
    { key: 'weak', name: 'Yếu', value: health.weak },
    { key: 'dead', name: 'Chết/Nguy hiểm', value: health.dead },
  ];

  return (
    <div className="h-full overflow-y-auto bg-gray-950 px-6 py-6">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Thống kê cây xanh</h1>
          <p className="mt-1 text-sm text-gray-400">Tỷ lệ sức khỏe và phân nhóm cây theo độ tuổi.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select value={areaId} onChange={(event) => setAreaId(event.target.value)} className="rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white">
            <option value="">Tất cả khu vực</option>
            {areas.map((area) => (
              <option key={area.id} value={area.id}>{area.area_name}</option>
            ))}
          </select>
          <a href={ageStatsExportUrl(areaId ? Number(areaId) : undefined)} className="rounded bg-green-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-green-500">
            Xuất Excel
          </a>
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}
      {loading ? (
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-8 text-center text-sm text-gray-400">Đang tải dữ liệu...</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <section className="rounded-lg border border-gray-800 bg-gray-900 p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase text-gray-300">Tỷ lệ sức khỏe</h2>
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie data={healthData} dataKey="value" innerRadius={70} outerRadius={115} paddingAngle={3} label={({ value }) => `${value}%`}>
                  {healthData.map((item) => (
                    <Cell key={item.key} fill={HEALTH_COLORS[item.key as keyof typeof HEALTH_COLORS]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value}%`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </section>

          <section className="rounded-lg border border-gray-800 bg-gray-900 p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase text-gray-300">Cây theo độ tuổi</h2>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={age} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="label" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" name="Số cây" fill="#38bdf8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </section>
        </div>
      )}
    </div>
  );
}
