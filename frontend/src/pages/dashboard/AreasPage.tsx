import { useEffect, useState, useMemo } from 'react';
import { fetchAreas } from '../../api/trees';
import { fetchTrees } from '../../api/trees';
import { createArea, updateArea, deleteArea } from '../../api/areas';
import type { AdministrativeArea, Tree } from '../../types';

interface AreaWithCount extends AdministrativeArea {
  treeCount: number;
}

export default function AreasPage() {
  const [areas, setAreas] = useState<AdministrativeArea[]>([]);
  const [trees, setTrees] = useState<Tree[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedArea, setSelectedArea] = useState<AdministrativeArea | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [formData, setFormData] = useState({ name: '' });
  const [editingArea, setEditingArea] = useState<AdministrativeArea | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [areasData, treesData] = await Promise.all([fetchAreas(), fetchTrees()]);
      setAreas(areasData);
      setTrees(treesData);
      setError('');
    } catch (err) {
      setError('Không thể tải dữ liệu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }

  const areasWithCount = useMemo<AreaWithCount[]>(() => {
    return areas.map((area) => ({
      ...area,
      treeCount: trees.filter((tree) => tree.area_id === area.id).length,
    }));
  }, [areas, trees]);

  const filteredAreas = useMemo(() => {
    if (!searchQuery) return areasWithCount;
    return areasWithCount.filter((area) =>
      area.area_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [areasWithCount, searchQuery]);

  const selectedAreaTrees = useMemo(() => {
    if (!selectedArea) return [];
    return trees.filter((tree) => tree.area_id === selectedArea.id);
  }, [selectedArea, trees]);

  function openCreateModal() {
    setModalMode('create');
    setFormData({ name: '' });
    setEditingArea(null);
    setShowModal(true);
  }

  function openEditModal(area: AdministrativeArea) {
    setModalMode('edit');
    setFormData({ name: area.area_name });
    setEditingArea(area);
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (modalMode === 'create') {
        await createArea(formData);
      } else if (editingArea) {
        await updateArea(editingArea.id, formData);
      }
      await loadData();
      setShowModal(false);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra');
    }
  }

  async function handleDelete(area: AdministrativeArea) {
    if (!confirm(`Bạn có chắc muốn xóa "${area.area_name}"?`)) return;
    try {
      await deleteArea(area.id);
      await loadData();
      if (selectedArea?.id === area.id) {
        setSelectedArea(null);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể xóa khu vực');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-950">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin mb-2"></div>
          <p className="text-gray-400">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-950">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 text-red-500">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-950">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-800 bg-gradient-to-r from-gray-900 to-gray-950">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <span className="text-3xl"></span>
              Quản lý Phường/Xã
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Quản lý {areas.length} phường/xã với {trees.length} cây xanh
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-all flex items-center gap-2 shadow-lg hover:shadow-green-600/20"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Thêm phường/xã
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Left: Areas list */}
        <div className="w-80 border-r border-gray-800 flex flex-col">{/* Changed from w-2/5 to w-80 (320px) */}
          {/* Search */}
          <div className="p-3 border-b border-gray-800">
            <div className="relative">
              <input
                type="text"
                placeholder="Tìm kiếm..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600"
              />
              <svg className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Areas list */}
          <div className="flex-1 overflow-y-auto p-3 scrollbar-hide">
            {filteredAreas.length > 0 ? (
              <div className="space-y-1.5">
                {filteredAreas.map((area) => (
                  <div
                    key={area.id}
                    className={`group p-3 rounded-lg cursor-pointer transition-all ${
                      selectedArea?.id === area.id
                        ? 'bg-green-600/20 border-2 border-green-600 shadow-lg'
                        : 'bg-gray-900 border-2 border-transparent hover:border-gray-700 hover:bg-gray-800'
                    }`}
                    onClick={() => setSelectedArea(area)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-lg">🏘️</span>
                          <h3 className={`text-sm font-semibold truncate ${
                            selectedArea?.id === area.id ? 'text-green-400' : 'text-white'
                          }`}>
                            {area.area_name}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="flex items-center gap-1 text-gray-400">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3C8 3 5 6.5 5 10c0 2.5 1.3 4.7 3.3 6L8 20h8l-.3-4C17.7 14.7 19 12.5 19 10c0-3.5-3-7-7-7z" />
                            </svg>
                            <span className="font-medium">{area.treeCount}</span> cây
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(area);
                          }}
                          className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
                          title="Sửa"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(area);
                          }}
                          className="p-1.5 hover:bg-red-600/20 rounded text-gray-400 hover:text-red-400 transition-colors"
                          title="Xóa"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <svg className="w-16 h-16 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p>Không tìm thấy phường/xã nào</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Tree list */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-950">
          {selectedArea ? (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-2">
                  <span className="text-2xl">🌳</span>
                  Danh sách cây tại {selectedArea.area_name}
                </h2>
                <p className="text-sm text-gray-400">
                  Tổng cộng {selectedAreaTrees.length} cây xanh
                </p>
              </div>

              {selectedAreaTrees.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {selectedAreaTrees.map((tree) => (
                    <div key={tree.id} className="p-4 bg-gray-900 rounded-lg border border-gray-800 hover:border-gray-700 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="font-semibold text-white mb-1">{tree.tree_code}</p>
                          <p className="text-sm text-gray-400">{tree.species?.common_name}</p>
                        </div>
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                            tree.health_status === 'Tốt'
                              ? 'bg-green-600/20 text-green-400'
                              : tree.health_status === 'Yếu'
                              ? 'bg-yellow-600/20 text-yellow-400'
                              : tree.health_status === 'Sâu bệnh'
                              ? 'bg-orange-600/20 text-orange-400'
                              : 'bg-red-600/20 text-red-400'
                          }`}
                        >
                          {tree.health_status}
                        </span>
                      </div>
                      {tree.height_m && (
                        <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                          <span>Cao: {tree.height_m}m</span>
                          {tree.trunk_diameter_cm && <span>Đường kính: {tree.trunk_diameter_cm}cm</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                  <svg className="w-20 h-20 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3C8 3 5 6.5 5 10c0 2.5 1.3 4.7 3.3 6L8 20h8l-.3-4C17.7 14.7 19 12.5 19 10c0-3.5-3-7-7-7z" />
                  </svg>
                  <p className="text-lg">Chưa có cây nào trong khu vực này</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <svg className="w-24 h-24 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="text-lg">Chọn một phường/xã để xem danh sách cây</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl shadow-2xl w-full max-w-md border border-gray-800">
            <div className="px-6 py-4 border-b border-gray-800">
              <h2 className="text-xl font-bold text-white">
                {modalMode === 'create' ? '➕ Thêm phường/xã mới' : '✏️ Sửa phường/xã'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6">
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Tên phường/xã <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ name: e.target.value })}
                  placeholder="VD: Phường Hòa Khánh Bắc"
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/20"
                  required
                  autoFocus
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium shadow-lg hover:shadow-green-600/20"
                >
                  {modalMode === 'create' ? 'Tạo' : 'Lưu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
