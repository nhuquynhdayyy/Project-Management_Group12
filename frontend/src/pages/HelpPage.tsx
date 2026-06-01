import { useMemo, useState } from 'react';

const GUIDES = [
  {
    title: 'Quản lý cây',
    body: 'Vào Quản lý Cây để thêm cây mới, nhập danh sách từ Excel, xem chi tiết cây, cập nhật sức khỏe, cập nhật số đo thực địa và tải mã QR của từng cây.',
  },
  {
    title: 'Thống kê cây theo độ tuổi',
    body: 'Vào Thống kê Cây, chọn khu vực cần xem. Biểu đồ độ tuổi chia cây theo các nhóm 0-5 năm, 6-10 năm, 11-20 năm, trên 20 năm và chưa rõ năm trồng.',
  },
  {
    title: 'Xuất Excel thống kê cây',
    body: 'Trong Thống kê Cây, nhấn Xuất Excel để tải file .xlsx. File xuất sẽ áp dụng khu vực đang chọn và có thể mở trực tiếp bằng Microsoft Excel.',
  },
  {
    title: 'Lập lịch bảo trì',
    body: 'Vào Lịch bảo trì để tạo công việc tưới nước, bón phân, cắt tỉa hoặc kiểm tra. Chọn cây hoặc khu vực, nhân viên phụ trách, ngày bắt đầu và tần suất lặp.',
  },
  {
    title: 'Theo dõi công việc',
    body: 'Nhân viên xem công việc được giao trong danh sách task, cập nhật trạng thái, hoàn thành tại hiện trường và đính kèm hình ảnh bằng chứng khi cần.',
  },
  {
    title: 'Thông báo',
    body: 'Nhấn biểu tượng chuông ở góc phải trên cùng để xem thông báo. Thông báo chưa đọc sẽ có số đếm và được đánh dấu đã đọc sau khi mở.',
  },
  {
    title: 'Đăng xuất',
    body: 'Nhấn nút Đăng xuất ở góc phải trên cùng hoặc cuối thanh bên để thoát tài khoản hiện tại và quay về màn hình đăng nhập.',
  },
];

export default function HelpPage() {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return GUIDES;
    return GUIDES.filter((item) => `${item.title} ${item.body}`.toLowerCase().includes(value));
  }, [query]);

  return (
    <div className="h-full overflow-y-auto bg-gray-950 px-6 py-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Hướng dẫn sử dụng</h1>
        <p className="mt-1 text-sm text-gray-400">
          Tìm nhanh cách dùng các chức năng chính ngay trong hệ thống.
        </p>
      </div>

      <div className="max-w-4xl">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Tìm kiếm hướng dẫn..."
          className="mb-4 w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white placeholder:text-gray-500"
        />

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {filtered.map((item) => (
            <article key={item.title} className="rounded-lg border border-gray-800 bg-gray-900 p-4">
              <h2 className="text-sm font-semibold text-white">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-gray-300">{item.body}</p>
            </article>
          ))}
        </div>

        {filtered.length === 0 ? (
          <p className="rounded-lg border border-gray-800 bg-gray-900 p-6 text-center text-sm text-gray-400">
            Không tìm thấy hướng dẫn phù hợp.
          </p>
        ) : null}
      </div>
    </div>
  );
}
