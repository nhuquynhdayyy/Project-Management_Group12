# Phân Quyền Admin và Manager - Tài Liệu Tóm Tắt

## Tổng Quan
Hệ thống đã được cập nhật để phân quyền rõ ràng giữa hai vai trò: **Admin** và **Manager**.

## Phân Bổ Chức Năng

### 🔴 Admin (Quản trị viên)
**Quyền truy cập:** Toàn quyền hệ thống

**Chức năng:**
- ✅ Quản lý tài khoản (User Management)
- ✅ Xem nhật ký hoạt động (Audit Logs)
- ✅ Quản lý danh mục (Loài cây, Khu vực)
- ✅ Tất cả chức năng của Manager

### 🟢 Manager (Cán bộ quản lý)
**Quyền truy cập:** Quản lý vận hành

**Chức năng:**
- ✅ Xem Dashboard & Thống kê
- ✅ Quản lý Cây xanh (Bản đồ, CRUD cây)
- ✅ Quản lý Bảo trì & Task
- ✅ Xem Hiệu suất nhân viên
- ❌ KHÔNG thể truy cập User Management
- ❌ KHÔNG thể xem Audit Logs

### 🔵 Staff (Nhân viên hiện trường)
**Quyền truy cập:** Chỉ xem và thực hiện task

**Chức năng:**
- ✅ Xem bản đồ cây xanh
- ✅ Xem task được giao
- ✅ Hoàn thành task (với geofencing)
- ❌ KHÔNG thể truy cập Dashboard
- ❌ KHÔNG thể quản lý cây hoặc task

---

## Thay Đổi Backend

### 1. RolesGuard - So sánh không phân biệt hoa thường
**File:** `backend/src/common/guards/roles.guard.ts`

```typescript
// Cập nhật logic kiểm tra role
const normalizedRequiredRoles = requiredRoles.map(role => role.toLowerCase());
const hasRole = user.roles.some((role: string) => 
  normalizedRequiredRoles.includes(role.toLowerCase())
);
```

### 2. TreesController - Phân quyền Admin/Manager
**File:** `backend/src/modules/trees/trees.controller.ts`

**Endpoints được bảo vệ:**
- `POST /trees` - Tạo cây mới
- `PATCH /trees/:id` - Cập nhật cây
- `DELETE /trees/:id` - Xóa cây
- `PATCH /trees/:id/health` - Cập nhật tình trạng sức khỏe

**Decorator áp dụng:**
```typescript
@UseGuards(RolesGuard)
@Roles('Admin', 'Manager')
```

### 3. MaintenanceController - Phân quyền Admin/Manager
**File:** `backend/src/modules/maintenance/maintenance.controller.ts`

**Endpoints được bảo vệ:**
- `POST /maintenance/tasks` - Tạo task mới
- `PATCH /maintenance/tasks/:id/status` - Cập nhật trạng thái task
- `GET /maintenance/stats/by-staff` - Thống kê hiệu suất nhân viên
- `GET /maintenance/stats/overdue` - Xem task quá hạn
- `GET /maintenance/tasks/export` - Xuất báo cáo Excel/PDF

**Decorator áp dụng:**
```typescript
@UseGuards(RolesGuard)
@Roles('Admin', 'Manager')
```

### 4. AuditLogController - Chỉ Admin
**File:** `backend/src/modules/audit-log/auditLog.controller.ts`

**Đã có sẵn:** Kiểm tra role admin trong code
```typescript
const isAdmin = roles.some(role => role.toLowerCase() === 'admin');
if (!isAdmin) {
  throw new ForbiddenException('Admin role required to access audit logs');
}
```

### 5. AuthController - Chỉ Admin
**File:** `backend/src/modules/auth/auth.controller.ts`

**Endpoints được bảo vệ:**
- `GET /auth/users` - Lấy danh sách users
- `PATCH /auth/users/:id/role` - Cập nhật role user
- `PATCH /auth/users/:id/status` - Khóa/mở khóa tài khoản

**Decorator áp dụng:**
```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('Admin')
```

---

## Thay Đổi Frontend

### 1. Navigation Menu (Sidebar)
**File:** `frontend/src/components/AppShell.tsx`

**Đã được cấu hình đúng:**
```typescript
const NAV_ITEMS = [
  { to: '/map', roles: ['Admin', 'Manager', 'Staff'] },
  { to: '/dashboard', roles: ['Admin', 'Manager'] },
  { to: '/dashboard/trees', roles: ['Admin', 'Manager'] },
  { to: '/dashboard/trees/manage', roles: ['Admin', 'Manager'] },
  { to: '/dashboard/tasks', roles: ['Admin', 'Manager'] },
  { to: '/dashboard/tasks/manage', roles: ['Admin', 'Manager'] },
  { to: '/dashboard/staff', roles: ['Admin', 'Manager'] },
  { to: '/dashboard/users', roles: ['Admin'] },      // ⚠️ Chỉ Admin
  { to: '/activity-logs', roles: ['Admin'] },        // ⚠️ Chỉ Admin
];
```

**Hàm kiểm tra quyền:**
```typescript
function hasAnyRole(userRoles: string[] | undefined, allowedRoles: string[]) {
  const normalizedAllowedRoles = allowedRoles.map(role => role.toLowerCase());
  return userRoles?.some(role => normalizedAllowedRoles.includes(role.toLowerCase())) ?? false;
}
```

### 2. Route Guards
**File:** `frontend/src/App.tsx`

**Đã được cấu hình đúng:**
```typescript
// Dashboard - Admin/Manager only
<Route element={<RoleGuard allowedRoles={['Admin', 'Manager']} />}>
  <Route path="/dashboard" element={<DashboardPage />} />
  <Route path="/dashboard/trees" element={<TreeStatsPage />} />
  <Route path="/dashboard/trees/manage" element={<TreeManagementPage />} />
  <Route path="/dashboard/tasks" element={<TaskStatsPage />} />
  <Route path="/dashboard/tasks/manage" element={<TaskManagementPage />} />
  <Route path="/dashboard/staff" element={<StaffStatsPage />} />
</Route>

// User Management - Admin only
<Route element={<RoleGuard allowedRoles={['Admin']} />}>
  <Route path="/dashboard/users" element={<UsersPage />} />
</Route>

// Audit Logs - Admin only
<Route element={<RoleGuard allowedRoles={['Admin']} />}>
  <Route path="/activity-logs" element={<ActivityLogsPage />} />
</Route>
```

### 3. RoleGuard Component
**File:** `frontend/src/components/RoleGuard.tsx`

**Đã có sẵn:** So sánh không phân biệt hoa thường
```typescript
const normalizedAllowedRoles = allowedRoles.map(role => role.toLowerCase());
const hasAccess = user?.roles.some(role => 
  normalizedAllowedRoles.includes(role.toLowerCase())
);
```

---

## Kiểm Tra Phân Quyền

### Test Case 1: Manager cố truy cập User Management
**URL:** `/dashboard/users`
- ❌ Frontend: RoleGuard chuyển hướng về `/map`
- ❌ Backend: API trả về 403 Forbidden

### Test Case 2: Manager cố truy cập Audit Logs
**URL:** `/activity-logs`
- ❌ Frontend: RoleGuard chuyển hướng về `/map`
- ❌ Backend: API trả về 403 Forbidden

### Test Case 3: Manager truy cập Dashboard
**URL:** `/dashboard`
- ✅ Frontend: Hiển thị Dashboard
- ✅ Backend: API cho phép truy cập

### Test Case 4: Admin truy cập mọi trang
**URL:** Bất kỳ
- ✅ Frontend: Hiển thị tất cả menu items
- ✅ Backend: API cho phép truy cập tất cả

### Test Case 5: Staff truy cập Dashboard
**URL:** `/dashboard`
- ❌ Frontend: RoleGuard chuyển hướng về `/map`
- ❌ Backend: API trả về 403 Forbidden

---

## Lưu Ý Quan Trọng

### 1. So sánh Role không phân biệt hoa thường
Tất cả các kiểm tra role đều sử dụng `.toLowerCase()` để tránh lỗi do viết hoa/thường khác nhau.

### 2. Admin có quyền tối cao
Admin có thể truy cập tất cả chức năng của Manager + các chức năng quản trị riêng.

### 3. Bảo vệ 2 lớp
- **Frontend:** RoleGuard ẩn menu và chuyển hướng
- **Backend:** @Roles decorator và RolesGuard chặn API

### 4. Endpoints công khai
Các endpoint sau KHÔNG yêu cầu role đặc biệt (chỉ cần JWT):
- `GET /trees` - Xem danh sách cây
- `GET /trees/:id` - Xem chi tiết cây
- `GET /trees/species` - Xem loài cây
- `GET /trees/areas` - Xem khu vực
- `GET /trees/nearby` - Tìm cây gần đó
- `GET /maintenance/tasks` - Xem danh sách task
- `GET /maintenance/tasks/my-tasks` - Xem task của mình

---

## Tóm Tắt Thay Đổi

### Backend
✅ Cập nhật `RolesGuard` - so sánh không phân biệt hoa thường  
✅ Thêm `@Roles('Admin', 'Manager')` vào `TreesController`  
✅ Thêm `@Roles('Admin', 'Manager')` vào `MaintenanceController`  
✅ Giữ nguyên `@Roles('Admin')` trong `AuthController`  
✅ Giữ nguyên kiểm tra admin trong `AuditLogController`

### Frontend
✅ `AppShell.tsx` - NAV_ITEMS đã phân quyền đúng  
✅ `App.tsx` - RoleGuard đã bảo vệ routes đúng  
✅ `RoleGuard.tsx` - So sánh không phân biệt hoa thường

---

## Kết Luận

Hệ thống đã được phân quyền rõ ràng và bảo mật:
- **Admin:** Toàn quyền
- **Manager:** Quản lý vận hành (không có quyền quản trị)
- **Staff:** Chỉ xem và thực hiện task

Tất cả các kiểm tra đều không phân biệt hoa thường và được bảo vệ ở cả frontend lẫn backend.
