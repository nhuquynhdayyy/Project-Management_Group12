# RBAC Testing Guide

## Current Status
✅ Role entity created with fields: `id`, `role_name`, `description`  
✅ User-Role Many-to-Many relationship configured via `user_roles` junction table  
✅ Seeder creates 3 default roles: Admin, Manager, Staff  
✅ Register endpoint accepts `roles: string[]` array  
✅ Login endpoint returns JWT with `roles: string[]` in payload  
✅ JWT Strategy updated to handle `roles` array  
✅ Build compiles successfully  

## Database Migration Issue

**Problem**: Existing users in the database have `NULL` passwords, preventing schema synchronization.

**Solution**: Clean up the database before testing RBAC.

### Option 1: Truncate Users Table (Recommended for Development)

Connect to your PostgreSQL database and run:

```sql
TRUNCATE TABLE users CASCADE;
```

This will delete all existing users and allow the schema to synchronize properly.

### Option 2: Use the SQL Script

Run the provided SQL script:

```bash
psql -U your_username -d your_database -f fix-database-schema.sql
```

## Testing the Complete RBAC Flow

### Step 1: Start the Server

```bash
cd backend
npm run start:dev
```

**Expected Output**:
```
[Nest] LOG [SeederService] Seeding complete — tree_species: 5, administrative_areas: 5, roles: 3
[Nest] LOG [NestApplication] Nest application successfully started
```

### Step 2: Verify Roles Were Seeded

Open Swagger UI: `http://localhost:3000/api`

Or use curl:

```bash
curl http://localhost:3000/seed
```

**Expected Response**:
```json
{
  "species": "5 rows in table",
  "areas": "5 rows in table",
  "roles": "3 rows in table"
}
```

### Step 3: Register a New User with Admin Role

**Endpoint**: `POST /auth/register`

**Request Body**:
```json
{
  "username": "admin_user",
  "email": "admin@example.com",
  "password": "Admin@123",
  "full_name": "Admin User",
  "roles": ["Admin"]
}
```

**Expected Response**:
```json
{
  "id": 1,
  "username": "admin_user",
  "email": "admin@example.com",
  "full_name": "Admin User",
  "assigned_area_id": null,
  "is_active": true,
  "last_login_at": "2026-05-02T09:24:18.000Z",
  "roles": [
    {
      "id": 1,
      "role_name": "Admin",
      "description": "Quản trị viên hệ thống - Toàn quyền quản lý"
    }
  ],
  "created_at": "2026-05-02T09:24:18.000Z",
  "updated_at": "2026-05-02T09:24:18.000Z"
}
```

### Step 4: Register a User with Multiple Roles

**Request Body**:
```json
{
  "username": "manager_user",
  "email": "manager@example.com",
  "password": "Manager@123",
  "full_name": "Manager User",
  "roles": ["Manager", "Staff"]
}
```

**Expected Response**: User object with both Manager and Staff roles in the `roles` array.

### Step 5: Login and Verify JWT Contains Roles

**Endpoint**: `POST /auth/login`

**Request Body**:
```json
{
  "username": "admin_user",
  "password": "Admin@123"
}
```

**Expected Response**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "id": 1,
  "username": "admin_user",
  "roles": ["Admin"]
}
```

### Step 6: Decode JWT to Verify Payload

Copy the `access_token` from Step 5 and decode it at https://jwt.io

**Expected Payload**:
```json
{
  "sub": 1,
  "userId": 1,
  "username": "admin_user",
  "roles": ["Admin"],
  "iat": 1746183858,
  "exp": 1746270258
}
```

**✅ CRITICAL**: The JWT payload MUST contain `roles` as an array, NOT a single `role` string.

### Step 7: Test Protected Endpoints with JWT

Use the JWT token to access protected endpoints:

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" http://localhost:3000/trees
```

The JWT will be validated by `JwtAuthGuard`, and the user object will contain the `roles` array.

## Verification Checklist

- [ ] Database cleaned (no null passwords)
- [ ] Server starts without errors
- [ ] Seeder creates 3 roles: Admin, Manager, Staff
- [ ] Can register user with single role
- [ ] Can register user with multiple roles
- [ ] Login returns JWT with `roles` array
- [ ] JWT payload contains `roles: string[]` (not `role: string`)
- [ ] Protected endpoints accept the JWT token
- [ ] Invalid role names are rejected with error message

## Database Schema Verification

After successful startup, verify the database schema:

```sql
-- Check roles table
SELECT * FROM roles;

-- Expected output:
-- id | role_name | description
-- 1  | Admin     | Quản trị viên hệ thống - Toàn quyền quản lý
-- 2  | Manager   | Cán bộ quản lý - Phân công và giám sát công việc
-- 3  | Staff     | Nhân viên thực hiện - Thực hiện công việc bảo trì cây xanh

-- Check user_roles junction table structure
\d user_roles

-- Expected output:
-- Column  |  Type   | Nullable
-- user_id | integer | not null
-- role_id | integer | not null
-- Primary key: (user_id, role_id)
-- Foreign keys: user_id -> users(id), role_id -> roles(id)
```

## Next Steps

After successful RBAC testing:

1. **Create Role-Based Guards**: Implement `@Roles()` decorator and `RolesGuard` to restrict endpoints by role
2. **Update Existing Endpoints**: Add role restrictions to Trees and Maintenance endpoints
3. **Write Tests**: Create unit tests for RBAC logic
4. **Documentation**: Update API documentation with role requirements

## Troubleshooting

### Error: "Role 'Admin' not found"
- **Cause**: Roles table is empty
- **Solution**: Run the seeder manually: `curl http://localhost:3000/seed`

### Error: "column 'password' contains null values"
- **Cause**: Existing users have null passwords
- **Solution**: Run `TRUNCATE TABLE users CASCADE;` in PostgreSQL

### Error: JWT doesn't contain roles
- **Cause**: Old JWT tokens from before RBAC implementation
- **Solution**: Login again to get a new JWT token with roles

### Error: "Cannot read property 'role' of undefined"
- **Cause**: Code still expects single `role` instead of `roles` array
- **Solution**: Update all references from `user.role` to `user.roles`

## Implementation Summary

The RBAC implementation follows the exact database design from PDF pages 46-47:

1. **roles** table: Stores role definitions (Admin, Manager, Staff)
2. **user_roles** junction table: Many-to-Many relationship between users and roles
3. **Register flow**: Accepts role names → finds role IDs → saves to user_roles
4. **Login flow**: Loads user with roles → creates JWT with roles array
5. **JWT validation**: Extracts roles array from token → attaches to request user object

This design allows:
- Users to have multiple roles simultaneously
- Easy role management (add/remove roles without changing user table)
- Scalable authorization (add new roles without code changes)
- JWT-based stateless authentication with role information
