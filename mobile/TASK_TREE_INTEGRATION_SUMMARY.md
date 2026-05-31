# Tích hợp thông tin cây vào TaskDetailScreen

## Vấn đề đã giải quyết

TaskDetailScreen trước đây chỉ hiển thị thông tin cơ bản về task và cây (tree_code, species.common_name). Thiếu nhiều thông tin quan trọng về cây như:
- Tình trạng sức khỏe (health_status)
- Thông tin chi tiết về kích thước (chiều cao, đường kính thân)
- Năm trồng
- Lịch sử bảo trì (last_maintained_at)
- Khu vực quản lý
- Tên khoa học của loài cây

## Thay đổi đã thực hiện

### 1. API Layer (`mobile/src/api/trees.ts`)

Thêm function mới để lấy thông tin chi tiết cây theo ID:

```typescript
export async function getTreeById(treeId: number): Promise<Tree> {
  const response = await apiClient.get<Tree>(`/trees/${treeId}`);
  return response.data;
}
```

### 2. TaskDetailScreen (`mobile/src/screens/TaskDetailScreen.tsx`)

#### a. State Management
- Thêm state `treeDetails` để lưu thông tin chi tiết về cây
- Thêm state `fetchingTree` để quản lý loading state

```typescript
const [treeDetails, setTreeDetails] = useState<Tree | null>(null);
const [fetchingTree, setFetchingTree] = useState(true);
```

#### b. Data Fetching
Thêm useEffect để fetch thông tin chi tiết cây khi component mount:

```typescript
useEffect(() => {
  if (task.tree_id) {
    getTreeById(task.tree_id)
      .then(setTreeDetails)
      .catch((error) => {
        console.error('Failed to fetch tree details:', error);
      })
      .finally(() => setFetchingTree(false));
  } else {
    setFetchingTree(false);
  }
}, [task.tree_id]);
```

#### c. UI Components

**Card 1: Thông tin công việc** (đã có, được cải thiện)
- Loại công việc
- Trạng thái (với badge màu)
- Ngày hẹn
- Thời gian hoàn thành (nếu đã hoàn thành)
- Ghi chú (nếu có)

**Card 2: Thông tin cây** (MỚI - QUAN TRỌNG NHẤT)
- Mã cây
- Loài cây (tên thường gọi)
- Tên khoa học (in nghiêng)
- Khu vực quản lý
- **Tình trạng sức khỏe** (với badge màu):
  - 🟢 Tốt (màu xanh lá)
  - 🟡 Yếu (màu vàng)
  - 🔴 Sâu bệnh (màu đỏ)
  - ⚫ Chết (màu xám)
- Chiều cao (nếu có)
- Đường kính thân (nếu có)
- Năm trồng (nếu có)
- **Bảo trì lần cuối** (nếu có)
- Tọa độ GPS

**Card 3: Ảnh bằng chứng** (đã có)
- Hiển thị ảnh bằng chứng nếu đã upload
- Thông báo "Chưa có ảnh bằng chứng" nếu chưa có

**Card 4: Hoàn thành công việc** (đã có)
- Chỉ hiển thị khi task chưa hoàn thành
- Form nhập ghi chú
- Nút chụp/chọn ảnh
- Nút hoàn thành công việc

#### d. Helper Functions

Thêm function để xác định màu badge cho health status:

```typescript
function getHealthStatusColor(status: string) {
  switch (status) {
    case 'Tốt': return '#10b981';
    case 'Yếu': return '#f59e0b';
    case 'Sâu bệnh': return '#ef4444';
    case 'Chết': return '#6b7280';
    default: return '#6b7280';
  }
}
```

#### e. Styling

Thêm các styles mới:
- `cardTitle`: Tiêu đề card với icon và border bottom
- `notesContainer`, `notesText`: Hiển thị ghi chú
- `italicText`: Text in nghiêng cho tên khoa học
- `locationContainer`, `coordinatesText`: Hiển thị tọa độ GPS với font monospace

## Cấu trúc UI mới

```
TaskDetailScreen
├── Header (Back button + Title)
└── ScrollView
    ├── 📋 Card: Thông tin công việc
    │   ├── Loại công việc
    │   ├── Trạng thái (badge)
    │   ├── Ngày hẹn
    │   ├── Hoàn thành lúc (nếu có)
    │   └── Ghi chú (nếu có)
    │
    ├── 🌳 Card: Thông tin cây (MỚI)
    │   ├── Mã cây
    │   ├── Loài cây
    │   ├── Tên khoa học
    │   ├── Khu vực
    │   ├── Tình trạng sức khỏe (badge màu)
    │   ├── Chiều cao
    │   ├── Đường kính thân
    │   ├── Năm trồng
    │   ├── Bảo trì lần cuối
    │   └── Vị trí (GPS)
    │
    ├── 📷 Card: Ảnh bằng chứng
    │   └── Image hoặc "Chưa có ảnh"
    │
    └── ✅ Card: Hoàn thành công việc (chỉ khi chưa hoàn thành)
        ├── Cảnh báo bán kính 10m
        ├── TextInput ghi chú
        ├── Button chụp ảnh
        ├── Image preview (nếu đã chọn)
        └── Button hoàn thành
```

## Backend API đã sử dụng

- `GET /trees/:id` - Lấy thông tin chi tiết cây theo ID (đã có sẵn)
- `GET /maintenance/tasks/:id` - Lấy thông tin task (đã có sẵn)
- `POST /maintenance/tasks/:id/complete` - Hoàn thành task (đã có sẵn)

## Lợi ích

1. **Thông tin đầy đủ hơn**: Nhân viên bảo trì có thể xem đầy đủ thông tin về cây trước khi thực hiện công việc
2. **Tình trạng sức khỏe rõ ràng**: Badge màu giúp nhận biết nhanh tình trạng cây
3. **Lịch sử bảo trì**: Biết được cây đã được bảo trì lần cuối khi nào
4. **UI/UX tốt hơn**: Thông tin được tổ chức thành các card rõ ràng với icon và màu sắc phù hợp
5. **Fallback mechanism**: Nếu không load được thông tin chi tiết, vẫn hiển thị thông tin cơ bản từ task

## Testing

Để test các thay đổi:

1. Đăng nhập vào app
2. Chọn một task từ danh sách
3. Xem TaskDetailScreen
4. Kiểm tra:
   - ✅ Card "Thông tin công việc" hiển thị đầy đủ
   - ✅ Card "Thông tin cây" hiển thị đầy đủ thông tin chi tiết
   - ✅ Badge tình trạng sức khỏe có màu đúng
   - ✅ Thông tin bảo trì lần cuối hiển thị (nếu có)
   - ✅ Ảnh bằng chứng hiển thị (nếu có)
   - ✅ Form hoàn thành công việc hoạt động bình thường

## Files đã thay đổi

1. `mobile/src/api/trees.ts` - Thêm `getTreeById()`
2. `mobile/src/screens/TaskDetailScreen.tsx` - Cập nhật UI và logic

## Không cần thay đổi Backend

Backend đã có sẵn endpoint `GET /trees/:id` với đầy đủ thông tin cần thiết. Không cần thêm API mới.
