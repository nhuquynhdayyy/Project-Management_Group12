import { useEffect, useRef, useState } from 'react';
import {
  Viewer,
  Cartesian2,
  Cartesian3,
  Color,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  Ion,
  OpenStreetMapImageryProvider,
  createWorldImageryAsync,
  Entity,
} from 'cesium';

const CESIUM_ION_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJhZmY2N2FlNS1iYjc1LTQ1OGMtOTVlYi0wZDJiOGIzODVjNTEiLCJpZCI6NDEyMDM5LCJpYXQiOjE3NzUwMDY0Nzh9.Bq4bXnvHmboOY9-hdWbzc5mo1CQOGxQTHl_h2DX26_A';

const LIEN_CHIEU = Cartesian3.fromDegrees(108.145, 16.09, 15000);

interface MapPickerProps {
  latitude: number;
  longitude: number;
  onLocationPick: (lat: number, lng: number) => void;
}

export default function MapPicker({ latitude, longitude, onLocationPick }: MapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const handlerRef = useRef<ScreenSpaceEventHandler | null>(null);
  const markerRef = useRef<Entity | null>(null);
  const [useOSM, setUseOSM] = useState(false);

  // Initialize viewer
  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return;

    Ion.defaultAccessToken = CESIUM_ION_TOKEN;

    const viewer = new Viewer(containerRef.current, {
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
      terrainProvider: undefined, // Start without terrain for faster load
    });

    viewer.camera.flyTo({ destination: LIEN_CHIEU, duration: 0 });
    viewerRef.current = viewer;

    return () => {
      if (handlerRef.current && !handlerRef.current.isDestroyed()) {
        handlerRef.current.destroy();
      }
      if (!viewer.isDestroyed()) viewer.destroy();
      viewerRef.current = null;
    };
  }, []);

  // Handle layer switching
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

  // Update marker when coordinates change
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    if (markerRef.current) {
      viewer.entities.remove(markerRef.current);
    }

    if (latitude !== 0 && longitude !== 0) {
      const marker = viewer.entities.add({
        position: Cartesian3.fromDegrees(longitude, latitude),
        point: {
          pixelSize: 12,
          color: Color.RED,
          outlineColor: Color.WHITE,
          outlineWidth: 2,
          heightReference: 1, // CLAMP_TO_GROUND
        },
      });
      markerRef.current = marker;

      // Fly to marker
      viewer.camera.flyTo({
        destination: Cartesian3.fromDegrees(longitude, latitude, 5000),
        duration: 1,
      });
    }
  }, [latitude, longitude]);

  // Click handler to pick location
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    if (handlerRef.current && !handlerRef.current.isDestroyed()) {
      handlerRef.current.destroy();
    }

    const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction((movement: { position: Cartesian2 }) => {
      const cartesian = viewer.camera.pickEllipsoid(movement.position, viewer.scene.globe.ellipsoid);
      if (cartesian) {
        const cartographic = viewer.scene.globe.ellipsoid.cartesianToCartographic(cartesian);
        const lat = (cartographic.latitude * 180) / Math.PI;
        const lng = (cartographic.longitude * 180) / Math.PI;
        onLocationPick(lat, lng);
      }
    }, ScreenSpaceEventType.LEFT_CLICK);

    handlerRef.current = handler;
    return () => {
      if (!handler.isDestroyed()) handler.destroy();
    };
  }, [onLocationPick]);

  return (
    <div className="relative w-full h-64 rounded-lg overflow-hidden border border-gray-700">
      <div ref={containerRef} className="w-full h-full" />
      
      {/* Layer Switcher */}
      <div className="absolute top-2 right-2 z-10 flex gap-1 bg-gray-900/90 rounded-lg p-1 shadow-lg">
        <button
          onClick={() => setUseOSM(false)}
          className={`px-3 py-1.5 text-xs font-medium rounded transition ${
            !useOSM
              ? 'bg-green-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          Vệ tinh
        </button>
        <button
          onClick={() => setUseOSM(true)}
          className={`px-3 py-1.5 text-xs font-medium rounded transition ${
            useOSM
              ? 'bg-green-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          Bản đồ
        </button>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-2 left-2 z-10 bg-gray-900/90 px-3 py-1.5 rounded text-xs text-gray-300">
        Nhấp vào bản đồ để chọn vị trí
      </div>
    </div>
  );
}
