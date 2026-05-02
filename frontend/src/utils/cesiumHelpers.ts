import type { HealthStatus } from '../types';
import { Color } from 'cesium';

/**
 * Returns a Cesium Color for a given health status.
 * Tốt      → green
 * Yếu      → yellow
 * Sâu bệnh → orange
 * Chết     → red
 */
export function healthColor(status: HealthStatus): Color {
  switch (status) {
    case 'Tốt':
      return Color.fromCssColorString('#22c55e'); // green-500
    case 'Yếu':
      return Color.fromCssColorString('#eab308'); // yellow-500
    case 'Sâu bệnh':
      return Color.fromCssColorString('#f97316'); // orange-500
    case 'Chết':
      return Color.fromCssColorString('#ef4444'); // red-500
    default:
      return Color.GRAY;
  }
}

/** Human-readable Vietnamese label for each status */
export const HEALTH_LABELS: Record<HealthStatus, string> = {
  'Tốt': 'Tốt',
  'Yếu': 'Yếu',
  'Sâu bệnh': 'Sâu bệnh',
  'Chết': 'Chết',
};

/** Tailwind bg class for legend badges */
export const HEALTH_TAILWIND: Record<HealthStatus, string> = {
  'Tốt': 'bg-green-500',
  'Yếu': 'bg-yellow-500',
  'Sâu bệnh': 'bg-orange-500',
  'Chết': 'bg-red-500',
};
