import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
// Note: widgets.css is injected automatically by vite-plugin-cesium

import { useAuth } from '../context/AuthContext';
import { fetchTrees } from '../api/trees';
import { healthColor, HEALTH_TAILWIND } from '../utils/cesiumHelpers';
import type { Tree, HealthStatus } from '../types';

// Use the default Cesium Ion token (works for OSM tiles without a paid key)
const CESIUM_ION_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJhZmY2N2FlNS1iYjc1LTQ1OGMtOTVlYi0wZDJiOGIzODVjNTEiLCJpZCI6NDEyMDM5LCJpYXQiOjE3NzUwMDY0Nzh9.Bq4bXnvHmboOY9-hdWbzc5mo1CQOGxQTHl_h2DX26_A';

const HEALTH_STATUSES: HealthStatus[] = ['Tốt', 'Yếu', 'Sâu bệnh', 'Chết'];

// Da Nang city center
const DA_NANG = Cartesian3.fromDegrees(108.2022, 16.0544, 8000);

export default function MapPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

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

  // ── Load trees from API ──────────────────────────────────────────────────
  useEffect(() => {
    fetchTrees()
      .then(setTrees)
      .catch(() => setError('Không thể tải dữ liệu cây. Vui lòng thử lại.'))
      .finally(() => setLoading(false));
  }, []);

  // ── Initialise Cesium viewer ─────────────────────────────────────────────
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

    // Fly to Da Nang on load
    viewer.camera.flyTo({
      destination: DA_NANG,
      duration: 1.5,
    });

    viewerRef.current = viewer;

    return () => {
      // Clean up handler if it exists
      if (handlerRef.current && !handlerRef.current.isDestroyed()) {
        handlerRef.current.destroy();
        handlerRef.current = null;
      }
      // Clean up viewer
      if (!viewer.isDestroyed()) {
        viewer.destroy();
      }
      viewerRef.current = null;
    };
  }, []);

  // ── Render / re-render markers whenever trees or filters change ──────────
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    viewer.entities.removeAll();

    const visible = trees.filter((t) => activeFilters.has(t.health_status));

    for (const tree of visible) {
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
        // Store tree data for click handler
        properties: { treeId: tree.id } as unknown as Record<string, unknown>,
      });
    }
  }, [trees, activeFilters]);

  // ── Click handler to select a tree ──────────────────────────────────────
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    // Destroy previous handler if it exists and isn't already destroyed
    if (handlerRef.current && !handlerRef.current.isDestroyed()) {
      handlerRef.current.destroy();
    }

    const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);

    handler.setInputAction((movement: { position: Cartesian2 }) => {
      const picked = viewer.scene.pick(movement.position);
      if (defined(picked) && picked.id) {
        const entity = picked.id;
        const treeId = Number(entity.id);
        const found = trees.find((t) => t.id === treeId) ?? null;
        setSelectedTree(found);
      } else {
        setSelectedTree(null);
      }
    }, ScreenSpaceEventType.LEFT_CLICK);

    handlerRef.current = handler;
    return () => {
      if (!handler.isDestroyed()) handler.destroy();
    };
  }, [trees]);

  // ── Toggle health filter ─────────────────────────────────────────────────
  const toggleFilter = useCallback((status: HealthStatus) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      next.has(status) ? next.delete(status) : next.add(status);
      return next;
    });
  }, []);

  function handleLogout() {
    signOut();
    navigate('/login', { replace: true });
  }

  const visibleCount = trees.filter((t) => activeFilters.has(t.health_status)).length;

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white overflow-hidden">
      {/* ── Top bar ── */}
      <header className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <svg
            className="w-6 h-6 text-green-400"
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
          <span className="font-semibold text-sm">Quản Lý Cây Xanh</span>
          {!loading && (
            <span className="text-xs text-gray-400">
              {visibleCount}/{trees.length} cây
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">
            {user?.username}{' '}
            <span className="text-green-400">
              [{user?.roles.join(', ')}]
            </span>
          </span>
          <button
            onClick={handleLogout}
            className="text-xs px-3 py-1.5 rounded-md bg-gray-700 hover:bg-gray-600 transition"
          >
            Đăng xuất
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Sidebar ── */}
        <aside className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col shrink-0 overflow-y-auto">
          {/* Legend / filter */}
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Lọc theo tình trạng
            </h3>
            <div className="space-y-2">
              {HEALTH_STATUSES.map((status) => {
                const count = trees.filter((t) => t.health_status === status).length;
                const active = activeFilters.has(status);
                return (
                  <button
                    key={status}
                    onClick={() => toggleFilter(status)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition
                      ${active ? 'bg-gray-700' : 'bg-gray-800 opacity-50'}`}
                  >
                    <span
                      className={`w-3 h-3 rounded-full shrink-0 ${HEALTH_TAILWIND[status]}`}
                    />
                    <span className="flex-1 text-left">{status}</span>
                    <span className="text-xs text-gray-400 font-mono">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected tree detail */}
          {selectedTree && (
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Chi tiết cây
                </h3>
                <button
                  onClick={() => setSelectedTree(null)}
                  className="text-gray-500 hover:text-gray-300 text-lg leading-none"
                  aria-label="Đóng"
                >
                  ×
                </button>
              </div>

              <div className="space-y-2 text-sm">
                <Row label="Mã cây" value={selectedTree.tree_code} />
                <Row
                  label="Loài"
                  value={selectedTree.species?.common_name ?? '—'}
                />
                <Row
                  label="Tên khoa học"
                  value={
                    <em className="text-gray-400">
                      {selectedTree.species?.scientific_name ?? '—'}
                    </em>
                  }
                />
                <Row
                  label="Khu vực"
                  value={selectedTree.area?.area_name ?? '—'}
                />
                <Row
                  label="Tình trạng"
                  value={
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium text-white
                        ${HEALTH_TAILWIND[selectedTree.health_status]}`}
                    >
                      {selectedTree.health_status}
                    </span>
                  }
                />
                {selectedTree.height_m && (
                  <Row label="Chiều cao" value={`${selectedTree.height_m} m`} />
                )}
                {selectedTree.trunk_diameter_cm && (
                  <Row
                    label="Đường kính thân"
                    value={`${selectedTree.trunk_diameter_cm} cm`}
                  />
                )}
                {selectedTree.planting_year && (
                  <Row label="Năm trồng" value={String(selectedTree.planting_year)} />
                )}
                <Row
                  label="Tọa độ"
                  value={
                    <span className="font-mono text-xs text-gray-400">
                      {selectedTree.location.coordinates[1].toFixed(5)},{' '}
                      {selectedTree.location.coordinates[0].toFixed(5)}
                    </span>
                  }
                />
              </div>
            </div>
          )}

          {/* Empty state */}
          {!selectedTree && !loading && trees.length > 0 && (
            <div className="p-4 text-xs text-gray-500 text-center mt-2">
              Nhấp vào một điểm trên bản đồ để xem chi tiết
            </div>
          )}
        </aside>

        {/* ── Map container ── */}
        <main className="flex-1 relative">
          {/* Loading overlay */}
          {loading && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-gray-900/80">
              <div className="flex flex-col items-center gap-3">
                <svg
                  className="animate-spin h-8 w-8 text-green-400"
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
                <span className="text-sm text-gray-300">Đang tải dữ liệu cây...</span>
              </div>
            </div>
          )}

          {/* Error banner */}
          {error && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-lg bg-red-600 text-white text-sm shadow-lg">
              {error}
            </div>
          )}

          {/* Empty state banner */}
          {!loading && !error && trees.length === 0 && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-lg bg-yellow-600 text-white text-sm shadow-lg">
              Chưa có cây nào trong cơ sở dữ liệu. Hãy thêm cây qua API.
            </div>
          )}

          {/* Cesium mount point */}
          <div ref={cesiumContainer} className="w-full h-full" />
        </main>
      </div>
    </div>
  );
}

// ── Small helper component ───────────────────────────────────────────────────
function Row({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-gray-400 shrink-0">{label}</span>
      <span className="text-right text-gray-100 break-all">{value}</span>
    </div>
  );
}
