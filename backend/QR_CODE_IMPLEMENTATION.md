# QR Code Generation Implementation

## Tổng quan

Tính năng QR Code Generation cho phép mỗi cây trong hệ thống có một mã QR riêng biệt. Staff có thể quét QR code ngoài thực địa để xem thông tin cây mà không cần tìm kiếm thủ công.

## Cài đặt

### 1. Thư viện đã cài đặt

```bash
npm install qrcode
npm install --save-dev @types/qrcode
```

### 2. Cấu trúc Database

Tree entity đã có trường `qr_code`:

```typescript
@Column({ type: 'varchar', length: 100, nullable: true })
qr_code: string;
```

Format của QR code: `cayxanh://tree/{id}`

## API Endpoints

### GET /trees/:id/qrcode

Tạo và trả về QR code dưới dạng ảnh PNG cho một cây cụ thể.

**Request:**
```
GET /trees/1/qrcode
Authorization: Bearer <token>
```

**Response:**
- Content-Type: `image/png`
- Body: PNG image buffer
- Filename: `tree-{id}-qrcode.png`

**Ví dụ sử dụng:**

```typescript
// Frontend - Download QR code
const downloadQRCode = async (treeId: number) => {
  const response = await fetch(`/api/trees/${treeId}/qrcode`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tree-${treeId}-qrcode.png`;
  a.click();
};
```

```typescript
// Frontend - Display QR code
<img 
  src={`/api/trees/${treeId}/qrcode`} 
  alt="QR Code"
  style={{ width: 300, height: 300 }}
/>
```

## Seeder Service

SeederService đã được cập nhật để tự động sinh `qr_code` cho 80 cây khi chạy seed:

```typescript
// Trong seedTrees()
trees.push({
  tree_code: `LC-${String(i).padStart(4, '0')}`,
  qr_code: `cayxanh://tree/${i}`, // Auto-generate
  // ... other fields
});

const savedTrees = await this.treeRepo.save(trees);

// Update với ID thực tế sau khi save
for (const tree of savedTrees) {
  tree.qr_code = `cayxanh://tree/${tree.id}`;
}
await this.treeRepo.save(savedTrees);
```

## Cập nhật QR Code cho cây đã tồn tại

Nếu database đã có cây mà chưa có `qr_code`, chạy script sau:

```bash
# Từ thư mục backend/
npx ts-node src/database/scripts/update-qr-codes.ts
```

Script này sẽ:
- Tìm tất cả cây trong database
- Cập nhật trường `qr_code` với format `cayxanh://tree/{id}`
- Chỉ cập nhật những cây chưa có QR code

## Testing

### 1. Test endpoint với curl

```bash
# Get QR code
curl -X GET "http://localhost:3000/trees/1/qrcode" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  --output tree-1-qrcode.png
```

### 2. Test với Postman/Insomnia

1. Tạo GET request đến `/trees/1/qrcode`
2. Thêm Authorization header với Bearer token
3. Send request
4. Xem preview ảnh PNG trong response

### 3. Verify QR code trong database

```sql
-- Check QR codes
SELECT id, tree_code, qr_code FROM trees LIMIT 10;

-- Count trees with QR codes
SELECT 
  COUNT(*) as total,
  COUNT(qr_code) as with_qr_code,
  COUNT(*) - COUNT(qr_code) as without_qr_code
FROM trees;
```

## QR Code Format

Format: `cayxanh://tree/{id}`

Ví dụ:
- Tree ID 1: `cayxanh://tree/1`
- Tree ID 42: `cayxanh://tree/42`

Format này là deep link cho mobile app, cho phép:
- Mobile app đăng ký URL scheme `cayxanh://`
- Khi quét QR, app tự động mở và parse tree ID
- App gọi API `GET /trees/{id}` để lấy thông tin chi tiết

## Mobile Integration (Hướng dẫn cho Frontend)

### 1. Quét QR Code (React Native/Expo)

```typescript
import { BarCodeScanner } from 'expo-barcode-scanner';

const QRScannerScreen = () => {
  const handleBarCodeScanned = ({ data }) => {
    // data = "cayxanh://tree/42"
    const match = data.match(/cayxanh:\/\/tree\/(\d+)/);
    if (match) {
      const treeId = parseInt(match[1]);
      // Navigate to tree detail screen
      navigation.navigate('TreeDetail', { treeId });
    }
  };

  return (
    <BarCodeScanner
      onBarCodeScanned={handleBarCodeScanned}
      style={StyleSheet.absoluteFillObject}
    />
  );
};
```

### 2. Deep Link Configuration

**app.json (Expo):**
```json
{
  "expo": {
    "scheme": "cayxanh",
    "ios": {
      "bundleIdentifier": "com.yourcompany.cayxanh"
    },
    "android": {
      "package": "com.yourcompany.cayxanh",
      "intentFilters": [
        {
          "action": "VIEW",
          "data": [
            {
              "scheme": "cayxanh"
            }
          ],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    }
  }
}
```

## Web Integration (Admin/Manager)

### Hiển thị nút tải QR Code

```typescript
// TreeDetailPage.tsx
const TreeDetailPage = ({ treeId }) => {
  const handleDownloadQR = async () => {
    const response = await fetch(`/api/trees/${treeId}/qrcode`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tree-${treeId}-qrcode.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div>
      <h1>Tree Details</h1>
      {/* ... other details ... */}
      <button onClick={handleDownloadQR}>
        📥 Tải QR Code
      </button>
    </div>
  );
};
```

## Definition of Done (DoD) Checklist

- [x] Cài đặt thư viện `qrcode` trong backend
- [x] Tạo endpoint `GET /trees/:id/qrcode` trả về ảnh PNG
- [x] Cập nhật SeederService tự động sinh `qr_code` cho 80 cây
- [ ] Frontend: Thêm nút "Tải QR Code" trong trang chi tiết cây (Admin/Manager)
- [ ] Mobile: Tạo màn hình QRScannerScreen.tsx với expo-barcode-scanner
- [ ] Mobile: Sau khi quét, gọi API và hiển thị thông tin cây
- [ ] Mobile: Thêm nút "Quét QR" vào TaskListScreen

## Troubleshooting

### Lỗi: "Tree not found"
- Kiểm tra tree ID có tồn tại trong database
- Verify authentication token

### QR code không quét được
- Kiểm tra format QR code: phải là `cayxanh://tree/{id}`
- Verify mobile app đã đăng ký URL scheme `cayxanh://`
- Test với QR code reader app khác

### Database không có qr_code
- Chạy script update: `npx ts-node src/database/scripts/update-qr-codes.ts`
- Hoặc chạy lại seeder: `POST /seeder/seed`

## Next Steps

1. **Frontend Web**: Implement nút "Tải QR Code" trong TreeDetailPage
2. **Mobile**: Setup expo-barcode-scanner và tạo QRScannerScreen
3. **Mobile**: Implement deep linking với URL scheme `cayxanh://`
4. **Testing**: Test end-to-end flow từ quét QR đến hiển thị thông tin cây
