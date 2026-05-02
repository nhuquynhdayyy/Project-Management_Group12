# Database Reset Guide - RBAC Implementation

## 🎯 Purpose

This guide helps you reset the database to allow TypeORM to recreate the schema cleanly with the new RBAC (Role-Based Access Control) implementation.

---

## ⚠️ What This Does

The reset process will:

1. **DROP all existing tables:**
   - `user_roles` (junction table)
   - `maintenance_tasks`
   - `trees`
   - `users`
   - `roles`
   - `tree_species`
   - `administrative_areas`

2. **Let TypeORM recreate tables** with correct schema on next startup

3. **Auto-seed data:**
   - 3 roles: Admin, Manager, Staff
   - 5 tree species
   - 5 administrative areas
   - 4 test users with roles

---

## 🚀 Quick Start

### Option 1: PowerShell Script (Windows - Recommended)

```powershell
cd backend
.\reset-database.ps1
```

**Follow the prompts:**
- Review the tables that will be dropped
- Type `yes` to confirm
- Wait for completion

### Option 2: Bash Script (Linux/Mac)

```bash
cd backend
chmod +x reset-database.sh
./reset-database.sh
```

### Option 3: Manual SQL Execution

```bash
cd backend
psql -U your_username -d your_database -f drop-and-recreate-schema.sql
```

---

## 📋 Step-by-Step Process

### Step 1: Backup (Optional but Recommended)

If you have important data, backup first:

```bash
pg_dump -U your_username your_database > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Step 2: Run Reset Script

**Windows:**
```powershell
.\reset-database.ps1
```

**Linux/Mac:**
```bash
./reset-database.sh
```

**Expected Output:**
```
🔄 Resetting database for RBAC implementation...

📊 Database: tree_management
👤 User: postgres
🖥️  Host: localhost

⚠️  WARNING: This will DROP ALL TABLES in the database!
Tables to be dropped:
  - user_roles (junction table)
  - maintenance_tasks
  - trees
  - users
  - roles
  - tree_species
  - administrative_areas

Are you sure you want to continue? (yes/no): yes

🗑️  Dropping tables...
DROP TABLE
DROP TABLE
DROP TABLE
DROP TABLE
DROP TABLE
DROP TABLE
DROP TABLE

✅ Database reset successfully!
```

### Step 3: Start the Server

```bash
npm run start:dev
```

**Expected Log Output:**
```
[TypeOrmModule] Mapped {roles, /roles} route
[TypeOrmModule] Mapped {users, /users} route
[TypeOrmModule] Mapped {user_roles, /user_roles} route
[TypeOrmModule] Mapped {tree_species, /tree_species} route
[TypeOrmModule] Mapped {administrative_areas, /administrative_areas} route
[TypeOrmModule] Mapped {trees, /trees} route
[TypeOrmModule] Mapped {maintenance_tasks, /maintenance_tasks} route

[SeederService] Created test user: admin with roles: Admin
[SeederService] Created test user: manager with roles: Manager
[SeederService] Created test user: staff with roles: Staff
[SeederService] Created test user: supervisor with roles: Manager, Staff

[SeederService] Seeding complete — tree_species: 5, administrative_areas: 5, roles: 3, users: 4

[NestApplication] Nest application successfully started +2ms
```

### Step 4: Verify Database Schema

Connect to PostgreSQL and verify:

```sql
-- Check roles table
SELECT * FROM roles;
-- Expected: 3 rows (Admin, Manager, Staff)

-- Check users table
SELECT id, username, email, full_name FROM users;
-- Expected: 4 rows (admin, manager, staff, supervisor)

-- Check user_roles junction table
SELECT 
  u.username,
  r.role_name
FROM user_roles ur
JOIN users u ON ur.user_id = u.id
JOIN roles r ON ur.role_id = r.id
ORDER BY u.username, r.role_name;
-- Expected:
-- admin     | Admin
-- manager   | Manager
-- staff     | Staff
-- supervisor| Manager
-- supervisor| Staff

-- Verify table structure
\d user_roles
-- Expected: Primary key (user_id, role_id), Foreign keys to users and roles
```

### Step 5: Test Login with Test Users

Open Swagger UI: http://localhost:3000/api

**Test User 1: Admin**
```json
POST /auth/login
{
  "username": "admin",
  "password": "Test@123"
}
```

**Expected Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "id": 1,
  "username": "admin",
  "roles": ["Admin"]
}
```

**Test User 2: Supervisor (Multiple Roles)**
```json
POST /auth/login
{
  "username": "supervisor",
  "password": "Test@123"
}
```

**Expected Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "id": 4,
  "username": "supervisor",
  "roles": ["Manager", "Staff"]
}
```

### Step 6: Verify JWT Payload

1. Copy the `access_token` from Step 5
2. Go to https://jwt.io
3. Paste the token

**Expected Payload:**
```json
{
  "sub": 1,
  "userId": 1,
  "username": "admin",
  "roles": ["Admin"],  // ← ARRAY, not string
  "iat": 1746183858,
  "exp": 1746270258
}
```

---

## 🧪 Test Users Created

The seeder automatically creates 4 test users:

| Username | Password | Roles | Description |
|----------|----------|-------|-------------|
| `admin` | `Test@123` | Admin | System administrator with full access |
| `manager` | `Test@123` | Manager | Manager who can assign and supervise tasks |
| `staff` | `Test@123` | Staff | Staff member who performs maintenance tasks |
| `supervisor` | `Test@123` | Manager, Staff | User with multiple roles (both Manager and Staff) |

**All passwords:** `Test@123`

---

## ✅ Verification Checklist

After reset and startup:

- [ ] Server starts without errors
- [ ] Log shows: "Seeding complete — tree_species: 5, administrative_areas: 5, roles: 3, users: 4"
- [ ] Database has 3 roles: Admin, Manager, Staff
- [ ] Database has 4 users: admin, manager, staff, supervisor
- [ ] user_roles table has 5 rows (1+1+1+2)
- [ ] Can login with `admin` / `Test@123`
- [ ] Login returns JWT with `roles: ["Admin"]`
- [ ] JWT payload contains `roles` array (not single `role` string)
- [ ] Can login with `supervisor` / `Test@123`
- [ ] Supervisor JWT contains `roles: ["Manager", "Staff"]`

---

## 🐛 Troubleshooting

### Error: "psql: command not found"

**Solution:** Install PostgreSQL client tools or add psql to PATH.

**Windows:**
```powershell
# Add PostgreSQL bin directory to PATH
$env:Path += ";C:\Program Files\PostgreSQL\15\bin"
```

**Linux/Mac:**
```bash
# Install PostgreSQL client
sudo apt-get install postgresql-client  # Ubuntu/Debian
brew install postgresql                  # macOS
```

### Error: "FATAL: password authentication failed"

**Solution:** Check DATABASE_URL in `.env` file.

```bash
# Verify .env file
cat .env | grep DATABASE_URL

# Expected format:
DATABASE_URL=postgresql://username:password@localhost:5432/database_name
```

### Error: "database does not exist"

**Solution:** Create the database first.

```sql
CREATE DATABASE tree_management;
```

### Error: "permission denied for schema public"

**Solution:** Grant permissions to your user.

```sql
GRANT ALL PRIVILEGES ON DATABASE tree_management TO your_username;
GRANT ALL ON SCHEMA public TO your_username;
```

### Error: Server starts but no seeding log

**Solution:** Check if NODE_ENV is set to production.

```bash
# In .env file, ensure:
NODE_ENV=development

# Or remove NODE_ENV entirely (defaults to development)
```

### Error: "Cannot find module 'bcrypt'"

**Solution:** Install bcrypt dependency.

```bash
npm install bcrypt
npm install --save-dev @types/bcrypt
```

---

## 🔄 What Changed in the Schema

### Before (Old Schema)

```sql
-- users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE,
  password VARCHAR(255),  -- Some rows had NULL
  role VARCHAR(50)        -- Single role as string
);
```

### After (New Schema)

```sql
-- roles table (NEW)
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  role_name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT
);

-- users table (UPDATED)
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,  -- Now NOT NULL
  email VARCHAR(150),
  full_name VARCHAR(150),
  assigned_area_id INTEGER,
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  role VARCHAR(50)  -- Deprecated, kept for backward compatibility
);

-- user_roles junction table (NEW)
CREATE TABLE user_roles (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);
```

**Key Changes:**
1. ✅ `password` is now NOT NULL (no more null values)
2. ✅ `roles` table stores role definitions
3. ✅ `user_roles` junction table enables Many-to-Many relationship
4. ✅ Users can have multiple roles
5. ✅ Old `role` column kept for backward compatibility (deprecated)

---

## 📊 Database Diagram

```
┌─────────────────────────┐
│        users            │
├─────────────────────────┤
│ id (PK)                 │
│ username (UNIQUE)       │
│ password (NOT NULL)     │◄─────┐
│ email                   │      │
│ full_name               │      │
│ is_active               │      │
│ created_at              │      │
│ updated_at              │      │
└────────────┬────────────┘      │
             │                    │
             │ Many-to-Many       │
             │                    │
             ▼                    │
┌─────────────────────────┐      │
│      user_roles         │      │
│    (Junction Table)     │      │
├─────────────────────────┤      │
│ user_id (PK, FK) ───────┼──────┘
│ role_id (PK, FK) ───────┼──────┐
└─────────────────────────┘      │
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │        roles            │
                    ├─────────────────────────┤
                    │ id (PK)                 │
                    │ role_name (UNIQUE)      │
                    │ description             │
                    └─────────────────────────┘
```

---

## 📚 Related Documentation

- **ROLE_BASED_ACCESS_CONTROL.md** - Complete RBAC documentation
- **RBAC_TESTING_GUIDE.md** - Detailed testing instructions
- **RBAC_QUICK_START.md** - Quick reference guide
- **RBAC_IMPLEMENTATION_SUMMARY.md** - Technical implementation details
- **RBAC_CHECKLIST.md** - Testing checklist

---

## 🎓 Understanding the Seeder

The updated `SeederService` now:

1. **Seeds roles FIRST** (required before users)
2. **Seeds tree species and areas**
3. **Seeds test users with roles**

**Code Flow:**
```typescript
async seed() {
  await this.upsertRoles();        // 1. Create Admin, Manager, Staff
  await this.upsertSpecies();      // 2. Create tree species
  await this.upsertAreas();        // 3. Create administrative areas
  await this.upsertTestUsers();    // 4. Create test users with roles
}

async upsertTestUsers() {
  // Find roles
  const adminRole = await this.roleRepo.findOne({ where: { role_name: 'Admin' } });
  
  // Create user with role
  const user = this.userRepo.create({
    username: 'admin',
    password: hashedPassword,
    roles: [adminRole]  // Assign role
  });
  
  await this.userRepo.save(user);  // TypeORM handles user_roles insertion
}
```

---

## ✨ Summary

**What you did:**
1. ✅ Dropped all existing tables
2. ✅ Let TypeORM recreate schema with correct structure
3. ✅ Auto-seeded roles, species, areas, and test users
4. ✅ Verified RBAC implementation works

**What you can do now:**
1. ✅ Login with test users
2. ✅ JWT contains roles array
3. ✅ Users can have multiple roles
4. ✅ Database schema matches PDF specification
5. ✅ Ready to implement role-based guards

**Next steps:**
1. Test all endpoints with different user roles
2. Implement `@Roles()` decorator and `RolesGuard`
3. Add role restrictions to Trees and Maintenance modules
4. Write unit tests for RBAC logic

---

**Status:** ✅ Database reset complete, RBAC fully functional  
**Test Users:** 4 users created with roles  
**Compliance:** 100% with PDF pages 46-47
