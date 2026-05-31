# QR Code Mobile - Quick Start Guide 🚀

## 📱 Cài đặt và chạy trên điện thoại thật

### Bước 1: Chuẩn bị

#### 1.1. Tìm địa chỉ IP của máy tính

**Windows:**
```bash
ipconfig
# Tìm dòng "IPv4 Address" (ví dụ: 192.168.1.100)
```

**Mac/Linux:**
```bash
ifconfig | grep "inet "
# Hoặc
ip addr show
```

#### 1.2. Cập nhật API URL trong mobile app

Mở file `mobile/src/api/client.ts` và thay đổi:

```typescript
// Thay YOUR_IP bằng IP máy tính của bạn
const API_BASE_URL = 'http://192.168.1.100:3000';
```

**Lưu ý:** Máy tính và điện thoại phải cùng mạng WiFi!

---

### Bước 2: Cài đặt trên Android

#### 2.1. Kết nối điện thoại

1. Bật **Developer Options** trên Android:
   - Settings → About Phone
   - Tap "Build Number" 7 lần
   
2. Bật **USB Debugging**:
   - Settings → Developer Options
   - Enable "USB Debugging"

3. Kết nối điện thoại với máy tính qua USB

4. Kiểm tra kết nối:
   ```bash
   adb devices
   # Nếu thấy device ID → OK!
   ```

#### 2.2. Build và cài đặt

```bash
cd mobile

# Build và cài đặt app
npx expo run:android
```

**Thời gian:** ~5-10 phút lần đầu

**Kết quả:** App tự động cài đặt và mở trên điện thoại

---

### Bước 3: Cài đặt trên iOS (Cần Mac)

#### 3.1. Kết nối iPhone

1. Kết nối iPhone với Mac qua USB
2. Trust computer trên iPhone
3. Mở Xcode và add Apple ID (nếu chưa có)

#### 3.2. Build và cài đặt

```bash
cd mobile

# Build và cài đặt app
npx expo run:ios
```

**Lưu ý:** Cần Apple Developer account (free account OK)

---

### Bước 4: Test QR Code

#### 4.1. Tạo QR Code từ Web Admin

1. Mở web admin: `http://localhost:5173`
2. Login: `admin` / `Test@123`
3. Vào "Quản lý Cây Xanh"
4. Click vào một cây
5. Click tab "Mã QR"
6. Click "Tải mã QR (PNG)"
7. In hoặc hiển thị QR code trên màn hình khác

#### 4.2. Test trong App

**Test 1: Quét từ trong app**

1. Mở app trên điện thoại
2. Login: `staff` / `Test@123`
3. Click nút **"📷 Quét QR"**
4. Cấp quyền camera (nếu được hỏi)
5. Quét QR code
6. ✅ Thấy alert: "Quét thành công!"
7. Click "Xem chi tiết"
8. ✅ Màn hình chi tiết cây hiển thị

**Test 2: Quét từ camera điện thoại**

1. Mở camera điện thoại (không phải app)
2. Quét QR code
3. ✅ Thấy notification: "Open with Cây Xanh Đà Nẵng"
4. Tap notification
5. ✅ App mở và hiển thị chi tiết cây

---

## 🐛 Xử lý lỗi thường gặp

### Lỗi 1: "Unable to connect to development server"

**Nguyên nhân:** Điện thoại và máy tính không cùng mạng WiFi

**Giải pháp:**
1. Kiểm tra cả hai đều kết nối cùng WiFi
2. Tắt VPN nếu đang bật
3. Kiểm tra firewall không chặn port 8081

---

### Lỗi 2: "Network Error" khi login

**Nguyên nhân:** API URL không đúng hoặc backend chưa chạy

**Giải pháp:**
1. Kiểm tra backend đang chạy:
   ```bash
   cd backend
   npm run start:dev
   ```

2. Kiểm tra API URL trong `mobile/src/api/client.ts`

3. Test API từ điện thoại:
   - Mở browser trên điện thoại
   - Vào: `http://YOUR_IP:3000`
   - Nếu thấy "Cannot GET /" → Backend OK!

---

### Lỗi 3: Camera không mở

**Giải pháp:**
1. Uninstall app
2. Reinstall app
3. Cấp quyền camera khi được hỏi

**Android:**
```bash
adb uninstall com.danang.cayxanh
npx expo run:android
```

---

### Lỗi 4: Deep link không hoạt động

**Android:**
```bash
# Test manually
adb shell am start -W -a android.intent.action.VIEW \
  -d "cayxanh://tree/1" com.danang.cayxanh
```

**iOS:**
- Rebuild app sau khi thay đổi `app.json`
- Check Settings → App → URL Schemes

---

## 📋 Checklist trước khi test

- [ ] Backend đang chạy (`npm run start:dev`)
- [ ] API URL đã cập nhật đúng IP
- [ ] Điện thoại và máy tính cùng WiFi
- [ ] App đã build và cài đặt thành công
- [ ] Đã có QR code để test (từ web admin)
- [ ] Camera permission đã được cấp

---

## 🎯 Test Scenarios

### Scenario 1: Happy Path
```
1. Login → TaskList
2. Click "📷 Quét QR"
3. Scan QR code
4. Click "Xem chi tiết"
5. ✅ Tree info displays
```

### Scenario 2: Deep Link
```
1. Scan QR with phone camera
2. Tap "Open with app"
3. ✅ App opens with tree detail
```

### Scenario 3: Invalid QR
```
1. Scan random QR code
2. ✅ Alert: "Mã QR không hợp lệ"
3. Click "Quét lại"
4. ✅ Scanner resets
```

---

## 📱 Alternative: Test với Expo Go (Nhanh hơn)

### Cài đặt Expo Go

1. Download "Expo Go" từ App Store/Play Store
2. Mở app

### Chạy với Expo Go

```bash
cd mobile
npx expo start
```

**Scan QR code** từ terminal với Expo Go app

**Lưu ý:** 
- ✅ Nhanh, không cần build
- ❌ Deep linking không hoạt động
- ❌ Một số native features có thể không work

---

## 🚀 Production Build

### Android APK

```bash
cd mobile

# Build APK for testing
npx expo build:android -t apk

# Or with EAS
eas build --platform android --profile preview
```

### iOS IPA

```bash
cd mobile

# Build IPA (requires Mac + Xcode)
eas build --platform ios --profile preview
```

---

## 📞 Cần giúp đỡ?

### Debug Commands

**Check device connection:**
```bash
adb devices
```

**View Android logs:**
```bash
adb logcat | grep -i "expo\|react"
```

**Clear app data:**
```bash
# Android
adb shell pm clear com.danang.cayxanh

# iOS
# Delete app and reinstall
```

**Restart Metro bundler:**
```bash
# Ctrl+C to stop
# Then run again:
npx expo start --clear
```

---

## ✅ Success Criteria

Khi test thành công, bạn sẽ thấy:

- ✅ App mở được trên điện thoại
- ✅ Login thành công
- ✅ Nút "📷 Quét QR" hiển thị
- ✅ Camera mở được
- ✅ QR code được quét thành công
- ✅ Alert hiển thị tree ID
- ✅ Navigate đến TreeHistory screen
- ✅ Tree info và tasks hiển thị
- ✅ Deep link hoạt động (scan từ camera)

---

## 🎉 Hoàn thành!

Nếu tất cả test cases pass → **Task 1.2 Mobile COMPLETE!** 🎊

---

**Created by:** SV1  
**Date:** 2026-05-29  
**Time to complete:** ~30 minutes  
**Difficulty:** ⭐⭐⭐ (Medium)
