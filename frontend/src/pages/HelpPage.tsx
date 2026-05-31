import { useMemo, useState } from 'react';

const FAQS = [
  {
    title: 'Tạo lịch bảo trì định kỳ',
    body: 'Vào Lịch bảo trì, chọn cây hoặc khu vực, loại công việc, ngày bắt đầu và tần suất. Hệ thống sẽ tự sinh các công việc trong danh sách maintenance_tasks.',
  },
  {
    title: 'Theo dõi thông báo nhắc việc',
    body: 'Nhấn biểu tượng chuông ở góc trên bên phải để xem thông báo mới. Các lịch bảo trì mới sẽ gửi nhắc việc cho nhân viên được phân công.',
  },
  {
    title: 'Xem tỷ lệ sức khỏe cây',
    body: 'Vào Thống kê, lọc theo khu vực nếu cần. Biểu đồ tròn dùng xanh lá cho cây khỏe, vàng cho cây yếu và đỏ cho cây chết hoặc nguy hiểm.',
  },
  {
    title: 'Xuất dữ liệu tuổi cây',
    body: 'Trong màn hình Thống kê, nhấn Xuất Excel để tải dữ liệu nhóm tuổi dạng CSV có thể mở bằng Excel.',
  },
  {
    title: 'Hoàn thành công việc bảo trì',
    body: 'Nhân viên dùng danh sách công việc, đánh dấu hoàn thành tại hiện trường và ghi chú kết quả sau khi thực hiện.',
  },
];

export default function HelpPage() {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return FAQS;
    return FAQS.filter((item) =>
      `${item.title} ${item.body}`.toLowerCase().includes(value),
    );
  }, [query]);

  return (
    <div className="h-full overflow-y-auto bg-gray-950 px-6 py-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Trợ giúp</h1>
        <p className="mt-1 text-sm text-gray-400">Tìm nhanh hướng dẫn sử dụng các chức năng chính.</p>
      </div>

      <div className="max-w-3xl">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Tìm kiếm hướng dẫn..."
          className="mb-4 w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white placeholder:text-gray-500"
        />

        <div className="space-y-3">
          {filtered.map((item) => (
            <article key={item.title} className="rounded-lg border border-gray-800 bg-gray-900 p-4">
              <h2 className="text-sm font-semibold text-white">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-gray-300">{item.body}</p>
            </article>
          ))}
          {filtered.length === 0 && (
            <p className="rounded-lg border border-gray-800 bg-gray-900 p-6 text-center text-sm text-gray-400">
              Không tìm thấy hướng dẫn phù hợp.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
