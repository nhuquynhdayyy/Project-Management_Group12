import { useState, useEffect } from 'react';
import { findTreesNearby, type NearbyTree } from '../../api/trees';
import Modal from '../../components/Modal';
import CreateTaskForm from '../../components/CreateTaskForm';

const RADIUS_OPTIONS = [50, 100, 200, 500, 1000];

export default function NearbyTreesPage() {
  const [trees, setTrees] = useState<NearbyTree[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedRadius, setSelectedRadius] = useState(200);
  const [selectedTree, setSelectedTree] = useState<NearbyTree | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const getCurrentLocation = () => {
    setLocationStatus('loading');
    setError(null);

    if (!navigator.geolocation) {
      setError('Trình duyệt không hỗ trợ định vị GPS');
      setLocationStatus('error');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        setLocationStatus('success');
        // Tự động tìm kiếm sau khi có vị trí
        searchNearbyTrees(latitude, longitude, selectedRadius);
      },
      (err) => {
        let errorMessage = 'Không thể lấy vị trí hiện tại';
        switch (err.code) {
          case err.PERMISSION_DENIED:
            errorMessage = 'Bạn đã từ chối quyền truy cập vị trí. Vui lòng bật GPS trong cài đặt trình duyệt.';
            break;
          case err.POSITION_UNAVAILABLE:
            errorMessage = 'Thông tin vị trí không khả dụng';
            break;
          case err.TIMEOUT:
            errorMessage = 'Yêu cầu lấy vị trí đã hết thời gian chờ';
            break;
        }
        setError(errorMessage);
        setLocationStatus('error');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const searchNearbyTrees = async (lat: number, lng: number, radius: number) => {
    setLoading(true);
    setError(null);
    try {
      const results = await findTreesNearby(lat, lng, radius);
      setTrees(results);
      if (results.length === 0) {
        setError(`Không tìm thấy cây nào trong bán kính ${radius}m`);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể tải danh sách cây xung quanh');
    } finally {
      setLoading(false);
    }
  };

  const handleRadiusChange = (radius: number) => {
    setSelectedRadius(radius);
    if (userLocation) {
      searchNearbyTrees(userLocation.lat, userLocation.lng, radius);
    }
  };

  const handleRefreshLocation = () => {
    getCurrentLocation();
  };

  const handleTreeClick = (tree: NearbyTree) => {
    setSelectedTree(tree);
  };

  const handleCreateTask = () => {
    if (selectedTree) {
      setShowTaskModal(true);
    }
  };

  const handleCloseTaskModal = () => {
    setShowTaskModal(false);
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'Tốt':
        return 'bg-green-100 text-green-800';
      case 'Yếu':
        return 'bg-yellow-100 text-yellow-800';
      case 'Sâu bệnh':
        return 'bg-orange-100 text-orange-800';
      case 'Chết':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  useEffect(() => {
    // Tự động lấy vị trí khi component mount
    getCurrentLocation();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header - Fixed */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="px-4 py-4">
          <h1 className="text-xl font-bold text-gray-900">Tìm cây xung quanh</h1>
          <p className="text-sm text-gray-600 mt-1">
            {locationStatus === 'success' && userLocation
              ? `Vị trí: ${userLocation.lat.toFixed(6)}, ${userLocation.lng.toFixed(6)}`
              : 'Đang lấy vị trí...'}
          </p>
        </div>

        {/* Radius Selector */}
        <div className="px-4 pb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Bán kính tìm kiếm
          </label>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {RADIUS_OPTIONS.map((radius) => (
              <button
                key={radius}
                onClick={() => handleRadiusChange(radius)}
                disabled={!userLocation || loading}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedRadius === radius
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {radius}m
              </button>
            ))}
          </div>
        </div>

        {/* Refresh Button */}
        <div className="px-4 pb-4">
          <button
            onClick={handleRefreshLocation}
            disabled={locationStatus === 'loading'}
            className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            <svg
              className={`w-5 h-5 ${locationStatus === 'loading' ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {locationStatus === 'loading' ? 'Đang lấy vị trí...' : 'Làm mới vị trí'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4">
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-gray-600 mt-2">Đang tìm kiếm...</p>
          </div>
        )}

        {/* Results Count */}
        {!loading && trees.length > 0 && (
          <div className="mb-4 text-sm text-gray-600">
            Tìm thấy <span className="font-semibold text-gray-900">{trees.length}</span> cây trong bán kính {selectedRadius}m
          </div>
        )}

        {/* Tree List */}
        {!loading && trees.length > 0 && (
          <div className="space-y-3">
            {trees.map((tree) => (
              <div
                key={tree.id}
                onClick={() => handleTreeClick(tree)}
                className={`bg-white rounded-lg shadow-sm border-2 p-4 cursor-pointer transition-all ${
                  selectedTree?.id === tree.id
                    ? 'border-blue-500 shadow-md'
                    : 'border-transparent hover:border-gray-300'
                }`}
              >
                {/* Tree Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-lg">
                      {tree.tree_code}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {tree.species?.common_name || 'Không rõ loài'}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-blue-600 font-bold text-lg">
                      {tree.distance}m
                    </div>
                    <div className="text-xs text-gray-500">khoảng cách</div>
                  </div>
                </div>

                {/* Tree Details */}
                <div className="space-y-2 mt-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${getHealthStatusColor(
                        tree.health_status
                      )}`}
                    >
                      {tree.health_status}
                    </span>
                  </div>

                  {tree.area && (
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Khu vực:</span> {tree.area.area_name}
                    </div>
                  )}

                  {tree.height_m && (
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Chiều cao:</span> {tree.height_m}m
                    </div>
                  )}
                </div>

                {/* Action Hint */}
                {selectedTree?.id === tree.id && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCreateTask();
                      }}
                      className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                      Tạo nhiệm vụ bảo trì
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && trees.length === 0 && locationStatus === 'success' && (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
              />
            </svg>
            <p className="text-gray-600 mt-4">Không tìm thấy cây nào xung quanh</p>
            <p className="text-sm text-gray-500 mt-2">Thử tăng bán kính tìm kiếm</p>
          </div>
        )}
      </div>

      {/* Task Creation Modal */}
      {showTaskModal && selectedTree && (
        <Modal isOpen={showTaskModal} onClose={handleCloseTaskModal} title="Tạo nhiệm vụ bảo trì">
          <CreateTaskForm
            treeId={selectedTree.id}
            onSuccess={() => {
              handleCloseTaskModal();
              setSelectedTree(null);
            }}
            onCancel={handleCloseTaskModal}
          />
        </Modal>
      )}
    </div>
  );
}
