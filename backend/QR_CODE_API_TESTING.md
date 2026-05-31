# QR Code API Testing Guide

## Prerequisites

1. Backend server đang chạy: `npm run start:dev`
2. Database đã được seed với 80 cây: `POST /seeder/seed`
3. Có JWT token hợp lệ (login với admin/manager/staff)

## API Endpoints

### 1. Generate QR Code (PNG Image)

**Endpoint:** `GET /trees/:id/qrcode`

**Description:** Tạo và trả về QR code dưới dạng ảnh PNG cho một cây cụ thể.

**Test với curl:**
```bash
# Get token first
TOKEN=$(curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Test@123"}' \
  | jq -r '.access_token')

# Download QR code
curl -X GET "http://localhost:3000/trees/1/qrcode" \
  -H "Authorization: Bearer $TOKEN" \
  --output tree-1-qrcode.png

# Open the image
start tree-1-qrcode.png  # Windows
# open tree-1-qrcode.png  # macOS
# xdg-open tree-1-qrcode.png  # Linux
```

**Test với Postman:**
1. Create new GET request: `http://localhost:3000/trees/1/qrcode`
2. Add Authorization header: `Bearer YOUR_TOKEN`
3. Send request
4. Click "Save Response" → "Save to a file" → `tree-1-qrcode.png`
5. Open the PNG file and scan with QR reader app

**Expected Response:**
- Status: 200 OK
- Content-Type: `image/png`
- Body: PNG image buffer
- QR code contains: `cayxanh://tree/1`

---

### 2. Get Tree by QR Code

**Endpoint:** `GET /trees/qr/:qrCode`

**Description:** Lấy thông tin cây dựa trên QR code string. Endpoint này hữu ích cho mobile app sau khi quét QR code.

**Test với curl:**
```bash
# Method 1: URL-encoded QR code
curl -X GET "http://localhost:3000/trees/qr/cayxanh%3A%2F%2Ftree%2F1" \
  -H "Authorization: Bearer $TOKEN"

# Method 2: Direct QR code (may need proper encoding)
curl -X GET "http://localhost:3000/trees/qr/cayxanh://tree/1" \
  -H "Authorization: Bearer $TOKEN"
```

**Test với Postman:**
1. Create new GET request: `http://localhost:3000/trees/qr/cayxanh://tree/1`
2. Add Authorization header: `Bearer YOUR_TOKEN`
3. Send request

**Expected Response:**
```json
{
  "id": 1,
  "tree_code": "LC-0001",
  "qr_code": "cayxanh://tree/1",
  "species_id": 2,
  "area_id": 1,
  "location": {
    "type": "Point",
    "coordinates": [108.156789, 16.089234]
  },
  "planting_year": 2015,
  "height_m": 12.5,
  "trunk_diameter_cm": 45.3,
  "canopy_diameter_m": null,
  "tilt_degree": null,
  "health_status": "Tốt",
  "last_maintained_at": "2026-04-15T10:30:00.000Z",
  "created_by": null,
  "created_at": "2026-05-29T08:00:00.000Z",
  "updated_at": "2026-05-29T08:00:00.000Z",
  "species": {
    "id": 2,
    "common_name": "Muồng Tím",
    "scientific_name": "Peltophorum pterocarpum",
    "description": "Cây hoa vàng, tán rộng, thường trồng dọc đường phố"
  },
  "area": {
    "id": 1,
    "area_name": "Quận Liên Chiểu",
    "parent_id": null
  }
}
```

---

### 3. Get Tree by ID (Existing Endpoint)

**Endpoint:** `GET /trees/:id`

**Test với curl:**
```bash
curl -X GET "http://localhost:3000/trees/1" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Complete Testing Flow

### Step 1: Login and Get Token
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Test@123"}'
```

Response:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "full_name": "System Administrator",
    "roles": ["Admin"]
  }
}
```

### Step 2: Generate QR Code
```bash
curl -X GET "http://localhost:3000/trees/1/qrcode" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  --output tree-1-qrcode.png
```

### Step 3: Scan QR Code
- Open `tree-1-qrcode.png`
- Scan with any QR reader app (phone camera, QR scanner app)
- Should show: `cayxanh://tree/1`

### Step 4: Get Tree Info by QR Code
```bash
curl -X GET "http://localhost:3000/trees/qr/cayxanh%3A%2F%2Ftree%2F1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Testing Multiple Trees

```bash
# Generate QR codes for trees 1-10
for i in {1..10}; do
  curl -X GET "http://localhost:3000/trees/$i/qrcode" \
    -H "Authorization: Bearer $TOKEN" \
    --output "tree-$i-qrcode.png"
  echo "Generated QR code for tree $i"
done
```

---

## Verify QR Codes in Database

```sql
-- Check QR codes
SELECT id, tree_code, qr_code 
FROM trees 
WHERE qr_code IS NOT NULL 
LIMIT 10;

-- Count trees with QR codes
SELECT 
  COUNT(*) as total_trees,
  COUNT(qr_code) as trees_with_qr,
  COUNT(*) - COUNT(qr_code) as trees_without_qr
FROM trees;

-- Find tree by QR code
SELECT * FROM trees WHERE qr_code = 'cayxanh://tree/1';
```

---

## Mobile App Integration Example

### React Native / Expo

```typescript
import { BarCodeScanner } from 'expo-barcode-scanner';
import { useState } from 'react';

const QRScannerScreen = () => {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);

  // Request camera permission
  useEffect(() => {
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarCodeScanned = async ({ data }) => {
    setScanned(true);
    
    // data = "cayxanh://tree/42"
    console.log('QR Code scanned:', data);
    
    // Method 1: Parse ID and call GET /trees/:id
    const match = data.match(/cayxanh:\/\/tree\/(\d+)/);
    if (match) {
      const treeId = parseInt(match[1]);
      const response = await fetch(`${API_URL}/trees/${treeId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const tree = await response.json();
      navigation.navigate('TreeDetail', { tree });
    }
    
    // Method 2: Call GET /trees/qr/:qrCode
    const encodedQR = encodeURIComponent(data);
    const response = await fetch(`${API_URL}/trees/qr/${encodedQR}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const tree = await response.json();
    navigation.navigate('TreeDetail', { tree });
  };

  if (hasPermission === null) {
    return <Text>Requesting camera permission...</Text>;
  }
  if (hasPermission === false) {
    return <Text>No access to camera</Text>;
  }

  return (
    <View style={{ flex: 1 }}>
      <BarCodeScanner
        onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
        style={StyleSheet.absoluteFillObject}
      />
      {scanned && (
        <Button title="Scan Again" onPress={() => setScanned(false)} />
      )}
    </View>
  );
};
```

---

## Troubleshooting

### Error: "Tree not found"
- Verify tree ID exists in database
- Check if tree was seeded: `SELECT COUNT(*) FROM trees;`
- Run seeder if needed: `POST /seeder/seed`

### Error: "Unauthorized"
- Check if JWT token is valid
- Login again to get fresh token
- Verify token is included in Authorization header

### QR Code doesn't scan
- Ensure QR code image is clear and not corrupted
- Try different QR reader apps
- Verify QR code contains correct format: `cayxanh://tree/{id}`

### Database doesn't have qr_code
- Run update script: `npx ts-node src/database/scripts/update-qr-codes.ts`
- Or re-run seeder: `POST /seeder/seed` (will skip if trees exist)

---

## Next Steps

1. ✅ Backend API complete
2. [ ] Frontend: Add "Download QR Code" button in TreeDetailPage
3. [ ] Mobile: Implement QR scanner with expo-barcode-scanner
4. [ ] Mobile: Setup deep linking with `cayxanh://` scheme
5. [ ] Test end-to-end: Scan QR → Display tree info → Show maintenance tasks

---

**Last Updated:** 2026-05-29  
**Status:** ✅ Ready for Testing
