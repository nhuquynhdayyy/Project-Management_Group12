import { useEffect, useState } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line,
} from 'recharts';
import { fetchTrees } from '../api/trees';
import { fetchAllTasks } from '../api/maintenance';
import type { Tree, MaintenanceTask, HealthStatus } from '../types';

// ── Colour palette ────────────────────────────────────────────────────────
const HEALTH_COLORS: Record<HealthStatus, string> = {
  'Tốt':      '#22c55e',
  'Yếu':      '#eab308',
  'Sâu bệnh': '#f97316',
  'Chết':     '#ef4444',
};

const BAR_COLOR = '#34d399';

// ── Helpers ───────────────────────────────────────────────────────────────
function last7Days(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });
}

function formatDate(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

// ── KPI Card ─────────────────────────────────────────────────────────────
function KpiCard({
  label,
  value,
  sub,
  accent,
  icon,
}: {
  label: string;
  value: number | string;
  sub?: string;
  accent: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-gray-800 rounded-xl p-5 flex items-start gap-4 border border-gray-700">
      <div className={`p-2.5 rounded-lg ${accent} shrink-0`}>{icon}</div>
      <div>
        <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{label}</p>
        <p className="text-3xl font-bold text-white">{value}</p>
        {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
      <h3 className="text-sm font-semibold text-gray-300 mb-4 uppercase tracking-wider">
        {title}
      </h3>
      {children}
    </div>
  );
}

// ── Custom tooltip ────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      {label && <p className="text-gray-400 mb-1">{label}</p>}
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <span className="font-bold text-white">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [trees, setTrees] = useState<Tree[]>([]);
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([fetchTrees(), fetchAllTasks()])
      .then(([t, m]) => {
        setTrees(t);
        setTasks(m);
      })
      .catch(() => setError('Không thể tải dữ liệu. Vui lòng thử lại.'))
      .finally(() => setLoading(false));
  }, []);

  // ── Derived data ─────────────────────────────────────────────────────────
  const totalTrees = trees.length;
  const activeTasks = tasks.filter(
    (t) => t.status === 'Pending' || t.status === 'In_Progress',
  ).length;
  const dangerCount = trees.filter(
    (t) => t.health_status === 'Chết' || t.health_status === 'Sâu bệnh',
  ).length;

  // Pie: health distribution
  const healthData = (['Tốt', 'Yếu', 'Sâu bệnh', 'Chết'] as HealthStatus[]).map(
    (status) => ({
      name: status,
      value: trees.filter((t) => t.health_status === status).length,
    }),
  );

  // Bar: top species by count
  const speciesMap = new Map<string, number>();
  for (const tree of trees) {
    const name = tree.species?.common_name ?? 'Không rõ';
    speciesMap.set(name, (speciesMap.get(name) ?? 0) + 1);
  }
  const speciesData = [...speciesMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  // Line: completed tasks per day over last 7 days
  const days = last7Days();
  const completedByDay = days.map((day) => ({
    date: formatDate(day),
    completed: tasks.filter(
      (t) => t.status === 'Completed' && t.completed_at?.slice(0, 10) === day,
    ).length,
  }));

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-950">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-8 w-8 text-green-400" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span className="text-sm text-gray-400">Đang tải dữ liệu...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-950">
        <div className="text-red-400 text-sm">{error}</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-950 px-6 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Tổng quan hệ thống quản lý cây xanh đô thị — Đà Nẵng
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <KpiCard
          label="Tổng số cây"
          value={totalTrees}
          sub="Trong toàn hệ thống"
          accent="bg-green-600/20"
          icon={
            <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M12 3C8 3 5 6.5 5 10c0 2.5 1.3 4.7 3.3 6L8 20h8l-.3-4C17.7 14.7 19 12.5 19 10c0-3.5-3-7-7-7z" />
            </svg>
          }
        />
        <KpiCard
          label="Công việc đang xử lý"
          value={activeTasks}
          sub="Pending + In Progress"
          accent="bg-blue-600/20"
          icon={
            <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          }
        />
        <KpiCard
          label="Cảnh báo nguy hiểm"
          value={dangerCount}
          sub="Sâu bệnh + Chết"
          accent="bg-red-600/20"
          icon={
            <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
        />
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Pie chart */}
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
                label={({ percent }) =>
                  percent && percent > 0.04 ? `${(percent * 100).toFixed(0)}%` : ''
                }
                labelLine={false}
              >
                {healthData.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={HEALTH_COLORS[entry.name as HealthStatus]}
                  />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
              <Legend
                formatter={(value) => (
                  <span className="text-xs text-gray-300">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </Section>

        {/* Line chart */}
        <Section title="Công việc hoàn thành — 7 ngày qua">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={completedByDay} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} />
              <Line
                type="monotone"
                dataKey="completed"
                name="Hoàn thành"
                stroke="#34d399"
                strokeWidth={2}
                dot={{ fill: '#34d399', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Section>
      </div>

      {/* Bar chart — full width */}
      <Section title="Số lượng cây theo loài">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={speciesData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="name"
              tick={{ fill: '#9ca3af', fontSize: 11 }}
              interval={0}
            />
            <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} allowDecimals={false} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="count" name="Số cây" fill={BAR_COLOR} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Section>
    </div>
  );
}
