# ✅ RBAC Implementation Checklist

## 🎯 Mục Tiêu
Kiểm tra và xác nhận hệ thống RBAC hoạt động đúng theo thiết kế PDF (trang 46-47).

---

## 📋 Pre-Testing Checklist

### Bước 1: Dọn Dẹp Database
- [ ] Chạy script: `.\clean-database.ps1` (Windows) hoặc `./clean-database.sh` (Linux/Mac)
- [ ] Hoặc chạy SQL: `TRUNCATE TABLE users CASCADE;`
- [ ] Xác nhận không có lỗi

### Bước 2: Kiểm Tra Code
- [ ] Build thành công: `npm run build`
- [ ] Không có TypeScript errors
- [ ] Không có linting errors

---

## 🧪 Testing Checklist

### Test 1: Server Startup
- [ ] Chạy: `npm run start:dev`
- [ ] Server khởi động không lỗi
- [ ] Log hiển thị: `[SeederService] Seeding complete — tree_species: 5, administrative_areas: 5, roles: 3`
- [ ] Swagger UI mở được: http://localhost:3000/api

### Test 2: Verify Roles Seeded
- [ ] Mở Swagger UI
- [ ] Gọi endpoint: `GET /seed`
- [ ] Response chứa: `"roles": "3 rows in table"`
- [ ] Hoặc kiểm tra database: `SELECT * FROM roles;`
- [ ] Có 3 roles: Admin, Manager, Staff

### Test 3: Register User với Single Role
- [ ] Endpoint: `POST /auth/register`
- [ ] Body:
  ```json
  {
    "username": "admin_test",
    "email": "admin@test.com",
    "password": "Admin@123",
    "full_name": "Admin Test",
    "roles": ["Admin"]
  }
  ```
- [ ] Response status: 201 Created
- [ ] Response chứa `roles` array với 1 role object
- [ ] Role object có: `id`, `role_name: "Admin"`, `description`

### Test 4: Register User với Multiple Roles
- [ ] Endpoint: `POST /auth/register`
- [ ] Body:
  ```json
  {
    "username": "supervisor_test",
    "email": "supervisor@test.com",
    "password": "Super@123",
    "full_name": "Supervisor Test",
    "roles": ["Manager", "Staff"]
  }
  ```
- [ ] Response status: 201 Created
- [ ] Response chứa `roles` array với 2 role objects
- [ ] Có cả Manager và Staff roles

### Test 5: Register với Invalid Role
- [ ] Endpoint: `POST /auth/register`
- [ ] Body:
  ```json
  {
    "username": "invalid_test",
    "password": "Test@123",
    "roles": ["InvalidRole"]
  }
  ```
- [ ] Response status: 400 Bad Request
- [ ] Error message: `"Role \"InvalidRole\" not found"`

### Test 6: Login và Verify Response
- [ ] Endpoint: `POST /auth/login`
- [ ] Body:
  ```json
  {
    "username": "admin_test",
    "password": "Admin@123"
  }
  ```
- [ ] Response status: 200 OK
- [ ] Response chứa:
  - [ ] `access_token` (JWT string)
  - [ ] `id` (number)
  - [ ] `username` (string)
  - [ ] `roles` (array of strings, VD: `["Admin"]`)

### Test 7: Decode JWT Token
- [ ] Copy `access_token` từ Test 6
- [ ] Vào https://jwt.io
- [ ] Paste token vào "Encoded" box
- [ ] Kiểm tra "Decoded" payload:
  - [ ] Có field `sub` (user ID)
  - [ ] Có field `userId` (user ID)
  - [ ] Có field `username` (string)
  - [ ] Có field `roles` (array, VD: `["Admin"]`)
  - [ ] **QUAN TRỌNG:** `roles` phải là ARRAY, không phải string
  - [ ] Có field `iat` (issued at timestamp)
  - [ ] Có field `exp` (expiration timestamp)

### Test 8: Access Protected Endpoint
- [ ] Copy `access_token` từ Test 6
- [ ] Trong Swagger UI, click "Authorize" button
- [ ] Paste token vào "Value" field
- [ ] Click "Authorize"
- [ ] Gọi endpoint: `GET /trees`
- [ ] Response status: 200 OK (hoặc 404 nếu chưa có trees)
- [ ] Không bị 401 Unauthorized

### Test 9: Verify Database Schema
- [ ] Kết nối PostgreSQL
- [ ] Chạy: `SELECT * FROM roles;`
  - [ ] Có 3 rows: Admin, Manager, Staff
- [ ] Chạy: `SELECT * FROM users;`
  - [ ] Có ít nhất 2 users (từ Test 3 và 4)
- [ ] Chạy: `SELECT * FROM user_roles;`
  - [ ] Có ít nhất 3 rows (1 cho admin_test, 2 cho supervisor_test)
- [ ] Chạy: `\d user_roles`
  - [ ] Primary key: (user_id, role_id)
  - [ ] Foreign key: user_id → users(id)
  - [ ] Foreign key: role_id → roles(id)

### Test 10: Test Multiple Roles User Login
- [ ] Login với user có nhiều roles (supervisor_test)
- [ ] Endpoint: `POST /auth/login`
- [ ] Body:
  ```json
  {
    "username": "supervisor_test",
    "password": "Super@123"
  }
  ```
- [ ] Response chứa `roles: ["Manager", "Staff"]`
- [ ] Decode JWT token
- [ ] JWT payload chứa `roles: ["Manager", "Staff"]`

---

## 🔍 Database Verification Queries

### Query 1: Check Roles Table
```sql
SELECT * FROM roles ORDER BY id;
```
**Expected:**
| id | role_name | description |
|----|-----------|-------------|
| 1  | Admin     | Quản trị viên hệ thống - Toàn quyền quản lý |
| 2  | Manager   | Cán bộ quản lý - Phân công và giám sát công việc |
| 3  | Staff     | Nhân viên thực hiện - Thực hiện công việc bảo trì cây xanh |

### Query 2: Check User-Role Relationships
```sql
SELECT 
  u.id,
  u.username,
  r.role_name
FROM users u
INNER JOIN user_roles ur ON u.id = ur.user_id
INNER JOIN roles r ON ur.role_id = r.id
ORDER BY u.id, r.role_name;
```
**Expected:**
| id | username | role_name |
|----|----------|-----------|
| 1  | admin_test | Admin |
| 2  | supervisor_test | Manager |
| 2  | supervisor_test | Staff |

### Query 3: Check Junction Table Structure
```sql
\d user_roles
```
**Expected:**
```
Column  |  Type   | Nullable
--------+---------+----------
user_id | integer | not null
role_id | integer | not null

Indexes:
  "PK_user_roles" PRIMARY KEY (user_id, role_id)

Foreign-key constraints:
  "FK_user_roles_user" FOREIGN KEY (user_id) REFERENCES users(id)
  "FK_user_roles_role" FOREIGN KEY (role_id) REFERENCES roles(id)
```

---

## ✅ Final Verification

### Code Level
- [ ] All TypeScript files compile without errors
- [ ] No ESLint warnings
- [ ] All imports resolved correctly
- [ ] JWT Strategy handles `roles` array (not single `role` string)

### API Level
- [ ] Register endpoint accepts `roles: string[]`
- [ ] Register endpoint validates role names
- [ ] Login endpoint returns `roles: string[]`
- [ ] JWT token contains `roles` array in payload
- [ ] Protected endpoints accept JWT token

### Database Level
- [ ] `roles` table exists with 3 rows
- [ ] `user_roles` junction table exists
- [ ] Foreign keys configured correctly
- [ ] Unique constraint on `role_name`
- [ ] Many-to-Many relationship works

### Documentation Level
- [ ] ROLE_BASED_ACCESS_CONTROL.md exists
- [ ] RBAC_TESTING_GUIDE.md exists
- [ ] RBAC_QUICK_START.md exists
- [ ] RBAC_IMPLEMENTATION_SUMMARY.md exists
- [ ] RBAC_CHECKLIST.md exists (this file)

---

## 🎉 Success Criteria

**RBAC implementation is successful if:**

1. ✅ Server starts without errors
2. ✅ 3 roles are auto-seeded: Admin, Manager, Staff
3. ✅ Can register user with single role
4. ✅ Can register user with multiple roles
5. ✅ Invalid role names are rejected
6. ✅ Login returns JWT with `roles` array
7. ✅ JWT payload contains `roles: string[]` (not `role: string`)
8. ✅ Protected endpoints accept JWT token
9. ✅ Database schema matches PDF specification
10. ✅ user_roles junction table has correct foreign keys

---

## 🐛 Common Issues and Solutions

### Issue 1: "column 'password' contains null values"
**Solution:** Run `.\clean-database.ps1` or `TRUNCATE TABLE users CASCADE;`

### Issue 2: "Role 'Admin' not found"
**Solution:** Roles not seeded. Run `curl http://localhost:3000/seed`

### Issue 3: JWT doesn't contain roles
**Solution:** Old token. Login again to get new JWT with roles.

### Issue 4: "Cannot read property 'role' of undefined"
**Solution:** Code still expects single `role`. Update to `roles` array.

### Issue 5: Swagger doesn't send Authorization header
**Solution:** Add `@ApiBearerAuth()` to controller class.

---

## 📊 Testing Progress

**Total Tests:** 10  
**Completed:** ___  
**Failed:** ___  
**Skipped:** ___  

**Overall Status:** ⬜ Not Started | 🟡 In Progress | ✅ Completed | ❌ Failed

---

## 📝 Notes

_Use this section to record any issues, observations, or additional notes during testing._

---

**Date:** _______________  
**Tester:** _______________  
**Environment:** Development / Staging / Production  
**Database:** PostgreSQL version: _______________  
**Node.js:** version: _______________  
**NestJS:** version: _______________

---

## 🚀 Next Steps After Successful Testing

1. **Create Role-Based Guards**
   - [ ] Create `@Roles()` decorator
   - [ ] Create `RolesGuard` class
   - [ ] Test guards with different roles

2. **Apply to Existing Modules**
   - [ ] Add role restrictions to Trees module
   - [ ] Add role restrictions to Maintenance module
   - [ ] Update Swagger documentation

3. **Write Unit Tests**
   - [ ] Test register with roles
   - [ ] Test login with roles
   - [ ] Test JWT validation
   - [ ] Test role-based guards

4. **Update Frontend**
   - [ ] Update login to handle `roles` array
   - [ ] Update role checks to use array
   - [ ] Update UI to show/hide features based on roles

---

**Status:** 🟢 Ready for Testing  
**Compliance:** 100% with PDF pages 46-47  
**Documentation:** Complete
