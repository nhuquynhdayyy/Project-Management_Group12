import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Viewer,
  Cartesian2,
  Cartesian3,
  Color,
  CallbackProperty,
  Rectangle,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  defined,
  Ion,
} from 'cesium';
// widgets.css is injected automatically by vite-plugin-cesium

import { createIncident } from '../api/incidents';
import { fetchTreeSpecies, fetchTrees } from '../api/trees';
import { healthColor, HEALTH_TAILWIND } from '../utils/cesiumHelpers';
import type { Tree, HealthStatus, TreeSpecies } from '../types';

const CESIUM_ION_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJhZmY2N2FlNS1iYjc1LTQ1OGMtOTVlYi0wZDJiOGIzODVjNTEiLCJpZCI6NDEyMDM5LCJpYXQiOjE3NzUwMDY0Nzh9.Bq4bXnvHmboOY9-hdWbzc5mo1CQOGxQTHl_h2DX26_A';

const HEALTH_STATUSES: HealthStatus[] = ['Tốt', 'Yếu', 'Sâu bệnh', 'Chết'];
const DANGER_STATUSES: HealthStatus[] = ['Sâu bệnh', 'Chết'];

// Initial fallback before tree data is loaded.
const DEFAULT_VIEW = Cartesian3.fromDegrees(106.7, 10.78, 6000);

export default function MapPage() {
  const cesiumContainer = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const handlerRef = useRef<ScreenSpaceEventHandler | null>(null);

  const [trees, setTrees] = useState<Tree[]>([]);
  const [species, setSpecies] = useState<TreeSpecies[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTree, setSelectedTree] = useState<Tree | null>(null);
  const [selectedSpeciesIds, setSelectedSpeciesIds] = useState<Set<number>>(new Set());
  const [dangerOnly, setDangerOnly] = useState(false);
  const [incidentOpen, setIncidentOpen] = useState(false);
  const [incidentType, setIncidentType] = useState('Gãy cành');
  const [incidentDescription, setIncidentDescription] = useState('');
  const [incidentImageUrl, setIncidentImageUrl] = useState('');
  const [incidentMessage, setIncidentMessage] = useState('');
  const [submittingIncident, setSubmittingIncident] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Set<HealthStatus>>(
    new Set(HEALTH_STATUSES),
  );

  // ── Load trees ───────────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    fetchTrees({
      species: [...selectedSpeciesIds],
      healthStatus: dangerOnly ? 'danger' : undefined,
    })
      .then(setTrees)
      .catch(() => setError('Không thể tải dữ liệu cây. Vui lòng thử lại.'))
      .finally(() => setLoading(false));
  }, [selectedSpeciesIds, dangerOnly]);

  useEffect(() => {
    fetchTreeSpecies()
      .then(setSpecies)
      .catch(() => setSpecies([]));
  }, []);

  // ── Init Cesium viewer ───────────────────────────────────────────────────
  useEffect(() => {
    if (!cesiumContainer.current || viewerRef.current) return;

    Ion.defaultAccessToken = CESIUM_ION_TOKEN;

    const viewer = new Viewer(cesiumContainer.current, {
      timeline: false,
      animation: false,
      baseLayerPicker: false,
      geocoder: false,
      homeButton: false,
      sceneModePicker: false,
      navigationHelpButton: false,
      fullscreenButton: false,
      infoBox: false,
      selectionIndicator: false,
    });

    viewer.camera.flyTo({ destination: DEFAULT_VIEW, duration: 1.5 });
    viewerRef.current = viewer;

    return () => {
      if (handlerRef.current && !handlerRef.current.isDestroyed()) {
        handlerRef.current.destroy();
        handlerRef.current = null;
      }
      if (!viewer.isDestroyed()) viewer.destroy();
      viewerRef.current = null;
    };
  }, []);

  // ── Render markers ───────────────────────────────────────────────────────
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    viewer.entities.removeAll();

    for (const tree of trees) {
      if (!activeFilters.has(tree.health_status)) continue;
      const coords = getTreeCoordinates(tree);
      if (!coords) continue;
      const [lng, lat] = coords;

      const danger = isDangerTree(tree);

      viewer.entities.add({
        id: String(tree.id),
        position: Cartesian3.fromDegrees(lng, lat),
        point: {
          pixelSize: danger
            ? new CallbackProperty(() => 12 + Math.sin(Date.now() / 180) * 3, false)
            : 10,
          color: danger
            ? new CallbackProperty(
                () => Color.RED.withAlpha(0.65 + Math.abs(Math.sin(Date.now() / 220)) * 0.35),
                false,
              )
            : healthColor(tree.health_status),
          outlineColor: Color.WHITE,
          outlineWidth: danger ? 2 : 1.5,
          heightReference: 1, // CLAMP_TO_GROUND
        },
      });
    }
  }, [trees, activeFilters]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || trees.length === 0) return;

    const visibleCoordinates = trees
      .filter((tree) => activeFilters.has(tree.health_status))
      .map(getTreeCoordinates)
      .filter((coords): coords is [number, number] => Boolean(coords));

    if (visibleCoordinates.length === 0) return;

    const lngs = visibleCoordinates.map(([lng]) => lng);
    const lats = visibleCoordinates.map(([, lat]) => lat);
    const west = Math.min(...lngs);
    const east = Math.max(...lngs);
    const south = Math.min(...lats);
    const north = Math.max(...lats);

    if (visibleCoordinates.length === 1 || (west === east && south === north)) {
      viewer.camera.flyTo({
        destination: Cartesian3.fromDegrees(west, south, 2500),
        duration: 0.8,
      });
      return;
    }

    const lngPadding = Math.max((east - west) * 0.2, 0.002);
    const latPadding = Math.max((north - south) * 0.2, 0.002);

    viewer.camera.flyTo({
      destination: Rectangle.fromDegrees(
        west - lngPadding,
        south - latPadding,
        east + lngPadding,
        north + latPadding,
      ),
      duration: 0.8,
    });
  }, [trees, activeFilters]);

  // ── Click handler ────────────────────────────────────────────────────────
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    if (handlerRef.current && !handlerRef.current.isDestroyed()) {
      handlerRef.current.destroy();
    }

    const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction((movement: { position: Cartesian2 }) => {
      const picked = viewer.scene.pick(movement.position);
      if (defined(picked) && picked.id) {
        const treeId = Number((picked.id as { id: string }).id);
        setSelectedTree(trees.find((t) => t.id === treeId) ?? null);
      } else {
        setSelectedTree(null);
      }
    }, ScreenSpaceEventType.LEFT_CLICK);

    handlerRef.current = handler;
    return () => {
      if (!handler.isDestroyed()) handler.destroy();
    };
  }, [trees]);

  // ── Filter toggle ────────────────────────────────────────────────────────
  const toggleFilter = useCallback((status: HealthStatus) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(status)) {
        next.delete(status);
      } else {
        next.add(status);
      }
      return next;
    });
  }, []);

  const toggleSpecies = useCallback((speciesId: number) => {
    setSelectedSpeciesIds((prev) => {
      const next = new Set(prev);
      if (next.has(speciesId)) {
        next.delete(speciesId);
      } else {
        next.add(speciesId);
      }
      return next;
    });
  }, []);

  function openDirections(tree: Tree) {
    const coords = getTreeCoordinates(tree);
    if (!coords) return;
    const [lng, lat] = coords;
    const label = encodeURIComponent(tree.tree_code);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking&query=${label}`, '_blank');
  }

  async function submitIncident() {
    if (!selectedTree || !incidentDescription.trim()) return;
    setSubmittingIncident(true);
    setIncidentMessage('');

    try {
      await createIncident({
        tree_id: selectedTree.id,
        incident_type: incidentType,
        description: incidentDescription,
        image_url: incidentImageUrl || undefined,
      });
      setIncidentDescription('');
      setIncidentImageUrl('');
      setIncidentOpen(false);
      setIncidentMessage('Đã gửi báo cáo sự cố đến Manager.');
    } catch {
      setIncidentMessage('Không thể gửi báo cáo sự cố. Vui lòng thử lại.');
    } finally {
      setSubmittingIncident(false);
    }
  }

  const visibleCount = trees.filter((t) => activeFilters.has(t.health_status)).length;
  const selectedTreeCoordinates = selectedTree ? getTreeCoordinates(selectedTree) : null;

  return (
    <div className="flex h-full bg-gray-900 text-white overflow-hidden">
      {/* ── Filter / detail panel ── */}
      <aside className="w-60 shrink-0 flex flex-col bg-gray-800 border-r border-gray-700 overflow-y-auto">
        {/* Stats bar */}
        <div className="px-4 py-3 border-b border-gray-700">
          <p className="text-xs text-gray-400">
            Hiển thị{' '}
            <span className="text-white font-semibold">{visibleCount}</span>
            {' / '}
            <span className="text-white font-semibold">{trees.length}</span>
            {' '}cây
          </p>
        </div>

        {/* Species filter */}
        <div className="p-4 border-b border-gray-700">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
              Lọc loài cây
            </h3>
            {selectedSpeciesIds.size > 0 ? (
              <button
                type="button"
                onClick={() => setSelectedSpeciesIds(new Set())}
                className="text-[11px] text-green-400 hover:text-green-300"
              >
                Xóa lọc
              </button>
            ) : null}
          </div>
          <div className="max-h-48 space-y-1 overflow-y-auto pr-1">
            {species.map((item) => (
              <label
                key={item.id}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-gray-300 hover:bg-gray-700/50"
              >
                <input
                  type="checkbox"
                  checked={selectedSpeciesIds.has(item.id)}
                  onChange={() => toggleSpecies(item.id)}
                />
                <span className="min-w-0 flex-1 truncate">{item.common_name}</span>
              </label>
            ))}
            {species.length === 0 ? (
              <p className="text-xs text-gray-500">Chưa có danh mục loài cây</p>
            ) : null}
          </div>
        </div>

        {/* Danger filter */}
        <div className="p-4 border-b border-gray-700">
          <label className="flex items-center justify-between gap-3 rounded-md border border-gray-700 px-3 py-2 text-sm text-gray-200">
            <span>Chỉ hiện cây nguy hiểm</span>
            <input
              type="checkbox"
              checked={dangerOnly}
              onChange={(event) => {
                setDangerOnly(event.target.checked);
                if (event.target.checked) setActiveFilters(new Set(HEALTH_STATUSES));
              }}
            />
          </label>
        </div>

        {/* Health filter */}
        <div className="p-4 border-b border-gray-700">
          <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Lọc tình trạng
          </h3>
          <div className="space-y-1.5">
            {HEALTH_STATUSES.map((status) => {
              const count = trees.filter((t) => t.health_status === status).length;
              const active = activeFilters.has(status);
              return (
                <button
                  key={status}
                  onClick={() => toggleFilter(status)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition
                    ${active ? 'bg-gray-700 text-white' : 'text-gray-500 hover:bg-gray-700/50'}`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${HEALTH_TAILWIND[status]}`} />
                  <span className="flex-1 text-left">{status}</span>
                  <span className="text-xs font-mono text-gray-400">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected tree detail */}
        {selectedTree ? (
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                Chi tiết cây
              </h3>
              <button
                onClick={() => setSelectedTree(null)}
                className="text-gray-600 hover:text-gray-300 text-lg leading-none"
                aria-label="Đóng"
              >
                ×
              </button>
            </div>
            <div className="space-y-2 text-sm">
              <Row label="Mã cây" value={selectedTree.tree_code} />
              <Row label="Loài" value={selectedTree.species?.common_name ?? '—'} />
              <Row
                label="Tên KH"
                value={<em className="text-gray-400 text-xs">{selectedTree.species?.scientific_name ?? '—'}</em>}
              />
              <Row label="Khu vực" value={selectedTree.area?.area_name ?? '—'} />
              <Row
                label="Tình trạng"
                value={
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium text-white ${HEALTH_TAILWIND[selectedTree.health_status]}`}>
                    {selectedTree.health_status}
                  </span>
                }
              />
              {selectedTree.height_m != null && (
                <Row label="Chiều cao" value={`${selectedTree.height_m} m`} />
              )}
              {selectedTree.trunk_diameter_cm != null && (
                <Row label="Đường kính" value={`${selectedTree.trunk_diameter_cm} cm`} />
              )}
              {selectedTree.planting_year && (
                <Row label="Năm trồng" value={String(selectedTree.planting_year)} />
              )}
              <Row
                label="Tọa độ"
                value={
                  <span className="font-mono text-[10px] text-gray-400">
                    {selectedTreeCoordinates
                      ? `${selectedTreeCoordinates[1].toFixed(5)}, ${selectedTreeCoordinates[0].toFixed(5)}`
                      : '—'}
                  </span>
                }
              />
              <div className="grid gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => openDirections(selectedTree)}
                  className="h-9 rounded-md bg-green-600 px-3 text-sm font-semibold text-white hover:bg-green-500"
                >
                  Chỉ đường đến đây
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIncidentOpen((value) => !value);
                    setIncidentMessage('');
                  }}
                  className="h-9 rounded-md border border-red-500/60 px-3 text-sm font-semibold text-red-200 hover:bg-red-950"
                >
                  Báo cáo sự cố
                </button>
              </div>

              {incidentMessage ? (
                <p className="rounded-md bg-gray-900 px-3 py-2 text-xs text-gray-300">{incidentMessage}</p>
              ) : null}

              {incidentOpen ? (
                <div className="space-y-2 rounded-md border border-gray-700 bg-gray-900 p-3">
                  <label className="block text-xs text-gray-300">
                    Loại sự cố
                    <select
                      className="mt-1 h-9 w-full rounded-md border border-gray-700 bg-gray-950 px-2 text-sm text-white"
                      value={incidentType}
                      onChange={(event) => setIncidentType(event.target.value)}
                    >
                      <option>Gãy cành</option>
                      <option>Sâu bệnh</option>
                      <option>Đổ ngã</option>
                      <option>Khác</option>
                    </select>
                  </label>
                  <label className="block text-xs text-gray-300">
                    Mô tả
                    <textarea
                      className="mt-1 min-h-20 w-full rounded-md border border-gray-700 bg-gray-950 px-2 py-1.5 text-sm text-white"
                      value={incidentDescription}
                      onChange={(event) => setIncidentDescription(event.target.value)}
                    />
                  </label>
                  <label className="block text-xs text-gray-300">
                    Ảnh đính kèm
                    <input
                      className="mt-1 h-9 w-full rounded-md border border-gray-700 bg-gray-950 px-2 text-sm text-white"
                      value={incidentImageUrl}
                      onChange={(event) => setIncidentImageUrl(event.target.value)}
                      placeholder="URL ảnh"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={submitIncident}
                    disabled={submittingIncident || !incidentDescription.trim()}
                    className="h-9 w-full rounded-md bg-red-600 px-3 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
                  >
                    {submittingIncident ? 'Đang gửi...' : 'Gửi báo cáo'}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          !loading && trees.length > 0 && (
            <p className="p-4 text-xs text-gray-600 text-center">
              Nhấp vào điểm trên bản đồ để xem chi tiết
            </p>
          )
        )}
      </aside>

      {/* ── Map ── */}
      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-gray-900/80">
            <svg className="animate-spin h-7 w-7 text-green-400" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </div>
        )}
        {error && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-lg bg-red-600 text-white text-sm shadow-lg">
            {error}
          </div>
        )}
        {!loading && !error && trees.length === 0 && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-lg bg-yellow-600 text-white text-sm shadow-lg">
            Chưa có cây nào. Hãy chạy seeder.
          </div>
        )}
        <div ref={cesiumContainer} className="w-full h-full" />
      </div>
    </div>
  );
}

function isDangerTree(tree: Tree): boolean {
  return DANGER_STATUSES.includes(tree.health_status);
}

function getTreeCoordinates(tree: Tree): [number, number] | null {
  const location = tree.location as Tree['location'] | string | null | undefined;

  if (!location) return null;

  if (typeof location === 'string') {
    const match = location.match(/POINT\(([-\d.]+)\s+([-\d.]+)\)/i);
    if (!match) return null;

    const lng = Number(match[1]);
    const lat = Number(match[2]);
    return Number.isFinite(lng) && Number.isFinite(lat) ? [lng, lat] : null;
  }

  const [lng, lat] = location.coordinates ?? [];
  return Number.isFinite(lng) && Number.isFinite(lat) ? [lng, lat] : null;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-gray-400 shrink-0">{label}</span>
      <span className="text-right text-gray-100 break-all">{value}</span>
    </div>
  );
}
