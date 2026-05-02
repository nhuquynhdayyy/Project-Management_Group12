# Mobile App Setup Summary

## Overview

The mobile application has been successfully bootstrapped for field workers (Staff role) to manage tree maintenance tasks on-site with GPS geofencing validation.

## Project Structure

```
mobile/
├── src/
│   ├── api/
│   │   ├── client.ts          # Axios client with JWT interceptor
│   │   ├── auth.ts             # Login API
│   │   ├── maintenance.ts      # Task management API
│   │   └── trees.ts            # Tree data API
│   ├── context/
│   │   └── AuthContext.tsx     # Authentication state management
│   └── screens/
│       ├── LoginScreen.tsx     # Login page
│       ├── TaskListScreen.tsx  # List of assigned tasks
│       └── TaskDetailScreen.tsx # Task details & completion
├── App.tsx                     # Main navigation
├── app.json                    # Expo configuration
└── package.json
```

## Features Implemented

### ✅ Authentication
- Login with backend credentials
- JWT token storage in AsyncStorage
- Automatic token injection in API requests
- Persistent login across app restarts

### ✅ Task Management
- View all tasks assigned to current user via `GET /maintenance/tasks/my-tasks`
- Filter by status (Pending, In Progress, Completed)
- Pull-to-refresh functionality
- Task detail view with tree information

### ✅ GPS Geofencing
- Requests location permission on task completion
- Gets current GPS coordinates using Expo Location
- Sends coordinates to backend for validation
- Backend enforces 10-meter radius using Haversine formula
- Shows clear error if user is too far from tree

### ✅ UI/UX
- Dark theme matching web frontend
- Vietnamese language throughout
- Status badges with color coding
- Loading states and error handling
- Responsive layout

## Backend Integration

The mobile app uses these existing endpoints:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/auth/login` | POST | User authentication |
| `/maintenance/tasks/my-tasks` | GET | Get tasks for current user |
| `/maintenance/tasks/:id/complete` | POST | Complete task with GPS validation |

## Configuration Required

### 1. Update API URL

Edit `mobile/src/api/client.ts`:

```typescript
const API_BASE_URL = 'http://YOUR_IP:3000';
```

**Important**: 
- Android Emulator: Use `http://10.0.2.2:3000`
- iOS Simulator: Use `http://localhost:3000`
- Physical Device: Use your computer's local IP (e.g., `http://192.168.1.100:3000`)

### 2. Backend CORS

Ensure backend allows mobile app origin. In `backend/src/main.ts`:

```typescript
app.enableCors({
  origin: '*', // For development
  credentials: true,
});
```

## Running the App

### Development

```bash
cd mobile
npm install
npm start
```

Then:
- Press `a` for Android emulator
- Press `i` for iOS simulator
- Scan QR code with Expo Go app on physical device

### Production Build

```bash
# Android APK
npm run android

# iOS (requires macOS)
npm run ios
```

## Testing Workflow

1. **Login as Staff User**:
   - Username: `staff1` (or any staff user from seeder)
   - Password: `password123`

2. **View Tasks**:
   - See list of assigned maintenance tasks
   - Pull down to refresh

3. **Complete Task**:
   - Tap on a task
   - Tap "Hoàn thành công việc"
   - App requests location permission
   - If within 10m of tree: Success ✅
   - If outside 10m: Error message with distance

## Permissions

### Android (`app.json`)
```json
"permissions": [
  "CAMERA",
  "ACCESS_FINE_LOCATION",
  "ACCESS_COARSE_LOCATION"
]
```

### iOS (`app.json`)
```json
"infoPlist": {
  "NSCameraUsageDescription": "...",
  "NSLocationWhenInUseUsageDescription": "..."
}
```

## Future Enhancements

### Phase 1 (Not Yet Implemented)
- [ ] QR Code scanner to identify trees
- [ ] Camera integration for evidence photos
- [ ] Upload photos to cloud storage (S3)
- [ ] Map view with tree markers

### Phase 2
- [ ] Offline mode with local database
- [ ] Sync when connection restored
- [ ] Push notifications for new tasks
- [ ] Task history and statistics

## Architecture Decisions

### Why Expo?
- Cross-platform (iOS + Android) from single codebase
- Built-in modules for Camera, Location, Barcode Scanner
- Easy development workflow with Expo Go
- Simplified build process

### Why React Navigation?
- Industry standard for React Native navigation
- Type-safe with TypeScript
- Supports nested navigators
- Good documentation

### Why AsyncStorage?
- Simple key-value storage for auth tokens
- Persistent across app restarts
- No need for complex database for auth only

## Security Considerations

1. **JWT Storage**: Tokens stored in AsyncStorage (secure on device)
2. **HTTPS**: Use HTTPS in production (not HTTP)
3. **Token Expiration**: Backend JWT expires after configured time
4. **GPS Spoofing**: Backend validates coordinates server-side
5. **API Security**: All endpoints require JWT authentication

## Troubleshooting

### "Network Error" on Login
- Check API_BASE_URL is correct
- Ensure backend is running
- Check CORS configuration
- For Android emulator, use `10.0.2.2` not `localhost`

### Location Permission Denied
- Check app.json has location permissions
- Rebuild app after adding permissions
- On iOS, check Settings > Privacy > Location Services

### "Cannot complete task - too far from tree"
- This is expected if you're not physically near the tree
- For testing, you can temporarily modify backend geofencing radius
- Or seed test data with trees at your current location

## Related Documentation

- [Backend RBAC Implementation](backend/ROLE_BASED_ACCESS_CONTROL.md)
- [Sprint 4 Summary](backend/SPRINT_4_SUMMARY.md)
- [Frontend README](frontend/README.md)
