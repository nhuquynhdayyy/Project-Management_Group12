import { useEffect, useMemo, useState } from 'react';
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
import {
  fetchTrees,
  fetchAreas,
} from '../../api/trees';
import type { HealthStatus, Tree, AdministrativeArea } from '../../types';
import {
  BAR_COLOR,
  ChartTooltip,
  DashboardPageFrame,
  HEALTH_COLORS,
  PAGE_SIZE,
  PaginationControls,
  Section,
  TimeFilterControls,
  isDangerTree,
  useTimeRange,
} from './dashboardShared';

export default function TreeStatsPage() {
  const [trees, setTrees] = useState<Tree[]>([]);
  const [areas, setAreas] = useState<AdministrativeArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [selectedAreaId, setSelectedAreaId] = useState<number | null>(null);
  const timeRange = useTimeRange();

  useEffect(() => {
    Promise.all([fetchTrees(), fetchAreas()])
      .then(([treesData, areasData]) => {
        setTrees(treesData);
        setAreas(areasData);
      })
      .catch(() => setError('Khong the tai du lieu cay. Vui long thu lai.'))
      .finally(() => setLoading(false));
  }, []);

  const filteredTrees = useMemo(() => {
    if (!selectedAreaId) return trees;
    return trees.filter((tree) => tree.area_id === selectedAreaId);
  }, [trees, selectedAreaId]);

  const healthData = useMemo(
    () =>
      (['Tốt', 'Yếu', 'Sâu bệnh', 'Chết'] as HealthStatus[]).map((status) => ({
        name: status,
        value: filteredTrees.filter((tree) => tree.health_status === status).length,
      })),
    [filteredTrees],
  );

  const speciesData = useMemo(() => {
    const speciesMap = new Map<string, number>();
    for (const tree of filteredTrees) {
      const name = tree.species?.common_name ?? 'Khong ro';
      speciesMap.set(name, (speciesMap.get(name) ?? 0) + 1);
    }
    return [...speciesMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));
  }, [filteredTrees]);

  const areaData = useMemo(() => {
    const areaMap = new Map<string, number>();
    for (const tree of filteredTrees) {
      const name = tree.area?.area_name ?? 'Khong ro';
      areaMap.set(name, (areaMap.get(name) ?? 0) + 1);
    }
    return [...areaMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));
  }, [filteredTrees]);

  const dangerTrees = useMemo(() => filteredTrees.filter(isDangerTree), [filteredTrees]);
  const totalPages = Math.max(1, Math.ceil(dangerTrees.length / PAGE_SIZE));
  const visibleTrees = dangerTrees.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <DashboardPageFrame
      title="Thong ke Cay"
      subtitle="Theo doi tinh trang suc khoe, loai cay va khu vuc"
      loading={loading}
      error={error}
    >
      <TimeFilterControls {...timeRange} />

      {/* Area Filter */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">Lọc theo khu vực</label>
        <select
          value={selectedAreaId || ''}
          onChange={(e) => setSelectedAreaId(e.target.value ? +e.target.value : null)}
          className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-600"
        >
          <option value="">Tất cả khu vực</option>
          {areas.map((area) => (
            <option key={area.id} value={area.id}>
              {area.area_name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <Section title="Phan bo tinh trang suc khoe">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={healthData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={95}
                paddingAngle={3}
                dataKey="value"
label={({ percent }) => (percent && percent > 0.04 ? `${(percent * 100).toFixed(0)}%` : '')}
                labelLine={false}
              >
                {healthData.map((entry) => (
                  <Cell key={entry.name} fill={HEALTH_COLORS[entry.name as HealthStatus] ?? '#6b7280'} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
              <Legend formatter={(value) => <span className="text-xs text-gray-300">{value}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </Section>

        <Section title="So luong cay theo loai">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={speciesData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} interval={0} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="count" name="So cay" fill={BAR_COLOR} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="So luong cay theo khu vuc">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={areaData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} interval={0} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="count" name="So cay" fill="#60a5fa" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Section>

        <Section title="Bang cay nguy hiem">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-300">
              <thead className="text-xs uppercase text-gray-400 border-b border-gray-700">
                <tr>
                  <th className="py-2 pr-3">Ma cay</th>
                  <th className="py-2 pr-3">Loai cay</th>
                  <th className="py-2 pr-3">Khu vuc</th>
                  <th className="py-2">Tinh trang</th>
                </tr>
              </thead>
              <tbody>
                {visibleTrees.map((tree) => (
                  <tr key={tree.id} className="border-b border-gray-800 bg-red-950/20">
                    <td className="py-2 pr-3">{tree.tree_code}</td>
                    <td className="py-2 pr-3">{tree.species?.common_name ?? 'Khong ro'}</td>
                    <td className="py-2 pr-3">{tree.area?.area_name ?? 'Khong ro'}</td>
<td className="py-2 font-semibold text-red-400">{tree.health_status}</td>
                  </tr>
                ))}
                {visibleTrees.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-gray-500">
                      Khong co cay nguy hiem.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} />
        </Section>
      </div>
    </DashboardPageFrame>
  );
}
