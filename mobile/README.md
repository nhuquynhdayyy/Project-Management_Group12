# Cây Xanh Đà Nẵng - Mobile App

Mobile application for field workers (Staff role) to manage tree maintenance tasks.

## Features

- **Authentication**: Login with backend credentials
- **Task Management**: View assigned maintenance tasks
- **GPS Geofencing**: Complete tasks only when within 10m of the tree
- **Location Tracking**: Automatic GPS verification
- **Task Details**: View tree information and task requirements

## Tech Stack

- React Native (Expo)
- TypeScript
- React Navigation
- Expo Location (GPS)
- Expo Camera (for future photo evidence)
- AsyncStorage (local auth persistence)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Update API URL in `src/api/client.ts`:
```typescript
const API_BASE_URL = 'http://YOUR_BACKEND_IP:3000';
```

**Note**: For Android emulator, use `http://10.0.2.2:3000`
**Note**: For iOS simulator, use `http://localhost:3000`
**Note**: For physical devices, use your computer's local IP address

3. Start the development server:
```bash
npm start
```

4. Run on device/emulator:
```bash
npm run android  # Android
npm run ios      # iOS (macOS only)
```

## Backend Integration

The mobile app connects to the same backend as the web frontend:

- `POST /auth/login` - Authentication
- `GET /maintenance/tasks/my-tasks` - Get tasks assigned to current user
- `POST /maintenance/tasks/:id/complete` - Complete task with GPS verification

## User Flow

1. **Login**: Staff enters username/password
2. **Task List**: View all assigned maintenance tasks
3. **Task Detail**: View tree location and task information
4. **Complete Task**: 
   - App requests GPS permission
   - Gets current location
   - Sends completion request with coordinates
   - Backend validates user is within 10m of tree
   - Shows success/error message

## Permissions

- **Location**: Required for GPS geofencing validation
- **Camera**: For future photo evidence feature

## Future Enhancements

- QR Code scanner to identify trees
- Camera integration for evidence photos
- Offline mode with sync
- Map view with tree markers
- Push notifications for new tasks
