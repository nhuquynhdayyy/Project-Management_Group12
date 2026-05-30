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
  downloadTreeImportTemplate,
  fetchTrees,
  fetchAreas,
  importTreesFromExcel,
  previewTreeImport,
  type TreeImportPreview,
  type TreeImportResult,
} from '../../api/trees';
import { useAuth } from '../../context/AuthContext';
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
  const { user } = useAuth();
  const [trees, setTrees] = useState<Tree[]>([]);
  const [areas, setAreas] = useState<AdministrativeArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [selectedAreaId, setSelectedAreaId] = useState<number | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importStep, setImportStep] = useState<1 | 2 | 3>(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<TreeImportPreview | null>(null);
  const [importResult, setImportResult] = useState<TreeImportResult | null>(null);
  const [importError, setImportError] = useState('');
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [areErrorsOpen, setAreErrorsOpen] = useState(false);
  const timeRange = useTimeRange();
  const canImport = user?.roles.some((role) => role === 'Admin' || role === 'Manager') ?? false;

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

  async function refreshTrees() {
    const treeData = await fetchTrees();
    setTrees(treeData);
  }

  function resetImportModal() {
    setImportStep(1);
    setSelectedFile(null);
    setImportPreview(null);
    setImportResult(null);
    setImportError('');
    setIsPreviewing(false);
    setIsImporting(false);
    setAreErrorsOpen(false);
  }

  function closeImportModal() {
    setIsImportOpen(false);
    resetImportModal();
  }

  async function handleTemplateDownload() {
    setImportError('');
    try {
      const blob = await downloadTreeImportTemplate();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'tree-import-template.xlsx';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch {
      setImportError('Tai file mau that bai. Vui long thu lai.');
    }
  }

  async function handleFileSelected(file: File | null) {
    setImportError('');
    setImportPreview(null);
    setImportResult(null);
    setSelectedFile(file);
    setAreErrorsOpen(false);

    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      setImportError('Chi ho tro file .xlsx.');
      setSelectedFile(null);
      return;
    }

    setIsPreviewing(true);
    try {
      const preview = await previewTreeImport(file);
      setImportPreview(preview);
      setImportStep(2);
    } catch {
      setImportError('Khong the doc file Excel. Vui long kiem tra dinh dang file.');
    } finally {
      setIsPreviewing(false);
    }
  }

  async function handleConfirmImport() {
    if (!selectedFile) return;
    setImportError('');
    setIsImporting(true);
    try {
      const result = await importTreesFromExcel(selectedFile);
      setImportResult(result);
      setImportStep(3);
      await refreshTrees();
    } catch {
      setImportError('Nhap du lieu that bai. Vui long thu lai.');
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <DashboardPageFrame
      title="Thong ke Cay"
      subtitle="Theo doi tinh trang suc khoe, loai cay va khu vuc"
      loading={loading}
      error={error}
    >
      <TimeFilterControls {...timeRange} />

      {canImport && (
        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={() => setIsImportOpen(true)}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors duration-150"
          >
            📤 Nhập từ Excel
          </button>
        </div>
      )}

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

      {isImportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-5xl rounded-xl border border-gray-700 bg-gray-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-700 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Nhập cây từ Excel</h2>
                <p className="text-sm text-gray-400">File .xlsx theo mẫu dữ liệu cây xanh Liên Chiểu</p>
              </div>
              <button
                type="button"
                onClick={closeImportModal}
                className="rounded-lg px-3 py-1 text-xl text-gray-300 hover:bg-gray-800 hover:text-white"
                aria-label="Dong modal"
              >
                ×
              </button>
            </div>

            <div className="border-b border-gray-800 px-5 py-3">
              <div className="flex flex-wrap gap-2 text-sm">
                {[1, 2, 3].map((step) => (
                  <span
                    key={step}
                    className={`rounded-full px-3 py-1 ${
                      importStep === step ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400'
                    }`}
                  >
                    Bước {step}
                  </span>
                ))}
              </div>
            </div>

            <div className="max-h-[72vh] overflow-y-auto px-5 py-5">
              {importStep === 1 && (
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={handleTemplateDownload}
                    className="rounded-lg border border-emerald-700 bg-emerald-900/30 px-4 py-2 text-sm font-medium text-emerald-200 hover:bg-emerald-800/50"
                  >
                    📥 Tải file mẫu
                  </button>

                  <label
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      void handleFileSelected(event.dataTransfer.files.item(0));
                    }}
                    className="flex min-h-52 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-600 bg-gray-950/60 px-6 py-8 text-center hover:border-emerald-500"
                  >
                    <input
                      type="file"
                      accept=".xlsx"
                      className="hidden"
                      onChange={(event) => void handleFileSelected(event.target.files?.item(0) ?? null)}
                    />
                    <span className="text-base font-medium text-gray-200">
                      {selectedFile ? selectedFile.name : 'Keo tha file .xlsx vao day hoac bam de chon'}
                    </span>
                    <span className="mt-2 text-sm text-gray-500">
                      {isPreviewing ? 'Dang doc file...' : 'Cac cot: tree_code, species, area_name, latitude, longitude'}
                    </span>
                  </label>
                </div>
              )}

              {importStep === 2 && importPreview && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm text-gray-300">
                        File: <span className="font-medium text-white">{selectedFile?.name}</span>
                      </p>
                      <p className="text-sm text-gray-500">Tong so dong doc duoc: {importPreview.total}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setImportStep(1)}
                        className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-200 hover:bg-gray-800"
                      >
                        Chon file khac
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmImport}
                        disabled={isImporting}
                        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isImporting ? 'Dang nhap...' : '✅ Xác nhận nhập'}
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-lg border border-gray-800">
                    <table className="w-full text-left text-sm text-gray-300">
                      <thead className="bg-gray-950 text-xs uppercase text-gray-500">
                        <tr>
                          <th className="px-3 py-2">tree_code</th>
                          <th className="px-3 py-2">species</th>
                          <th className="px-3 py-2">area_name</th>
                          <th className="px-3 py-2">latitude</th>
                          <th className="px-3 py-2">longitude</th>
                          <th className="px-3 py-2">height_m</th>
                          <th className="px-3 py-2">trunk_diameter_cm</th>
                          <th className="px-3 py-2">health_status</th>
                          <th className="px-3 py-2">planting_year</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importPreview.rows.map((row) => (
                          <tr key={`${row.tree_code}-${row.latitude}-${row.longitude}`} className="border-t border-gray-800">
                            <td className="px-3 py-2">{row.tree_code}</td>
                            <td className="px-3 py-2">{row.species}</td>
                            <td className="px-3 py-2">{row.area_name}</td>
                            <td className="px-3 py-2">{row.latitude}</td>
                            <td className="px-3 py-2">{row.longitude}</td>
                            <td className="px-3 py-2">{row.height_m ?? ''}</td>
                            <td className="px-3 py-2">{row.trunk_diameter_cm ?? ''}</td>
                            <td className="px-3 py-2">{row.health_status ?? ''}</td>
                            <td className="px-3 py-2">{row.planting_year ?? ''}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {importPreview.errors.length > 0 && (
                    <div className="rounded-lg border border-amber-700/50 bg-amber-950/20 px-4 py-3 text-sm text-amber-200">
                      Co {importPreview.errors.length} loi se duoc bao cao khi nhap. Kiem tra file neu can.
                    </div>
                  )}
                </div>
              )}

              {importStep === 3 && importResult && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div className="rounded-lg border border-emerald-800 bg-emerald-950/30 p-4 text-emerald-200">
                      ✅ Đã nhập: <span className="font-semibold">{importResult.imported}</span> cây
                    </div>
                    <div className="rounded-lg border border-sky-800 bg-sky-950/30 p-4 text-sky-200">
                      ⏭️ Bỏ qua (trùng): <span className="font-semibold">{importResult.skipped}</span> cây
                    </div>
                    <div className="rounded-lg border border-red-800 bg-red-950/30 p-4 text-red-200">
                      ❌ Lỗi: <span className="font-semibold">{importResult.errors.length}</span> dòng
                    </div>
                  </div>

                  {importResult.errors.length > 0 && (
                    <div className="rounded-lg border border-gray-800">
                      <button
                        type="button"
                        onClick={() => setAreErrorsOpen((value) => !value)}
                        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-gray-200 hover:bg-gray-800"
                      >
                        Chi tiet loi
                        <span>{areErrorsOpen ? '−' : '+'}</span>
                      </button>
                      {areErrorsOpen && (
                        <div className="max-h-56 overflow-y-auto border-t border-gray-800 px-4 py-3">
                          {importResult.errors.map((item) => (
                            <div key={`${item.row}-${item.message}`} className="py-1 text-sm text-red-300">
                              Dong {item.row}: {item.message}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {importError && (
                <div className="mt-4 rounded-lg border border-red-800/60 bg-red-950/30 px-4 py-3 text-sm text-red-200">
                  {importError}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardPageFrame>
  );
}
