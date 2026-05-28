# Tính năng Lịch sử Bảo trì Cây

## Vấn đề đã giải quyết

Trước đây, nhân viên bảo trì chỉ có thể xem danh sách công việc được giao cho mình. Họ không biết:
- Cây này đã được bảo trì những gì trước đó
- Ai đã thực hiện các công việc trước
- Có công việc nào đang quá hạn không
- Lịch sử đầy đủ các hoạt động bảo trì của cây

## Giải pháp

Thêm màn hình **TreeHistoryScreen** để xem toàn bộ lịch sử bảo trì của một cây cụ thể, bao gồm:
- Tất cả các công việc đã được giao cho cây đó
- Trạng thái của từng công việc (Chờ xử lý / Đang thực hiện / Hoàn thành)
- Cảnh báo công việc quá hạn
- Khả năng xem chi tiết từng công việc

## Thay đổi đã thực hiện

### 1. Backend API (Đã có sẵn)

Backend đã có endpoint:
```
GET /maintenance/tasks?tree_id=:id
```

Endpoint này trả về danh sách tất cả các task của một cây, được sắp xếp theo thời gian giảm dần (mới nhất trước).

### 2. Mobile API Layer (`mobile/src/api/maintenance.ts`)

Thêm function mới:

```typescript
export async function getTasksByTreeId(treeId: number): Promise<MaintenanceTask[]> {
  const response = await apiClient.get<MaintenanceTask[]>('/maintenance/tasks', {
    params: { tree_id: treeId },
  });
  return response.data;
}
```

### 3. Navigation Types (`mobile/src/types/navigation.ts`)

Thêm route mới vào navigation stack:

```typescript
export type RootStackParamList = {
  Login: undefined;
  TaskList: undefined;
  TaskDetail: { task: MaintenanceTask };
  TreeHistory: { treeId: number; treeCode: string }; // MỚI
};
```

### 4. TreeHistoryScreen (`mobile/src/screens/TreeHistoryScreen.tsx`)

Màn hình mới hoàn toàn với các tính năng:

#### a. Header
- Nút quay lại
- Tiêu đề "Lịch sử bảo trì"
- Hiển thị mã cây đang xem

#### b. Danh sách công việc
Mỗi task card hiển thị:
- **Icon trạng thái**: ⏳ (Chờ) / 🔵 (Đang làm) / ✅ (Hoàn thành)
- **Loại công việc**: Cắt tỉa, Bón phân, Tưới nước, Kiểm tra
- **Badge trạng thái** với màu sắc:
  - 🟡 Chờ xử lý (vàng)
  - 🔵 Đang thực hiện (xanh dương)
  - 🟢 Hoàn thành (xanh lá)
- **Ngày hẹn**: Ngày dự kiến thực hiện
- **Ngày hoàn thành**: Nếu đã hoàn thành
- **Cảnh báo quá hạn**: ⚠️ Nếu task chưa hoàn thành và đã quá ngày hẹn
- **Ghi chú**: Hiển thị 2 dòng đầu tiên (nếu có)
- **Nút "Xem chi tiết"**: Navigate đến TaskDetailScreen

#### c. Tính năng
- **Pull-to-refresh**: Kéo xuống để làm mới danh sách
- **Loading state**: Hiển thị spinner khi đang tải
- **Empty state**: Thông báo khi chưa có lịch sử
- **Tổng số công việc**: Hiển thị số lượng task
- **Highlight quá hạn**: Border màu vàng cho task quá hạn

#### d. Logic xử lý

**Kiểm tra quá hạn:**
```typescript
function isOverdue(task: MaintenanceTask): boolean {
  if (task.status === 'Completed') return false;
  const scheduledDate = new Date(task.scheduled_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return scheduledDate < today;
}
```

**Màu sắc trạng thái:**
```typescript
function getStatusColor(status: string) {
  switch (status) {
    case 'Pending': return '#f59e0b';      // Vàng
    case 'In_Progress': return '#3b82f6';  // Xanh dương
    case 'Completed': return '#10b981';    // Xanh lá
    default: return '#6b7280';             // Xám
  }
}
```

### 5. TaskDetailScreen (`mobile/src/screens/TaskDetailScreen.tsx`)

Thêm nút "Xem lịch sử bảo trì cây này" trong card thông tin cây:

```typescript
<TouchableOpacity
  style={styles.historyButton}
  onPress={() => navigation.navigate('TreeHistory', { 
    treeId: treeDetails.id, 
    treeCode: treeDetails.tree_code 
  })}
>
  <Text style={styles.historyButtonText}>📋 Xem lịch sử bảo trì cây này</Text>
</TouchableOpacity>
```

### 6. App Navigation (`mobile/App.tsx`)

Đăng ký TreeHistoryScreen vào navigation stack:

```typescript
import TreeHistoryScreen from './src/screens/TreeHistoryScreen';

// ...

<Stack.Screen name="TreeHistory" component={TreeHistoryScreen} />
```

## User Flow

```
TaskDetailScreen
    ↓
[Xem lịch sử bảo trì cây này]
    ↓
TreeHistoryScreen
    ├── Task 1: Cắt tỉa - 01/03/2026 - Hoàn thành ✅
    ├── Task 2: Tưới nước - 15/03/2026 - Quá hạn ⚠️
    ├── Task 3: Kiểm tra - 01/05/2026 - Đang xử lý 🔵
    └── Task 4: Bón phân - 10/05/2026 - Chờ xử lý ⏳
         ↓
    [Tap vào task]
         ↓
    TaskDetailScreen (của task đó)
```

## Cấu trúc UI TreeHistoryScreen

```
TreeHistoryScreen
├── Header
│   ├── Back button
│   ├── Title: "Lịch sử bảo trì"
│   └── Subtitle: "Cây: [tree_code]"
│
└── ScrollView (với pull-to-refresh)
    ├── Section Title: "Tổng số: X công việc"
    │
    └── Task Cards (danh sách)
        ├── Task Card 1
        │   ├── Header
        │   │   ├── Icon + Task Type
        │   │   └── Status Badge
        │   ├── Details
        │   │   ├── Ngày hẹn
        │   │   ├── Ngày hoàn thành (nếu có)
        │   │   ├── Cảnh báo quá hạn (nếu có)
        │   │   └── Ghi chú (nếu có)
        │   └── Footer
        │       └── "Xem chi tiết →"
        │
        ├── Task Card 2
        └── ...
```

## Styling

### Màu sắc chủ đạo
- Background: `#0f172a` (dark blue)
- Card background: `#1e293b` (lighter dark blue)
- Border: `#334155` (gray)
- Text primary: `#fff` (white)
- Text secondary: `#94a3b8` (light gray)
- Success: `#10b981` (green)
- Warning: `#f59e0b` (yellow/orange)
- Info: `#3b82f6` (blue)
- Danger: `#ef4444` (red)

### Task Card States
- **Normal**: Border `#334155` (1px)
- **Overdue**: Border `#f59e0b` (2px) - nổi bật hơn

## Lợi ích

1. **Tăng tính minh bạch**: Nhân viên có thể xem lịch sử đầy đủ của cây
2. **Quản lý tốt hơn**: Biết được cây đã được bảo trì những gì
3. **Phát hiện vấn đề**: Dễ dàng nhận biết công việc quá hạn
4. **Truy vết**: Có thể xem ai đã làm gì với cây
5. **Context đầy đủ**: Hiểu rõ tình trạng cây trước khi thực hiện công việc mới

## Testing Checklist

- [ ] Mở TaskDetailScreen và thấy nút "Xem lịch sử bảo trì cây này"
- [ ] Tap vào nút và navigate đến TreeHistoryScreen
- [ ] TreeHistoryScreen hiển thị đúng mã cây trong header
- [ ] Danh sách task hiển thị đầy đủ và đúng thứ tự (mới nhất trước)
- [ ] Badge trạng thái có màu đúng
- [ ] Task quá hạn có border màu vàng và cảnh báo ⚠️
- [ ] Pull-to-refresh hoạt động
- [ ] Tap vào task card navigate đến TaskDetailScreen
- [ ] Empty state hiển thị khi cây chưa có task nào
- [ ] Loading state hiển thị khi đang fetch data

## Files đã thay đổi/tạo mới

### Tạo mới
1. `mobile/src/screens/TreeHistoryScreen.tsx` - Màn hình lịch sử bảo trì

### Đã sửa
1. `mobile/src/api/maintenance.ts` - Thêm `getTasksByTreeId()`
2. `mobile/src/types/navigation.ts` - Thêm route `TreeHistory`
3. `mobile/src/screens/TaskDetailScreen.tsx` - Thêm nút "Xem lịch sử"
4. `mobile/App.tsx` - Đăng ký TreeHistoryScreen

## Backend API sử dụng

- `GET /maintenance/tasks?tree_id=:id` - Lấy danh sách task theo cây (đã có sẵn)

## Không cần thay đổi Backend

Backend đã có sẵn endpoint với filter `tree_id`, không cần thêm API mới.
