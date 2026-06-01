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
import { fetchTrees } from '../../api/trees';
import { downloadAgeStatsExcel, fetchAgeStats, fetchStatsAreas } from '../../api/stats';
import type { AdministrativeArea, AgeStatsItem, Tree } from '../../types';
import {
  BAR_COLOR,
  ChartTooltip,
  DashboardPageFrame,
  PAGE_SIZE,
  PaginationControls,
  Section,
} from './dashboardShared';

const HEALTH_COLORS = {
  Tốt: '#22c55e',
  Yếu: '#eab308',
  'Sâu bệnh': '#f97316',
  Chết: '#ef4444',
};

const HEALTH_STATUS_ALIASES: Record<keyof typeof HEALTH_COLORS, string[]> = {
  Tốt: ['Tốt', 'Tá»‘t'],
  Yếu: ['Yếu', 'Yáº¿u'],
  'Sâu bệnh': ['Sâu bệnh', 'SĂ¢u bá»‡nh'],
  Chết: ['Chết', 'Cháº¿t'],
};

function matchesStatus(tree: Tree, status: keyof typeof HEALTH_COLORS) {
  return HEALTH_STATUS_ALIASES[status].includes(tree.health_status);
}

function displayHealthStatus(status: string) {
  const found = (Object.keys(HEALTH_STATUS_ALIASES) as (keyof typeof HEALTH_COLORS)[]).find((key) =>
    HEALTH_STATUS_ALIASES[key].includes(status),
  );
  return found ?? status;
}

function isDangerTree(tree: Tree) {
  return matchesStatus(tree, 'Sâu bệnh') || matchesStatus(tree, 'Chết');
}

export default function TreeStatsPage() {
  const [trees, setTrees] = useState<Tree[]>([]);
  const [areas, setAreas] = useState<AdministrativeArea[]>([]);
  const [ageData, setAgeData] = useState<AgeStatsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [exportError, setExportError] = useState('');
  const [page, setPage] = useState(1);
  const [selectedAreaId, setSelectedAreaId] = useState<number | undefined>();

  useEffect(() => {
    setLoading(true);
    setError('');
    Promise.all([fetchTrees(), fetchStatsAreas(), fetchAgeStats(selectedAreaId)])
      .then(([treesData, areasData, ageStats]) => {
        setTrees(treesData);
        setAreas(areasData);
        setAgeData(ageStats);
      })
      .catch(() => setError('Không thể tải dữ liệu cây. Vui lòng thử lại.'))
      .finally(() => setLoading(false));
  }, [selectedAreaId]);

  const filteredTrees = useMemo(() => {
    if (!selectedAreaId) return trees;
    return trees.filter((tree) => tree.area_id === selectedAreaId);
  }, [trees, selectedAreaId]);

  const healthData = useMemo(
    () =>
      (Object.keys(HEALTH_COLORS) as (keyof typeof HEALTH_COLORS)[]).map((status) => ({
        name: status,
        value: filteredTrees.filter((tree) => matchesStatus(tree, status)).length,
      })),
    [filteredTrees],
  );

  const speciesData = useMemo(() => {
    const speciesMap = new Map<string, number>();
    for (const tree of filteredTrees) {
      const name = tree.species?.common_name ?? 'Không rõ';
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
      const name = tree.area?.area_name ?? 'Không rõ';
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

  async function handleExportExcel() {
    setExportError('');
    setExporting(true);
    try {
      await downloadAgeStatsExcel(selectedAreaId);
    } catch {
      setExportError('Xuất Excel thất bại. Vui lòng thử lại.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <DashboardPageFrame
      title="Thống kê Cây"
      subtitle="Theo dõi sức khỏe, loài cây, khu vực và độ tuổi cây"
      loading={loading}
      error={error}
    >
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3 rounded-xl border border-gray-700 bg-gray-800 p-5">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-300">Lọc theo khu vực</label>
          <select
            value={selectedAreaId ?? ''}
            onChange={(event) => {
              setSelectedAreaId(event.target.value ? Number(event.target.value) : undefined);
              setPage(1);
            }}
            className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white focus:border-green-600 focus:outline-none"
          >
            <option value="">Tất cả khu vực</option>
            {areas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.area_name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={handleExportExcel}
          disabled={exporting}
          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {exporting ? 'Đang xuất...' : 'Xuất Excel'}
        </button>
      </div>

      {exportError ? (
        <div className="mb-4 rounded-lg border border-red-800/40 bg-red-900/20 px-3 py-2 text-sm text-red-400">
          {exportError}
        </div>
      ) : null}

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Section title="Phân bố tình trạng sức khỏe">
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
                  <Cell key={entry.name} fill={HEALTH_COLORS[entry.name]} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
              <Legend formatter={(value) => <span className="text-xs text-gray-300">{value}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </Section>

        <Section title="Thống kê cây theo độ tuổi">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={ageData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="label" tick={{ fill: '#9ca3af', fontSize: 11 }} interval={0} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="count" name="Số cây" fill="#38bdf8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Section>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Section title="Số lượng cây theo loài">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={speciesData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} interval={0} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="count" name="Số cây" fill={BAR_COLOR} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Section>

        <Section title="Số lượng cây theo khu vực">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={areaData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} interval={0} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="count" name="Số cây" fill="#60a5fa" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Section>
      </div>

      <Section title="Bảng cây nguy hiểm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="border-b border-gray-700 text-xs uppercase text-gray-400">
              <tr>
                <th className="py-2 pr-3">Mã cây</th>
                <th className="py-2 pr-3">Loài cây</th>
                <th className="py-2 pr-3">Khu vực</th>
                <th className="py-2">Tình trạng</th>
              </tr>
            </thead>
            <tbody>
              {visibleTrees.map((tree) => (
                <tr key={tree.id} className="border-b border-gray-800 bg-red-950/20">
                  <td className="py-2 pr-3">{tree.tree_code}</td>
                  <td className="py-2 pr-3">{tree.species?.common_name ?? 'Không rõ'}</td>
                  <td className="py-2 pr-3">{tree.area?.area_name ?? 'Không rõ'}</td>
                  <td className="py-2 font-semibold text-red-400">{displayHealthStatus(tree.health_status)}</td>
                </tr>
              ))}
              {visibleTrees.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-gray-500">
                    Không có cây nguy hiểm.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} />
      </Section>
    </DashboardPageFrame>
  );
}
