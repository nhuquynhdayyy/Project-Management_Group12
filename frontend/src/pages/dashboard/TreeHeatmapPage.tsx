import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Viewer,
  Cartesian3,
  Color,
  Ion,
  OpenStreetMapImageryProvider,
  createWorldImageryAsync,
  createWorldTerrainAsync,
  Entity,
  EllipsoidGeodesic,
  Cartographic,
} from 'cesium';

import { fetchTreeLocations, fetchAreas, fetchTreeSpecies, type TreeLocation } from '../../api/trees';
import type { AdministrativeArea, TreeSpecies } from '../../types';

const CESIUM_ION_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJhZmY2N2FlNS1iYjc1LTQ1OGMtOTVlYi0wZDJiOGIzODVjNTEiLCJpZCI6NDEyMDM5LCJpYXQiOjE3NzUwMDY0Nzh9.Bq4bXnvHmboOY9-hdWbzc5mo1CQOGxQTHl_h2DX26_A';

// Liên Chiểu district, Da Nang
const LIEN_CHIEU = Cartesian3.fromDegrees(108.145, 16.09, 8000);

// Cấu hình màu sắc heatmap (từ xanh dương -> vàng -> đỏ)
const HEATMAP_COLORS = [
  { threshold: 0, color: Color.fromCssColorString('#0000FF').withAlpha(0.0) }, // Trong suốt
  { threshold: 0.2, color: Color.fromCssColorString('#00FFFF').withAlpha(0.3) }, // Xanh dương nhạt
  { threshold: 0.4, color: Color.fromCssColorString('#00FF00').withAlpha(0.5) }, // Xanh lá
  { threshold: 0.6, color: Color.fromCssColorString('#FFFF00').withAlpha(0.6) }, // Vàng
  { threshold: 0.8, color: Color.fromCssColorString('#FF8800').withAlpha(0.7) }, // Cam
  { threshold: 1.0, color: Color.fromCssColorString('#FF0000').withAlpha(0.8) }, // Đỏ
];

export default function TreeHeatmapPage() {
  const cesiumContainer = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);

  const [locations, setLocations] = useState<TreeLocation[]>([]);
  const [areas, setAreas] = useState<AdministrativeArea[]>([]);
  const [species, setSpecies] = useState<TreeSpecies[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters
  const [selectedAreaId, setSelectedAreaId] = useState<number | undefined>();
  const [selectedSpeciesId, setSelectedSpeciesId] = useState<number | undefined>();
  const [radius, setRadius] = useState(500); // Bán kính ảnh hưởng (mét)
  const [useOSM, setUseOSM] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(true);

  // ── Load initial data ────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      fetchTreeLocations(),
      fetchAreas(),
      fetchTreeSpecies(),
    ])
      .then(([locs, areasData, speciesData]) => {
        setLocations(locs);
        setAreas(areasData);
        setSpecies(speciesData);
      })
      .catch(() => setError('Không thể tải dữ liệu. Vui lòng thử lại.'))
      .finally(() => setLoading(false));
  }, []);

  // ── Reload locations when filters change ────────────────────────────────
  useEffect(() => {
    if (loading) return;
    
    setLoading(true);
    fetchTreeLocations(selectedAreaId, selectedSpeciesId)
      .then(setLocations)
      .catch(() => setError('Không thể tải dữ liệu. Vui lòng thử lại.'))
      .finally(() => setLoading(false));
  }, [selectedAreaId, selectedSpeciesId]);

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

    // Enable 3D terrain
    createWorldTerrainAsync().then((terrainProvider) => {
      viewer.terrainProvider = terrainProvider;
    });

    viewer.camera.flyTo({ destination: LIEN_CHIEU, duration: 1.5 });
    viewerRef.current = viewer;

    return () => {
      if (!viewer.isDestroyed()) viewer.destroy();
      viewerRef.current = null;
    };
  }, []);

  // ── Handle layer switching ───────────────────────────────────────────────
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    const layers = viewer.imageryLayers;
    layers.removeAll();

    if (useOSM) {
      const osmProvider = new OpenStreetMapImageryProvider({
        url: 'https://tile.openstreetmap.org/',
      });
      layers.addImageryProvider(osmProvider);
    } else {
      createWorldImageryAsync().then((imageryProvider) => {
        layers.addImageryProvider(imageryProvider);
      });
    }
  }, [useOSM]);

  // ── Render heatmap ───────────────────────────────────────────────────────
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !showHeatmap) {
      if (viewer) viewer.entities.removeAll();
      return;
    }

    viewer.entities.removeAll();

    if (locations.length === 0) return;

    // Tạo grid heatmap
    const heatmapData = calculateHeatmapGrid(locations, radius);
    
    // Render heatmap circles
    heatmapData.forEach((point) => {
      const intensity = point.intensity;
      const color = getHeatmapColor(intensity);
      
      viewer.entities.add({
        position: Cartesian3.fromDegrees(point.longitude, point.latitude),
        ellipse: {
          semiMinorAxis: radius,
          semiMajorAxis: radius,
          material: color,
          heightReference: 1, // CLAMP_TO_GROUND
        },
      } as Entity.ConstructorOptions);
    });
  }, [locations, radius, showHeatmap]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleRadiusChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setRadius(Number(e.target.value));
  }, []);

  const handleAreaChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedAreaId(value ? Number(value) : undefined);
  }, []);

  const handleSpeciesChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedSpeciesId(value ? Number(value) : undefined);
  }, []);

  return (
    <div className="flex h-full bg-gray-900 text-white overflow-hidden">
      {/* ── Control panel ── */}
      <aside className="w-72 shrink-0 flex flex-col bg-gray-800 border-r border-gray-700 overflow-y-auto">
        {/* Header */}
        <div className="px-4 py-4 border-b border-gray-700">
          <h2 className="text-lg font-bold text-white">Bản đồ nhiệt mật độ cây</h2>
          <p className="text-xs text-gray-400 mt-1">
            Hiển thị <span className="text-white font-semibold">{locations.length}</span> cây
          </p>
        </div>

        {/* Heatmap toggle */}
        <div className="p-4 border-b border-gray-700">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={showHeatmap}
              onChange={(e) => setShowHeatmap(e.target.checked)}
              className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-green-600 focus:ring-green-500"
            />
            <span className="text-sm font-medium">Hiển thị lớp nhiệt</span>
          </label>
        </div>

        {/* Radius control */}
        <div className="p-4 border-b border-gray-700">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Bán kính ảnh hưởng
          </h3>
          <div className="space-y-2">
            <input
              type="range"
              min="100"
              max="2000"
              step="50"
              value={radius}
              onChange={handleRadiusChange}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-600"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>100m</span>
              <span className="text-white font-semibold">{radius}m</span>
              <span>2000m</span>
            </div>
          </div>
        </div>

        {/* Area filter */}
        <div className="p-4 border-b border-gray-700">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Lọc theo khu vực
          </h3>
          <select
            value={selectedAreaId ?? ''}
            onChange={handleAreaChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">Tất cả khu vực</option>
            {areas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.area_name}
              </option>
            ))}
          </select>
        </div>

        {/* Species filter */}
        <div className="p-4 border-b border-gray-700">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Lọc theo loài cây
          </h3>
          <select
            value={selectedSpeciesId ?? ''}
            onChange={handleSpeciesChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">Tất cả loài</option>
            {species.map((sp) => (
              <option key={sp.id} value={sp.id}>
                {sp.common_name}
              </option>
            ))}
          </select>
        </div>

        {/* Legend */}
        <div className="p-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Chú giải mật độ
          </h3>
          <div className="space-y-2">
            <LegendItem color="#0000FF" label="Rất thưa" opacity={0.3} />
            <LegendItem color="#00FFFF" label="Thưa" opacity={0.4} />
            <LegendItem color="#00FF00" label="Trung bình" opacity={0.5} />
            <LegendItem color="#FFFF00" label="Dày" opacity={0.6} />
            <LegendItem color="#FF8800" label="Rất dày" opacity={0.7} />
            <LegendItem color="#FF0000" label="Cực dày" opacity={0.8} />
          </div>
        </div>
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
        
        {/* Layer Switcher */}
        <div className="absolute top-4 right-4 z-10 flex gap-2 bg-gray-900/90 rounded-lg p-1.5 shadow-lg">
          <button
            onClick={() => setUseOSM(false)}
            className={`px-4 py-2 text-sm font-medium rounded transition ${
              !useOSM
                ? 'bg-green-600 text-white shadow-md'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
            title="Chuyển sang lớp vệ tinh"
          >
            🛰️ Vệ tinh
          </button>
          <button
            onClick={() => setUseOSM(true)}
            className={`px-4 py-2 text-sm font-medium rounded transition ${
              useOSM
                ? 'bg-green-600 text-white shadow-md'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
            title="Chuyển sang bản đồ đường phố"
          >
            🗺️ Bản đồ
          </button>
        </div>
        
        <div ref={cesiumContainer} className="w-full h-full" />
      </div>
    </div>
  );
}

function LegendItem({ color, label, opacity }: { color: string; label: string; opacity: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="w-6 h-4 rounded border border-gray-600"
        style={{ backgroundColor: color, opacity }}
      />
      <span className="text-sm text-gray-300">{label}</span>
    </div>
  );
}

/**
 * Tính toán grid heatmap dựa trên mật độ cây
 */
function calculateHeatmapGrid(
  locations: TreeLocation[],
  radius: number,
): Array<{ latitude: number; longitude: number; intensity: number }> {
  if (locations.length === 0) return [];

  // Tạo grid points từ các vị trí cây
  const gridPoints = new Map<string, { lat: number; lng: number; count: number }>();
  
  locations.forEach((loc) => {
    const key = `${loc.latitude.toFixed(4)},${loc.longitude.toFixed(4)}`;
    const existing = gridPoints.get(key);
    if (existing) {
      existing.count++;
    } else {
      gridPoints.set(key, { lat: loc.latitude, lng: loc.longitude, count: 1 });
    }
  });

  // Tính intensity cho mỗi điểm dựa trên số lượng cây xung quanh
  const result: Array<{ latitude: number; longitude: number; intensity: number }> = [];
  const maxCount = Math.max(...Array.from(gridPoints.values()).map((p) => p.count));

  gridPoints.forEach((point) => {
    // Tính số cây trong bán kính
    let nearbyCount = 0;
    locations.forEach((loc) => {
      const distance = calculateDistance(point.lat, point.lng, loc.latitude, loc.longitude);
      if (distance <= radius) {
        nearbyCount++;
      }
    });

    // Normalize intensity (0-1)
    const intensity = Math.min(nearbyCount / (maxCount * 2), 1);
    
    if (intensity > 0.05) { // Chỉ hiển thị nếu có mật độ đáng kể
      result.push({
        latitude: point.lat,
        longitude: point.lng,
        intensity,
      });
    }
  });

  return result;
}

/**
 * Tính khoảng cách giữa 2 điểm (mét)
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const start = Cartographic.fromDegrees(lng1, lat1);
  const end = Cartographic.fromDegrees(lng2, lat2);
  const geodesic = new EllipsoidGeodesic(start, end);
  return geodesic.surfaceDistance;
}

/**
 * Lấy màu heatmap dựa trên intensity
 */
function getHeatmapColor(intensity: number): Color {
  for (let i = HEATMAP_COLORS.length - 1; i >= 0; i--) {
    if (intensity >= HEATMAP_COLORS[i].threshold) {
      return HEATMAP_COLORS[i].color;
    }
  }
  return HEATMAP_COLORS[0].color;
}
