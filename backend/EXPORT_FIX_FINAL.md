# Fix: Export Feature - Downgrade pdfmake

## Vấn đề
- Excel và PDF đều không export được
- Lỗi 500 Internal Server Error
- Nguyên nhân: **pdfmake 0.3.7 có bug nghiêm trọng** - `getBuffer()` callback không bao giờ được gọi (timeout)

## Giải pháp

### 1. Downgrade pdfmake từ 0.3.7 xuống 0.2.10
```bash
npm uninstall pdfmake
npm install pdfmake@0.2.10
```

**Lý do**: pdfmake 0.3.7 có bug với `getBuffer()` và `getBase64()` trong Node.js - callbacks không được gọi, dẫn đến timeout.

### 2. Sửa cách import vfs_fonts
**File**: `backend/src/modules/maintenance/export.service.ts`

```typescript
function getPdfMake() {
  if (!pdfMake) {
    const pdfMakeBuild = require('pdfmake/build/pdfmake');
    const pdfFonts = require('pdfmake/build/vfs_fonts');
    
    // For pdfmake 0.2.x, vfs_fonts exports pdfMake.vfs
    pdfMakeBuild.vfs = pdfFonts.pdfMake.vfs;
    pdfMake = pdfMakeBuild;
  }
  return pdfMake;
}
```

**Khác biệt giữa 0.2.x và 0.3.x**:
- **0.2.x**: `pdfFonts.pdfMake.vfs` (nested structure)
- **0.3.x**: `pdfFonts` (direct object) - NHƯNG BỊ BUG

### 3. Sử dụng getBase64() thay vì getBuffer()
```typescript
async exportToPdf(tasks: MaintenanceTask[]): Promise<Buffer> {
  const pdfMakeInstance = getPdfMake();
  // ... docDefinition ...
  
  return new Promise<Buffer>((resolve, reject) => {
    try {
      const pdfDoc = pdfMakeInstance.createPdf(docDefinition);
      
      // Use getBase64 instead of getBuffer (more reliable)
      pdfDoc.getBase64((base64String: string) => {
        const buffer = Buffer.from(base64String, 'base64');
        resolve(buffer);
      }, (error: Error) => {
        reject(error);
      });
    } catch (err) {
      reject(err);
    }
  });
}
```

## Test Results
```bash
npm test
# ✅ All 64 tests PASS

node test-export.js
# ✅ Excel export works! Buffer size: 6477
# ✅ PDF export works! Buffer size: 12298
```

## Các thay đổi khác đã thực hiện trước đó

### 1. Implemented RolesGuard
**File**: `backend/src/common/guards/roles.guard.ts`
- Kiểm tra user roles từ JWT token
- Chỉ cho phép Admin và Manager truy cập export endpoints
- Throw ForbiddenException (403) nếu không có quyền

### 2. Registered MaintenanceExportController
**File**: `backend/src/modules/maintenance/maintenance.module.ts`
- Added `MaintenanceExportController` to controllers
- Added `MaintenanceExportService` to providers
- Export endpoints now available at runtime

## API Endpoints

### GET /maintenance/tasks/export
**Query Parameters**:
- `format` (required): `xlsx` | `pdf`
- `from` (optional): Start date (YYYY-MM-DD)
- `to` (optional): End date (YYYY-MM-DD)

**Authorization**:
- Requires JWT token (JwtAuthGuard)
- Requires Admin or Manager role (RolesGuard)

**Example**:
```bash
GET /maintenance/tasks/export?format=xlsx&from=2026-01-01&to=2026-05-01
Authorization: Bearer <token>
```

## Hướng dẫn sử dụng

### 1. Restart Backend Server
```bash
cd backend
npm run start:dev
```

### 2. Test Export từ Frontend
1. Login as Admin or Manager
2. Navigate to Dashboard
3. Select date range (optional)
4. Click "Xuất Excel" or "Xuất PDF"
5. File should download automatically

### 3. Nếu vẫn gặp lỗi
- Kiểm tra backend logs trong terminal
- Kiểm tra JWT token còn hạn không
- Kiểm tra user có role Admin hoặc Manager không
- Kiểm tra database có maintenance tasks không

## Package Versions
```json
{
  "dependencies": {
    "exceljs": "^4.4.0",
    "pdfmake": "0.2.10"  // ⚠️ IMPORTANT: Must be 0.2.10, NOT 0.3.x
  },
  "devDependencies": {
    "@types/pdfmake": "^0.3.2"
  }
}
```

## Commit Message
```
fix(export): downgrade pdfmake to 0.2.10 to fix export timeout bug

pdfmake 0.3.7 has a critical bug where getBuffer() and getBase64() 
callbacks are never called in Node.js environment, causing timeouts.

Changes:
- Downgraded pdfmake from 0.3.7 to 0.2.10 (stable version)
- Updated vfs_fonts import: pdfFonts.pdfMake.vfs (0.2.x structure)
- Changed exportToPdf to use getBase64() instead of getBuffer()
- Lazy load pdfmake to avoid initialization errors

All 64 tests pass ✅
Excel and PDF export both working ✅
```

## Tài liệu tham khảo
- pdfmake GitHub Issues: https://github.com/bpampuch/pdfmake/issues
- Known bug in 0.3.x: getBuffer callback not firing in Node.js
- Recommended version: 0.2.10 (last stable before 0.3.x breaking changes)
