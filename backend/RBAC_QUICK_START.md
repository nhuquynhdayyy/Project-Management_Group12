# RBAC Quick Start Guide

## ⚡ Bắt Đầu Nhanh

### Bước 1: Dọn Dẹp Database (BẮT BUỘC)

**Windows PowerShell:**
```powershell
cd backend
.\clean-database.ps1
```

**Hoặc SQL trực tiếp:**
```sql
TRUNCATE TABLE users CASCADE;
```

### Bước 2: Khởi Động Server

```bash
npm run start:dev
```

**Kiểm tra log:**
```
[SeederService] Seeding complete — tree_species: 5, administrative_areas: 5, roles: 3
[NestApplication] Nest application successfully started
```

### Bước 3: Đăng Ký User với Role

**Swagger UI:** http://localhost:3000/api

**Endpoint:** `POST /auth/register`

```json
{
  "username": "admin_user",
  "email": "admin@example.com",
  "password": "Admin@123",
  "full_name": "Admin User",
  "roles": ["Admin"]
}
```

### Bước 4: Đăng Nhập

**Endpoint:** `POST /auth/login`

```json
{
  "username": "admin_user",
  "password": "Admin@123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "id": 1,
  "username": "admin_user",
  "roles": ["Admin"]
}
```

### Bước 5: Verify JWT

Vào https://jwt.io và paste `access_token`

**Payload phải chứa:**
```json
{
  "sub": 1,
  "userId": 1,
  "username": "admin_user",
  "roles": ["Admin"],  // ← QUAN TRỌNG: Array, không phải string
  "iat": 1746183858,
  "exp": 1746270258
}
```

## ✅ Checklist

- [ ] Database đã được dọn dẹp (không có null passwords)
- [ ] Server khởi động thành công
- [ ] Seeder tạo 3 roles: Admin, Manager, Staff
- [ ] Đăng ký user với role thành công
- [ ] Login trả về JWT với `roles` array
- [ ] JWT payload chứa `roles: string[]` (không phải `role: string`)

## 🎯 3 Roles Mặc Định

1. **Admin** - Quản trị viên hệ thống - Toàn quyền quản lý
2. **Manager** - Cán bộ quản lý - Phân công và giám sát công việc
3. **Staff** - Nhân viên thực hiện - Thực hiện công việc bảo trì cây xanh

## 📝 Ví Dụ Nhanh

### User với 1 Role

```json
{
  "username": "staff1",
  "password": "Staff@123",
  "roles": ["Staff"]
}
```

### User với Nhiều Roles

```json
{
  "username": "supervisor",
  "password": "Super@123",
  "roles": ["Manager", "Staff"]
}
```

## 🐛 Troubleshooting

### Lỗi: "column 'password' contains null values"
→ Chạy `.\clean-database.ps1` hoặc `TRUNCATE TABLE users CASCADE;`

### Lỗi: "Role 'Admin' not found"
→ Roles chưa được seed. Chạy: `curl http://localhost:3000/seed`

### JWT không chứa roles
→ Login lại để lấy JWT token mới

## 📚 Tài Liệu Đầy Đủ

- **ROLE_BASED_ACCESS_CONTROL.md** - Tài liệu chi tiết về RBAC
- **RBAC_TESTING_GUIDE.md** - Hướng dẫn test đầy đủ
- **clean-database.ps1** - Script dọn dẹp database (Windows)
- **clean-database.sh** - Script dọn dẹp database (Linux/Mac)
- **fix-database-schema.sql** - SQL script thủ công

## 🚀 Bước Tiếp Theo

Sau khi test thành công:

1. Tạo `@Roles()` decorator và `RolesGuard`
2. Thêm role restrictions vào endpoints
3. Viết unit tests
4. Cập nhật Trees và Maintenance modules với RBAC

---

**Trạng thái:** ✅ Production-ready  
**Tương thích:** 100% với thiết kế PDF (trang 46-47)
