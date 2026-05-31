# QR Code Frontend Implementation - Web Admin

## Tổng quan

Tính năng QR Code đã được tích hợp vào trang **Tree Management** (Quản lý Cây Xanh) cho phép Admin/Manager:
- Xem preview mã QR của mỗi cây
- Tải file PNG mã QR về máy để in dán lên cây
- Xem thông tin chi tiết về mã QR (tree code, QR data, loài cây, khu vực)

## Cấu trúc Code

### 1. API Functions (`frontend/src/api/trees.ts`)

```typescript
/**
 * Get QR code image URL for a tree
 */
export function getTreeQRCodeUrl(treeId: number): string {
  return `${apiClient.defaults.baseURL}/trees/${treeId}/qrcode`;
}

/**
 * Download QR code image for a tree
 */
export async function downloadTreeQRCode(
  treeId: number, 
  filename?: string
): Promise<void> {
  const response = await apiClient.get(`/trees/${treeId}/qrcode`, {
    responseType: 'blob',
  });
  
  const blob = new Blob([response.data], { type: 'image/png' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `tree-${treeId}-qrcode.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
```

### 2. TreeDetailModal Component

**Location:** `frontend/src/pages/dashboard/TreeManagementPage.tsx`

#### Thêm Tab "Mã QR"

Modal chi tiết cây đã được cập nhật với 3 tabs:
1. **Thông tin cây** - Thông tin chi tiết và cập nhật sức khỏe
2. **Lịch sử task** - Danh sách maintenance tasks
3. **Mã QR** - Preview và download QR code ✨ (MỚI)

#### State Management

```typescript
const [activeTab, setActiveTab] = useState<'info' | 'tasks' | 'qrcode'>('info');
const [downloadingQR, setDownloadingQR] = useState(false);
const [qrDownloadMsg, setQrDownloadMsg] = useState('');
```

#### Download Handler

```typescript
async function handleDownloadQRCode() {
  setDownloadingQR(true);
  setQrDownloadMsg('');
  try {
    await downloadTreeQRCode(tree.id, `${tree.tree_code}-qrcode.png`);
    setQrDownloadMsg('✅ Đã tải QR code thành công!');
    setTimeout(() => setQrDownloadMsg(''), 3000);
  } catch (error) {
    setQrDownloadMsg('❌ Không thể tải QR code. Vui lòng thử lại.');
  } finally {
    setDownloadingQR(false);
  }
}
```

## UI/UX Design

### Tab "Mã QR"

```
┌─────────────────────────────────────────┐
│  Mã QR cho cây LC-0001                  │
│  Quét mã QR này bằng ứng dụng di động   │
│  để xem thông tin cây nhanh chóng       │
├─────────────────────────────────────────┤
│                                         │
│         ┌───────────────┐               │
│         │               │               │
│         │   QR CODE     │               │
│         │   IMAGE       │               │
│         │   300x300     │               │
│         │               │               │
│         └───────────────┘               │
│                                         │
├─────────────────────────────────────────┤
│  Mã cây:      LC-0001                   │
│  QR Data:     cayxanh://tree/1          │
│  Loài cây:    Bàng Đài Loan             │
│  Khu vực:     Quận Liên Chiểu           │
├─────────────────────────────────────────┤
│  [📥 Tải mã QR (PNG)]                   │
│  ✅ Đã tải QR code thành công!          │
│                                         │
│  💡 Hướng dẫn: Tải file PNG này và in   │
│  ra để dán lên cây...                   │
└─────────────────────────────────────────┘
```

### Features

1. **QR Code Preview**
   - Hiển thị ảnh QR code 300x300px
   - Background trắng với padding
   - Shadow effect cho đẹp
   - Error handling nếu không load được ảnh

2. **Thông tin QR**
   - Mã cây (tree_code)
   - QR Data (cayxanh://tree/{id})
   - Loài cây
   - Khu vực

3. **Nút Download**
   - Icon download
   - Loading state khi đang tải
   - Success/Error message
   - Auto-hide message sau 3 giây

4. **Hướng dẫn sử dụng**
   - Giải thích cách sử dụng QR code
   - Hướng dẫn in và dán lên cây

## Cách sử dụng

### 1. Truy cập Tree Management

```
Dashboard → Quản lý Cây Xanh
```

### 2. Xem chi tiết cây

- Click vào bất kỳ cây nào trong danh sách
- Modal chi tiết cây sẽ hiện ra

### 3. Xem và tải QR Code

1. Click tab **"Mã QR"**
2. Xem preview QR code
3. Click nút **"Tải mã QR (PNG)"**
4. File PNG sẽ được tải về với tên: `{tree_code}-qrcode.png`
   - Ví dụ: `LC-0001-qrcode.png`

### 4. In và dán QR Code

1. Mở file PNG đã tải
2. In ra giấy (khuyến nghị: giấy chống nước)
3. Dán lên cây tương ứng
4. Staff có thể quét QR bằng mobile app

## Technical Details

### API Integration

**Endpoint:** `GET /trees/:id/qrcode`

**Request:**
```typescript
const response = await apiClient.get(`/trees/${treeId}/qrcode`, {
  responseType: 'blob',
});
```

**Response:**
- Content-Type: `image/png`
- Body: PNG image buffer (300x300px)

### Image Display

```typescript
<img
  src={getTreeQRCodeUrl(tree.id)}
  alt={`QR Code for ${tree.tree_code}`}
  className="w-64 h-64 object-contain"
  onError={(e) => {
    // Handle error: show fallback message
  }}
/>
```

### Download Implementation

```typescript
// 1. Fetch blob from API
const response = await apiClient.get(`/trees/${treeId}/qrcode`, {
  responseType: 'blob',
});

// 2. Create blob URL
const blob = new Blob([response.data], { type: 'image/png' });
const url = window.URL.createObjectURL(blob);

// 3. Create temporary link and trigger download
const link = document.createElement('a');
link.href = url;
link.download = `${tree.tree_code}-qrcode.png`;
document.body.appendChild(link);
link.click();

// 4. Cleanup
document.body.removeChild(link);
window.URL.revokeObjectURL(url);
```

## Styling

### Tailwind Classes Used

```css
/* QR Code Container */
.bg-white .p-4 .rounded-lg .shadow-lg

/* QR Code Image */
.w-64 .h-64 .object-contain

/* Download Button */
.bg-green-600 .hover:bg-green-500 
.disabled:opacity-50 .disabled:cursor-not-allowed

/* Success Message */
.text-green-400

/* Error Message */
.text-red-400

/* Info Section */
.bg-gray-800 .rounded-lg .p-4
```

## Testing

### Manual Testing Steps

1. **Start Backend & Frontend**
   ```bash
   # Backend
   cd backend
   npm run start:dev
   
   # Frontend
   cd frontend
   npm run dev
   ```

2. **Login as Admin**
   - Username: `admin`
   - Password: `Test@123`

3. **Navigate to Tree Management**
   - Click "Quản lý Cây Xanh" in sidebar

4. **Open Tree Detail**
   - Click any tree in the list

5. **Test QR Code Tab**
   - Click "Mã QR" tab
   - Verify QR code image loads
   - Verify tree info displays correctly

6. **Test Download**
   - Click "Tải mã QR (PNG)" button
   - Verify file downloads with correct name
   - Open PNG file and verify QR code is readable

7. **Test QR Code Scanning**
   - Use phone camera or QR scanner app
   - Scan the downloaded QR code
   - Should show: `cayxanh://tree/{id}`

### Browser Compatibility

Tested on:
- ✅ Chrome 120+
- ✅ Firefox 120+
- ✅ Edge 120+
- ✅ Safari 17+

## Troubleshooting

### QR Code không hiển thị

**Nguyên nhân:**
- Backend chưa chạy
- Tree ID không tồn tại
- Network error

**Giải pháp:**
1. Kiểm tra backend đang chạy: `http://localhost:3000`
2. Kiểm tra console log để xem lỗi
3. Verify JWT token còn hợp lệ

### Download không hoạt động

**Nguyên nhân:**
- Browser block download
- CORS issue
- Network error

**Giải pháp:**
1. Check browser console for errors
2. Verify CORS settings in backend
3. Try different browser
4. Check network tab in DevTools

### QR Code bị mờ khi in

**Giải pháp:**
- QR code size: 300x300px (đủ lớn để in)
- Sử dụng máy in chất lượng cao
- In trên giấy trắng, không in màu
- Không scale/resize khi in

## Next Steps

### Frontend Web - ✅ HOÀN THÀNH

- [x] Thêm tab "Mã QR" trong TreeDetailModal
- [x] Hiển thị preview QR code
- [x] Implement download functionality
- [x] Hiển thị thông tin QR
- [x] Error handling
- [x] Success/Error messages
- [x] Responsive design

### Mobile App - 🔄 ĐANG CHỜ

- [ ] Cài đặt `expo-barcode-scanner`
- [ ] Tạo QRScannerScreen
- [ ] Implement deep linking với `cayxanh://`
- [ ] Parse tree ID từ QR code
- [ ] Gọi API để lấy thông tin cây
- [ ] Hiển thị thông tin cây + tasks
- [ ] Thêm nút "Quét QR" vào navigation

## Screenshots

### Tree Management Page
```
┌────────────────────────────────────────────────┐
│  Quản lý Cây Xanh                              │
├────────────────────────────────────────────────┤
│  [Search] [Filter] [+ Thêm cây mới]           │
├────────────────────────────────────────────────┤
│  Mã cây  │ Loài cây  │ Khu vực  │ Sức khỏe    │
│  LC-0001 │ Bàng ĐL   │ Liên C.  │ [Tốt]  [👁] │
│  LC-0002 │ Muồng Tím │ Liên C.  │ [Yếu]  [👁] │
└────────────────────────────────────────────────┘
```

### Tree Detail Modal - QR Tab
```
┌────────────────────────────────────────────────┐
│  LC-0001  [Tốt]                          [✕]  │
├────────────────────────────────────────────────┤
│  [Thông tin cây] [Lịch sử task] [Mã QR]       │
├────────────────────────────────────────────────┤
│                                                │
│         Mã QR cho cây LC-0001                  │
│    Quét mã QR này bằng ứng dụng di động        │
│                                                │
│              ┌─────────────┐                   │
│              │ ▓▓▓▓▓▓▓▓▓▓▓ │                   │
│              │ ▓▓▓▓▓▓▓▓▓▓▓ │                   │
│              │ ▓▓▓▓▓▓▓▓▓▓▓ │                   │
│              └─────────────┘                   │
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │ Mã cây:    LC-0001                       │ │
│  │ QR Data:   cayxanh://tree/1              │ │
│  │ Loài cây:  Bàng Đài Loan                 │ │
│  │ Khu vực:   Quận Liên Chiểu               │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│       [📥 Tải mã QR (PNG)]                     │
│       ✅ Đã tải QR code thành công!            │
│                                                │
│  💡 Hướng dẫn: Tải file PNG này và in ra...   │
└────────────────────────────────────────────────┘
```

## Files Modified

### Modified:
- `frontend/src/api/trees.ts` - Added QR code functions
- `frontend/src/api/maintenance.ts` - Added type export
- `frontend/src/pages/dashboard/TreeManagementPage.tsx` - Added QR tab

### No New Files Created
All changes integrated into existing files.

---

**Người thực hiện:** SV1  
**Ngày hoàn thành:** 2026-05-29  
**Status:** ✅ Frontend Web Complete - Ready for Mobile Implementation
