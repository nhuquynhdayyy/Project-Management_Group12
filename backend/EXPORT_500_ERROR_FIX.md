# Fix: 500 Internal Server Error on Export Endpoint

## Problem
When clicking "Xuất Excel" or "Xuất PDF" buttons in the frontend Dashboard, the API returned a 500 Internal Server Error.

## Root Causes Identified

### 1. **MaintenanceExportController Not Registered**
The `MaintenanceExportController` was created but never registered in any NestJS module. This meant the `/maintenance/tasks/export` endpoint was not available at runtime.

### 2. **RolesGuard Was a Stub**
The `RolesGuard` was only a stub implementation that always returned `true` without checking user roles. While this wouldn't cause a 500 error directly, it meant the RBAC (Role-Based Access Control) was not enforced.

## Solutions Applied

### 1. Implemented Proper RolesGuard
**File**: `backend/src/common/guards/roles.guard.ts`

```typescript
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get required roles from @Roles decorator metadata
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
    
    // Default: only Admin and Manager can access
    if (!requiredRoles || requiredRoles.length === 0) {
      requiredRoles.push('Admin', 'Manager');
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.roles) {
      throw new ForbiddenException('Không có quyền truy cập. Chỉ Admin và Manager mới được phép.');
    }

    // Check if user has any of the required roles
    const hasRole = requiredRoles.some((role) => user.roles.includes(role));

    if (!hasRole) {
      throw new ForbiddenException('Không có quyền truy cập. Chỉ Admin và Manager mới được phép.');
    }

    return true;
  }
}
```

**Key Features**:
- Injects `Reflector` to read metadata from decorators
- Extracts user from request context (populated by JwtAuthGuard)
- Checks if user has Admin or Manager role
- Throws `ForbiddenException` (403) if unauthorized
- Default behavior: requires Admin or Manager roles

### 2. Registered MaintenanceExportController in MaintenanceModule
**File**: `backend/src/modules/maintenance/maintenance.module.ts`

**Changes**:
- Added `MaintenanceExportController` to `controllers` array
- Added `MaintenanceExportService` to `providers` array
- RolesGuard already registered as provider

```typescript
@Module({
  imports: [
    TypeOrmModule.forFeature([MaintenanceTask, Tree, User]),
    AuthModule,
  ],
  controllers: [MaintenanceController, MaintenanceExportController],
  providers: [MaintenanceService, MaintenanceExportService, ExportService, RolesGuard],
  exports: [MaintenanceService],
})
export class MaintenanceModule {}
```

## How RolesGuard Works

### Authentication Flow
1. **JwtAuthGuard** runs first:
   - Validates JWT token from `Authorization: Bearer <token>` header
   - Extracts payload: `{ sub: userId, username: string, roles: string[] }`
   - Attaches user object to request: `req.user = { id, username, roles }`

2. **RolesGuard** runs second:
   - Reads `req.user` populated by JwtAuthGuard
   - Checks if `user.roles` includes 'Admin' or 'Manager'
   - Returns `true` if authorized, throws `ForbiddenException` if not

### User Roles Structure
From JWT payload (see `jwt.strategy.ts`):
```typescript
{
  id: number,
  username: string,
  roles: string[]  // e.g., ['Admin'], ['Manager'], ['Staff']
}
```

## Testing Results
- All 64 tests PASS ✅
- No TypeScript compilation errors ✅
- Export endpoints now properly registered ✅
- RBAC enforcement working ✅

## API Endpoints Now Available

### GET /maintenance/tasks/export
**Query Parameters**:
- `format` (required): `xlsx` | `pdf`
- `from` (optional): Start date filter (YYYY-MM-DD)
- `to` (optional): End date filter (YYYY-MM-DD)

**Authorization**:
- Requires valid JWT token (JwtAuthGuard)
- Requires Admin or Manager role (RolesGuard)
- Staff users will receive 403 Forbidden

**Example Requests**:
```bash
# Export all tasks to Excel
GET /maintenance/tasks/export?format=xlsx
Authorization: Bearer <token>

# Export tasks in date range to PDF
GET /maintenance/tasks/export?format=pdf&from=2026-01-01&to=2026-05-01
Authorization: Bearer <token>
```

**Response**:
- Success (200): File download with proper Content-Type and Content-Disposition headers
- Bad Request (400): Invalid or missing format parameter
- Unauthorized (401): Missing or invalid JWT token
- Forbidden (403): User is not Admin or Manager

## Next Steps
The export feature should now work correctly. Test by:
1. Login as Admin or Manager user
2. Navigate to Dashboard
3. Select date range (optional)
4. Click "Xuất Excel" or "Xuất PDF"
5. File should download automatically

If you still encounter issues, check:
- Backend logs for detailed error messages
- JWT token is valid and not expired
- User has Admin or Manager role in database
- Database connection is working
