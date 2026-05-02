# Quick Start Guide - Cây Xanh Đà Nẵng

## 🎯 Project Overview

Urban tree management system with:
- **Web Frontend**: Dashboard for Admin/Manager (office use)
- **Mobile App**: Task management for Staff (field use)
- **Backend API**: NestJS with PostGIS, JWT auth, RBAC

---

## 🚀 Quick Start

### 1. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your PostgreSQL credentials

# Start PostgreSQL with PostGIS
# Ensure database exists: urban_tree_management

# Run migrations and seed data
npm run start:dev
# Seeder runs automatically on startup

# Backend runs on http://localhost:3000
```

**Test Users** (created by seeder):
- Admin: `admin` / `password123`
- Manager: `manager1` / `password123`
- Staff: `staff1` / `password123`

### 2. Web Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Frontend runs on http://localhost:5173
```

**Login and Test**:
1. Login as `admin` → See Dashboard + Map
2. Login as `staff1` → See Map only (no Dashboard)
3. Try accessing `/dashboard` as Staff → Redirected to `/map`

### 3. Mobile App Setup

```bash
cd mobile

# Install dependencies
npm install

# Update API URL in src/api/client.ts
# For Android Emulator: http://10.0.2.2:3000
# For iOS Simulator: http://localhost:3000
# For Physical Device: http://YOUR_LOCAL_IP:3000

# Start Expo dev server
npm start

# Then:
# - Press 'a' for Android emulator
# - Press 'i' for iOS simulator
# - Scan QR with Expo Go on physical device
```

**Login and Test**:
1. Login as `staff1` / `password123`
2. View assigned tasks
3. Tap a task → View details
4. Tap "Hoàn thành công việc"
5. Grant location permission
6. If within 10m of tree → Success ✅
7. If outside 10m → Error with distance 🚫

---

## 📁 Project Structure

```
.
├── backend/                 # NestJS API
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/       # JWT authentication + RBAC
│   │   │   ├── trees/      # Tree CRUD + PostGIS
│   │   │   └── maintenance/ # Task management + Geofencing
│   │   ├── entities/       # TypeORM entities
│   │   └── database/       # Seeder
│   └── package.json
│
├── frontend/               # React + Vite + CesiumJS
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── MapPage.tsx      # 3D Cesium map
│   │   │   └── DashboardPage.tsx # Analytics (Admin/Manager only)
│   │   ├── components/
│   │   │   ├── AppShell.tsx     # Navigation with role filtering
│   │   │   ├── ProtectedRoute.tsx
│   │   │   └── RoleGuard.tsx    # Route-level access control
│   │   ├── context/
│   │   │   └── AuthContext.tsx
│   │   └── api/
│   └── package.json
│
└── mobile/                 # React Native (Expo)
    ├── src/
    │   ├── screens/
    │   │   ├── LoginScreen.tsx
    │   │   ├── TaskListScreen.tsx
    │   │   └── TaskDetailScreen.tsx
    │   ├── context/
    │   │   └── AuthContext.tsx
    │   └── api/
    └── package.json
```

---

## 🔐 Role-Based Access Control

| Feature | Admin | Manager | Staff |
|---------|-------|---------|-------|
| Web Dashboard | ✅ | ✅ | ❌ |
| Web Map | ✅ | ✅ | ✅ |
| Mobile App | ❌ | ❌ | ✅ |
| Create Tasks | ✅ | ✅ | ❌ |
| Complete Tasks | ❌ | ❌ | ✅ |
| View All Trees | ✅ | ✅ | ✅ |
| View All Tasks | ✅ | ✅ | ❌ |
| View My Tasks | N/A | N/A | ✅ |

---

## 🗺️ Key Features

### Backend
- ✅ JWT Authentication with role-based authorization
- ✅ PostGIS spatial queries (ST_DWithin for radius search)
- ✅ GPS Geofencing (10m radius using Haversine formula)
- ✅ Tree CRUD with health status tracking
- ✅ Maintenance task management
- ✅ Automatic data seeding (80 trees, 60 tasks)

### Web Frontend
- ✅ 3D Cesium globe with color-coded tree markers
- ✅ Dashboard with KPIs and charts (Recharts)
- ✅ Role-based navigation (Staff cannot see Dashboard)
- ✅ Route-level access control with RoleGuard
- ✅ Smart default redirects based on user role

### Mobile App
- ✅ Staff-only task management
- ✅ GPS-verified task completion
- ✅ Location permission handling
- ✅ Pull-to-refresh task list
- ✅ Dark theme matching web frontend

---

## 🧪 Testing Scenarios

### Scenario 1: Admin Dashboard Access
1. Web: Login as `admin`
2. Should redirect to `/dashboard`
3. See KPI cards, charts, tree statistics
4. Navigate to Map → See all trees

### Scenario 2: Staff Restricted Access
1. Web: Login as `staff1`
2. Should redirect to `/map`
3. Sidebar shows only "Bản đồ 3D" (no Dashboard)
4. Try accessing `/dashboard` → Redirected to `/map`

### Scenario 3: Mobile Task Completion (Success)
1. Mobile: Login as `staff1`
2. See list of assigned tasks
3. Tap a Pending task
4. Tap "Hoàn thành công việc"
5. Grant location permission
6. **If within 10m**: Task marked as Completed ✅

### Scenario 4: Mobile Task Completion (Geofence Fail)
1. Mobile: Login as `staff1`
2. Tap a Pending task
3. Tap "Hoàn thành công việc"
4. **If outside 10m**: Error message shows distance 🚫
5. Task remains Pending

---

## 🔧 Configuration

### Backend Environment Variables

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=urban_tree_management

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# Server
PORT=3000
NODE_ENV=development
```

### Frontend API URL

`frontend/src/api/client.ts`:
```typescript
const API_BASE_URL = 'http://localhost:3000';
```

### Mobile API URL

`mobile/src/api/client.ts`:
```typescript
// Android Emulator
const API_BASE_URL = 'http://10.0.2.2:3000';

// iOS Simulator
const API_BASE_URL = 'http://localhost:3000';

// Physical Device
const API_BASE_URL = 'http://192.168.1.100:3000'; // Your local IP
```

---

## 📊 Seeded Data

The backend automatically seeds:

### Roles
- Admin
- Manager
- Staff

### Users
- `admin` / `password123` (Admin role)
- `manager1` / `password123` (Manager role)
- `staff1`, `staff2`, `staff3` / `password123` (Staff role)

### Trees
- 80 trees in Quận Liên Chiểu, Đà Nẵng
- Coordinates: lat 16.065–16.115, lng 108.115–108.175
- Health distribution: 50% Tốt, 25% Yếu, 15% Sâu bệnh, 10% Chết
- 10 species: Phượng vĩ, Bằng lăng, Sao đen, etc.

### Maintenance Tasks
- 60 tasks over last 14 days
- 70% completed with realistic timestamps
- Assigned to staff1, staff2, staff3
- Task types: Cắt tỉa, Bón phân, Tưới nước, Kiểm tra

---

## 🐛 Troubleshooting

### Backend won't start
- Check PostgreSQL is running
- Ensure PostGIS extension is installed: `CREATE EXTENSION postgis;`
- Verify database exists
- Check .env credentials

### Frontend "Network Error"
- Ensure backend is running on port 3000
- Check CORS is enabled in backend
- Verify API_BASE_URL in `src/api/client.ts`

### Mobile "Network Error"
- Check API_BASE_URL is correct for your platform
- Android Emulator: Use `10.0.2.2` not `localhost`
- Physical device: Use computer's local IP
- Ensure backend allows CORS from all origins (dev only)

### Mobile "Location Permission Denied"
- Check `app.json` has location permissions
- Rebuild app after adding permissions
- iOS: Settings > Privacy > Location Services
- Android: Settings > Apps > Permissions

### "Cannot complete task - too far from tree"
- This is expected if you're not near the tree
- For testing: Modify backend geofencing radius temporarily
- Or: Seed test data with trees at your current location

---

## 📚 Documentation

- [Architecture Overview](ARCHITECTURE.md)
- [Backend RBAC](backend/ROLE_BASED_ACCESS_CONTROL.md)
- [Sprint 3 Summary](backend/SPRINT_3_SUMMARY.md)
- [Sprint 4 Summary](backend/SPRINT_4_SUMMARY.md)
- [Mobile Setup](MOBILE_APP_SETUP.md)
- [Session Summary](SESSION_SUMMARY.md)

---

## 🎯 Next Steps

### Priority 1: Cloud Storage (S3)
- [ ] Install AWS SDK
- [ ] Create CloudStorageService
- [ ] Update task completion to accept image upload
- [ ] Mobile: Add camera integration
- [ ] Frontend: Display uploaded images

### Priority 2: QR Code Scanner
- [ ] Mobile: Add QR scanner screen
- [ ] Scan tree QR code → Fetch tree details
- [ ] Show related tasks for scanned tree

### Priority 3: Mobile Map View
- [ ] Add map screen with react-native-maps
- [ ] Display all trees as markers
- [ ] Color-code by health status
- [ ] Tap marker → Tree details

---

## 🤝 Contributing

1. Follow TDD methodology (tests first)
2. Match existing code style
3. Use TypeScript strict mode
4. Add Swagger docs for new endpoints
5. Update relevant documentation

---

## 📝 License

Internal project for Urban Tree Management - Đà Nẵng
