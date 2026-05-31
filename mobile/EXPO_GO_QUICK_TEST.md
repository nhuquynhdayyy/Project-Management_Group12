# Expo Go Quick Test Guide 🚀

## 📱 Test QR Scanner trên Expo Go (Không cần build!)

### Bước 1: Cài đặt Expo Go

**Android:**
- Mở Google Play Store
- Tìm "Expo Go"
- Cài đặt

**iOS:**
- Mở App Store
- Tìm "Expo Go"
- Cài đặt

---

### Bước 2: Chuẩn bị Backend

```bash
# Terminal 1 - Backend
cd backend
npm run start:dev
```

**Kiểm tra:** Mở browser → `http://localhost:3000` → Thấy "Cannot GET /" → OK!

---

### Bước 3: Cập nhật API URL

**Tìm IP máy tính:**

```bash
# Windows
ipconfig
# Tìm "IPv4 Address" (ví dụ: 192.168.1.100)

# Mac/Linux
ifconfig | grep "inet "
```

**Cập nhật file:**

Mở `mobile/src/api/client.ts` và thay đổi:

```typescript
// Thay YOUR_IP bằng IP của bạn
const API_BASE_URL = 'http://192.168.1.100:3000';
```

**Lưu ý:** Máy tính và điện thoại phải cùng WiFi!

---

### Bước 4: Start Expo Dev Server

```bash
# Terminal 2 - Mobile
cd mobile
npx expo start
```

**Kết quả:** Terminal hiển thị QR code

```
› Metro waiting on exp://192.168.1.100:8081
› Scan the QR code above with Expo Go (Android) or the Camera app (iOS)

█████████████████████████████████
█████████████████████████████████
████ ▄▄▄▄▄ █▀█ █▄▄▀▄█ ▄▄▄▄▄ ████
████ █   █ █▀▀▀█ ▀ ▄█ █   █ ████
...
```

---

### Bước 5: Mở App trong Expo Go

**Android:**
1. Mở app **Expo Go**
2. Tap **"Scan QR Code"**
3. Quét QR code từ terminal
4. App tự động load

**iOS:**
1. Mở app **Camera** (không phải Expo Go)
2. Quét QR code từ terminal
3. Tap notification "Open in Expo Go"
4. App tự động load

**Thời gian:** ~10-20 giây lần đầu

---

### Bước 6: Test QR Scanner

#### 6.1. Tạo QR Code từ Web

1. Mở browser: `http://localhost:5173`
2. Login: `admin` / `Test@123`
3. Vào **"Quản lý Cây Xanh"**
4. Click vào một cây
5. Click tab **"Mã QR"**
6. Click **"Tải mã QR (PNG)"**
7. Mở file PNG hoặc hiển thị trên màn hình khác

#### 6.2. Test trong App

1. **Login vào app:**
   - Username: `staff`
   - Password: `Test@123`

2. **Mở QR Scanner:**
   - Click nút **"📷 Quét QR"**
   - Cấp quyền camera (nếu được hỏi)

3. **Quét QR Code:**
   - Đưa camera vào QR code
   - Đợi ~1 giây
   - ✅ Alert hiển thị: "Quét thành công! Đã tìm thấy cây ID: X"

4. **Xem chi tiết:**
   - Click **"Xem chi tiết"**
   - ✅ Màn hình TreeHistory hiển thị
   - ✅ Thông tin cây và tasks hiển thị

5. **Test quét lại:**
   - Click **"🔄 Quét lại"**
   - ✅ Scanner reset và sẵn sàng quét

---

## 🎯 Test Scenarios

### ✅ Scenario 1: Happy Path

```
1. Login → TaskList screen
2. Click "📷 Quét QR"
3. Grant camera permission
4. Scan valid QR code
5. Alert shows tree ID
6. Click "Xem chi tiết"
7. ✅ Tree info displays
```

**Expected:** All steps work smoothly

---

### ✅ Scenario 2: Invalid QR Code

```
1. Open QR scanner
2. Scan random QR code (not tree QR)
3. ✅ Alert: "Mã QR không hợp lệ"
4. Click "Quét lại"
5. ✅ Scanner resets
```

**Expected:** Error handled gracefully

---

### ✅ Scenario 3: Permission Denied

```
1. Click "📷 Quét QR"
2. Deny camera permission
3. ✅ Permission screen shows
4. Click "Cấp quyền camera"
5. Grant permission
6. ✅ Camera opens
```

**Expected:** Permission flow works

---

### ✅ Scenario 4: Multiple Scans

```
1. Scan QR code for Tree 1
2. View details
3. Go back
4. Click "📷 Quét QR" again
5. Scan QR code for Tree 2
6. ✅ Different tree displays
```

**Expected:** Can scan multiple trees

---

## 🐛 Troubleshooting

### Issue 1: "Unable to connect to development server"

**Nguyên nhân:** Máy tính và điện thoại không cùng WiFi

**Giải pháp:**
1. Kiểm tra cả hai đều kết nối cùng WiFi
2. Tắt VPN nếu đang bật
3. Restart Expo dev server:
   ```bash
   # Ctrl+C để stop
   npx expo start --clear
   ```

---

### Issue 2: "Network Error" khi login

**Nguyên nhân:** API URL không đúng

**Giải pháp:**
1. Kiểm tra backend đang chạy
2. Kiểm tra IP trong `mobile/src/api/client.ts`
3. Test từ điện thoại:
   - Mở browser trên điện thoại
   - Vào: `http://YOUR_IP:3000`
   - Nếu thấy "Cannot GET /" → Backend OK!

---

### Issue 3: Camera không mở

**Giải pháp:**
1. Trong Expo Go: Settings → Clear cache
2. Reload app (shake phone → Reload)
3. Grant camera permission lại

---

### Issue 4: QR Code không detect

**Nguyên nhân:**
- Ánh sáng kém
- QR code quá nhỏ/lớn
- QR code bị mờ

**Giải pháp:**
- Cải thiện ánh sáng
- Di chuyển gần/xa QR code
- In QR code rõ hơn

---

## 📊 Performance Check

### Expected Performance

- **App load time:** 10-20 seconds (first time)
- **Reload time:** 1-2 seconds
- **Camera open:** <1 second
- **QR detection:** <1 second
- **Navigation:** <500ms

### If Slower

1. Check WiFi signal strength
2. Close other apps
3. Restart Expo Go
4. Restart dev server

---

## ✅ Success Checklist

Test thành công khi:

- [ ] App loads in Expo Go
- [ ] Login works
- [ ] "📷 Quét QR" button visible
- [ ] Camera permission works
- [ ] Camera preview shows
- [ ] QR code detected
- [ ] Alert shows correct tree ID
- [ ] Navigate to tree detail works
- [ ] Tree info displays
- [ ] Tasks list displays
- [ ] "Quét lại" works
- [ ] Can scan multiple QR codes

**All checked?** → 🎉 **SUCCESS!**

---

## 🔄 Development Workflow

### Make Changes

1. Edit code in VS Code
2. Save file (Ctrl+S)
3. ✅ App auto-reloads in ~1-2 seconds
4. Test changes immediately

**No build required!** 🚀

---

### Debug

**View logs:**
```bash
# In terminal where "npx expo start" is running
# Logs appear automatically
```

**Reload app:**
- Shake phone
- Tap "Reload"

**Clear cache:**
- Shake phone
- Tap "Clear cache and reload"

---

## 📱 Expo Go vs Native Build

### When to use Expo Go

✅ **Development**
- Fast iteration
- No build time
- Easy testing

✅ **Demos**
- Quick showcase
- No installation needed

✅ **Team Testing**
- Share QR code
- Everyone can test

---

### When to use Native Build

✅ **Production**
- App store submission
- Standalone app

✅ **Performance Testing**
- Real device performance
- Battery usage

✅ **Custom Native Code**
- If needed in future

---

## 🎯 Next Steps

### After Successful Test

1. ✅ QR scanner works on Expo Go
2. ✅ Ready for team testing
3. ✅ Can continue development

### For Production

1. Build native app:
   ```bash
   npx expo run:android
   # or
   npx expo run:ios
   ```

2. Test deep linking (external scan)

3. Submit to app stores

---

## 📞 Need Help?

### Common Commands

**Restart dev server:**
```bash
# Ctrl+C to stop
npx expo start --clear
```

**Check Expo Go version:**
- Open Expo Go
- Settings → About
- Should be latest version

**Update Expo Go:**
- Update from App Store/Play Store

---

## 🎉 You're Ready!

Bây giờ bạn có thể:
- ✅ Test QR scanner trên Expo Go
- ✅ Develop without building
- ✅ Iterate quickly
- ✅ Share with team easily

**Happy Testing!** 🚀

---

**Created by:** SV1  
**Date:** 2026-05-29  
**Difficulty:** ⭐ (Very Easy)  
**Time:** ~5 minutes setup + testing
