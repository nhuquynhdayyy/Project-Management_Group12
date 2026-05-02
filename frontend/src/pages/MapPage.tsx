import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Viewer,
  Cartesian2,
  Cartesian3,
  Color,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  defined,
  Ion,
} from 'cesium';
// widgets.css is injected automatically by vite-plugin-cesium

import { fetchTrees } from '../api/trees';
import { healthColor, HEALTH_TAILWIND } from '../utils/cesiumHelpers';
import type { Tree, HealthStatus } from '../types';

const CESIUM_ION_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJhZmY2N2FlNS1iYjc1LTQ1OGMtOTVlYi0wZDJiOGIzODVjNTEiLCJpZCI6NDEyMDM5LCJpYXQiOjE3NzUwMDY0Nzh9.Bq4bXnvHmboOY9-hdWbzc5mo1CQOGxQTHl_h2DX26_A';

const HEALTH_STATUSES: HealthStatus[] = ['Tốt', 'Yếu', 'Sâu bệnh', 'Chết'];

// Liên Chiểu district, Da Nang — zoomed in to match seeded data
const LIEN_CHIEU = Cartesian3.fromDegrees(108.145, 16.09, 6000);

export default function MapPage() {
  const cesiumContainer = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const handlerRef = useRef<ScreenSpaceEventHandler | null>(null);

  const [trees, setTrees] = useState<Tree[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTree, setSelectedTree] = useState<Tree | null>(null);
  const [activeFilters, setActiveFilters] = useState<Set<HealthStatus>>(
    new Set(HEALTH_STATUSES),
  );

  // ── Load trees ───────────────────────────────────────────────────────────
  useEffect(() => {
    fetchTrees()
      .then(setTrees)
      .catch(() => setError('Không thể tải dữ liệu cây. Vui lòng thử lại.'))
      .finally(() => setLoading(false));
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

    viewer.camera.flyTo({ destination: LIEN_CHIEU, duration: 1.5 });
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
      const coords = tree.location?.coordinates;
      if (!coords) continue;
      const [lng, lat] = coords;

      viewer.entities.add({
        id: String(tree.id),
        position: Cartesian3.fromDegrees(lng, lat),
        point: {
          pixelSize: 10,
          color: healthColor(tree.health_status),
          outlineColor: Color.WHITE,
          outlineWidth: 1.5,
          heightReference: 1, // CLAMP_TO_GROUND
        },
      });
    }
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
      next.has(status) ? next.delete(status) : next.add(status);
      return next;
    });
  }, []);

  const visibleCount = trees.filter((t) => activeFilters.has(t.health_status)).length;

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
                    {selectedTree.location.coordinates[1].toFixed(5)},{' '}
                    {selectedTree.location.coordinates[0].toFixed(5)}
                  </span>
                }
              />
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

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-gray-400 shrink-0">{label}</span>
      <span className="text-right text-gray-100 break-all">{value}</span>
    </div>
  );
}
