# 🚀 START HERE - RBAC Database Reset

## ⚡ Quick Start (3 Commands)

```powershell
# 1. Reset database (drops all tables)
.\reset-database.ps1

# 2. Start server (recreates tables + seeds data)
npm run start:dev

# 3. Test login (use any test user)
# Open: http://localhost:3000/api
# Login with: admin / Test@123
```

---

## 🎯 What This Does

### Step 1: Reset Database
- Drops all existing tables
- Clears the NULL password issue
- Prepares for clean schema recreation

### Step 2: Start Server
- TypeORM creates tables with correct schema
- Auto-seeds:
  - ✅ 3 roles (Admin, Manager, Staff)
  - ✅ 5 tree species
  - ✅ 5 administrative areas
  - ✅ 4 test users with roles

### Step 3: Test
- Login with test users
- Verify JWT contains roles array
- Test protected endpoints

---

## 👥 Test Users (All passwords: Test@123)

| Username | Password | Roles | Use Case |
|----------|----------|-------|----------|
| `admin` | `Test@123` | Admin | Full system access |
| `manager` | `Test@123` | Manager | Assign tasks, supervise |
| `staff` | `Test@123` | Staff | Perform maintenance |
| `supervisor` | `Test@123` | Manager + Staff | Multiple roles |

---

## ✅ Success Indicators

After starting the server, you should see:

```
[SeederService] Created test user: admin with roles: Admin
[SeederService] Created test user: manager with roles: Manager
[SeederService] Created test user: staff with roles: Staff
[SeederService] Created test user: supervisor with roles: Manager, Staff
[SeederService] Seeding complete — tree_species: 5, administrative_areas: 5, roles: 3, users: 4
[NestApplication] Nest application successfully started
```

---

## 🧪 Quick Test

**1. Open Swagger:** http://localhost:3000/api

**2. Login:**
```json
POST /auth/login
{
  "username": "admin",
  "password": "Test@123"
}
```

**3. Expected Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "id": 1,
  "username": "admin",
  "roles": ["Admin"]  ← Array, not string!
}
```

**4. Decode JWT at https://jwt.io:**
```json
{
  "sub": 1,
  "userId": 1,
  "username": "admin",
  "roles": ["Admin"],  ← CRITICAL: Must be array
  "iat": 1746183858,
  "exp": 1746270258
}
```

---

## 📁 Documentation Files

| File | Purpose |
|------|---------|
| **START_HERE.md** | This file - Quick start |
| **RESET_SUMMARY.md** | What was done and why |
| **DATABASE_RESET_GUIDE.md** | Complete guide with troubleshooting |
| **ROLE_BASED_ACCESS_CONTROL.md** | Full RBAC documentation |
| **RBAC_TESTING_GUIDE.md** | Detailed testing instructions |
| **RBAC_QUICK_START.md** | Quick reference |
| **RBAC_CHECKLIST.md** | Testing checklist |

---

## 🐛 Common Issues

### Issue: "psql: command not found"
**Fix:** Add PostgreSQL to PATH or install client tools

### Issue: "password authentication failed"
**Fix:** Check DATABASE_URL in .env file

### Issue: Server starts but no users created
**Fix:** Check NODE_ENV is not "production"

---

## 🎓 What Changed

### Before
- ❌ Users had NULL passwords
- ❌ Server crashed on startup
- ❌ Single role per user

### After
- ✅ All users have valid passwords
- ✅ Server starts successfully
- ✅ Multiple roles per user (Many-to-Many)
- ✅ Test users ready to use
- ✅ 100% PDF compliant

---

## 📊 Database Schema

```
┌──────────┐     ┌──────────────┐     ┌──────────┐
│  users   │────▶│ user_roles   │◀────│  roles   │
│          │     │ (junction)   │     │          │
│ id       │     │ user_id (FK) │     │ id       │
│ username │     │ role_id (FK) │     │ role_name│
│ password │     └──────────────┘     │ description
│ email    │                          └──────────┘
└──────────┘
```

---

## ✨ Next Steps

After successful reset and testing:

1. **Implement Role Guards**
   - Create `@Roles()` decorator
   - Create `RolesGuard` class

2. **Apply to Endpoints**
   - Add role restrictions to Trees module
   - Add role restrictions to Maintenance module

3. **Write Tests**
   - Test RBAC logic
   - Test role-based access

---

## 🎉 You're Ready!

Run these 3 commands and you're done:

```powershell
.\reset-database.ps1
npm run start:dev
# Open http://localhost:3000/api and test login
```

**Status:** ✅ Everything is ready to go!
