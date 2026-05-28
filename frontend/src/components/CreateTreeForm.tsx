import { useState, useEffect, type FormEvent } from 'react';
import { createTree, fetchTreeSpecies, fetchAdministrativeAreas } from '../api/trees';
import type { CreateTreePayload, TreeSpecies, AdministrativeArea, Tree, HealthStatus } from '../types';
import MapPicker from './MapPicker';

interface CreateTreeFormProps {
  onSuccess: (tree: Tree) => void;
  onCancel: () => void;
}

export default function CreateTreeForm({ onSuccess, onCancel }: CreateTreeFormProps) {
  const [species, setSpecies] = useState<TreeSpecies[]>([]);
  const [areas, setAreas] = useState<AdministrativeArea[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateTreePayload>({
    tree_code: '',
    species_id: 0,
    area_id: 0,
    latitude: 0,
    longitude: 0,
    planting_year: undefined,
    height_m: undefined,
    trunk_diameter_cm: undefined,
    canopy_diameter_m: undefined,
    tilt_degree: undefined,
    health_status: undefined,
  });

  useEffect(() => {
    async function loadData() {
      try {
        const [speciesData, areasData] = await Promise.all([
          fetchTreeSpecies(),
          fetchAdministrativeAreas(),
        ]);
        setSpecies(speciesData);
        setAreas(areasData);
      } catch (err) {
        setError('Không thể tải dữ liệu loài cây và khu vực');
      }
    }
    loadData();
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Build payload, excluding undefined optional fields
      const payload: CreateTreePayload = {
        tree_code: formData.tree_code,
        species_id: formData.species_id,
        area_id: formData.area_id,
        latitude: formData.latitude,
        longitude: formData.longitude,
      };

      if (formData.qr_code) payload.qr_code = formData.qr_code;
      if (formData.planting_year) payload.planting_year = formData.planting_year;
      if (formData.height_m) payload.height_m = formData.height_m;
      if (formData.trunk_diameter_cm) payload.trunk_diameter_cm = formData.trunk_diameter_cm;
      if (formData.canopy_diameter_m) payload.canopy_diameter_m = formData.canopy_diameter_m;
      if (formData.tilt_degree !== undefined) payload.tilt_degree = formData.tilt_degree;
      if (formData.health_status) payload.health_status = formData.health_status;

      const createdTree = await createTree(payload);
      onSuccess(createdTree);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Không thể tạo cây. Vui lòng thử lại.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof CreateTreePayload, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleLocationPick = (lat: number, lng: number) => {
    setFormData((prev) => ({
      ...prev,
      latitude: parseFloat(lat.toFixed(6)),
      longitude: parseFloat(lng.toFixed(6)),
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-gray-900 p-6 rounded-lg border border-gray-800">
      <h2 className="text-xl font-semibold text-white mb-4">Tạo cây mới</h2>

      {error && (
        <div className="bg-red-900/20 border border-red-800 text-red-400 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Tree Code - Required */}
        <div>
          <label htmlFor="tree_code" className="block text-sm font-medium text-gray-300 mb-1">
            Mã cây <span className="text-red-500">*</span>
          </label>
          <input
            id="tree_code"
            type="text"
            required
            value={formData.tree_code}
            onChange={(e) => handleInputChange('tree_code', e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-green-600"
            placeholder="VD: TREE-001"
          />
        </div>

        {/* QR Code - Optional */}
        <div>
          <label htmlFor="qr_code" className="block text-sm font-medium text-gray-300 mb-1">
            Mã QR
          </label>
          <input
            id="qr_code"
            type="text"
            value={formData.qr_code || ''}
            onChange={(e) => handleInputChange('qr_code', e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-green-600"
            placeholder="Tùy chọn"
          />
        </div>

        {/* Species - Required */}
        <div>
          <label htmlFor="species_id" className="block text-sm font-medium text-gray-300 mb-1">
            Loài cây <span className="text-red-500">*</span>
          </label>
          <select
            id="species_id"
            required
            value={formData.species_id}
            onChange={(e) => handleInputChange('species_id', parseInt(e.target.value))}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-green-600"
          >
            <option value={0}>-- Chọn loài cây --</option>
            {species.map((s) => (
              <option key={s.id} value={s.id}>
                {s.common_name}
              </option>
            ))}
          </select>
        </div>

        {/* Area - Required */}
        <div>
          <label htmlFor="area_id" className="block text-sm font-medium text-gray-300 mb-1">
            Khu vực <span className="text-red-500">*</span>
          </label>
          <select
            id="area_id"
            required
            value={formData.area_id}
            onChange={(e) => handleInputChange('area_id', parseInt(e.target.value))}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-green-600"
          >
            <option value={0}>-- Chọn khu vực --</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.area_name}
              </option>
            ))}
          </select>
        </div>

        {/* Latitude - Required */}
        <div>
          <label htmlFor="latitude" className="block text-sm font-medium text-gray-300 mb-1">
            Vĩ độ (Latitude) <span className="text-red-500">*</span>
          </label>
          <input
            id="latitude"
            type="number"
            step="any"
            required
            min={-90}
            max={90}
            value={formData.latitude || ''}
            onChange={(e) => handleInputChange('latitude', parseFloat(e.target.value))}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-green-600"
            placeholder="VD: 16.0544"
          />
        </div>

        {/* Longitude - Required */}
        <div>
          <label htmlFor="longitude" className="block text-sm font-medium text-gray-300 mb-1">
            Kinh độ (Longitude) <span className="text-red-500">*</span>
          </label>
          <input
            id="longitude"
            type="number"
            step="any"
            required
            min={-180}
            max={180}
            value={formData.longitude || ''}
            onChange={(e) => handleInputChange('longitude', parseFloat(e.target.value))}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-green-600"
            placeholder="VD: 108.2022"
          />
        </div>

        {/* Planting Year - Optional */}
        <div>
          <label htmlFor="planting_year" className="block text-sm font-medium text-gray-300 mb-1">
            Năm trồng
          </label>
          <input
            id="planting_year"
            type="number"
            min={1900}
            max={2100}
            value={formData.planting_year || ''}
            onChange={(e) => handleInputChange('planting_year', e.target.value ? parseInt(e.target.value) : undefined)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-green-600"
            placeholder="VD: 2020"
          />
        </div>

        {/* Height - Optional */}
        <div>
          <label htmlFor="height_m" className="block text-sm font-medium text-gray-300 mb-1">
            Chiều cao (m)
          </label>
          <input
            id="height_m"
            type="number"
            step="0.1"
            min={0}
            value={formData.height_m || ''}
            onChange={(e) => handleInputChange('height_m', e.target.value ? parseFloat(e.target.value) : undefined)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-green-600"
            placeholder="VD: 5.5"
          />
        </div>

        {/* Trunk Diameter - Optional */}
        <div>
          <label htmlFor="trunk_diameter_cm" className="block text-sm font-medium text-gray-300 mb-1">
            Đường kính thân (cm)
          </label>
          <input
            id="trunk_diameter_cm"
            type="number"
            step="0.1"
            min={0}
            value={formData.trunk_diameter_cm || ''}
            onChange={(e) => handleInputChange('trunk_diameter_cm', e.target.value ? parseFloat(e.target.value) : undefined)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-green-600"
            placeholder="VD: 30"
          />
        </div>

        {/* Canopy Diameter - Optional */}
        <div>
          <label htmlFor="canopy_diameter_m" className="block text-sm font-medium text-gray-300 mb-1">
            Đường kính tán (m)
          </label>
          <input
            id="canopy_diameter_m"
            type="number"
            step="0.1"
            min={0}
            value={formData.canopy_diameter_m || ''}
            onChange={(e) => handleInputChange('canopy_diameter_m', e.target.value ? parseFloat(e.target.value) : undefined)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-green-600"
            placeholder="VD: 4.5"
          />
        </div>

        {/* Tilt Degree - Optional */}
        <div>
          <label htmlFor="tilt_degree" className="block text-sm font-medium text-gray-300 mb-1">
            Độ nghiêng (°)
          </label>
          <input
            id="tilt_degree"
            type="number"
            min={0}
            max={90}
            value={formData.tilt_degree ?? ''}
            onChange={(e) => handleInputChange('tilt_degree', e.target.value ? parseInt(e.target.value) : undefined)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-green-600"
            placeholder="VD: 15"
          />
        </div>

        {/* Health Status - Optional */}
        <div>
          <label htmlFor="health_status" className="block text-sm font-medium text-gray-300 mb-1">
            Tình trạng sức khỏe
          </label>
          <select
            id="health_status"
            value={formData.health_status || ''}
            onChange={(e) => handleInputChange('health_status', e.target.value as HealthStatus || undefined)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-green-600"
          >
            <option value="">-- Chọn tình trạng --</option>
            <option value="Tốt">Tốt</option>
            <option value="Yếu">Yếu</option>
            <option value="Sâu bệnh">Sâu bệnh</option>
            <option value="Chết">Chết</option>
          </select>
        </div>
      </div>

      {/* Interactive Map Picker */}
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Chọn vị trí trên bản đồ <span className="text-red-500">*</span>
        </label>
        <MapPicker
          latitude={formData.latitude}
          longitude={formData.longitude}
          onLocationPick={handleLocationPick}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Đang tạo...' : 'Tạo cây'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-6 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 disabled:opacity-50 transition-colors"
        >
          Hủy
        </button>
      </div>
    </form>
  );
}
