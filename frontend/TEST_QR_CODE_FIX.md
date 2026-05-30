# Test Plan: QR Code Image Display Fix

## 🎯 Objective
Verify that QR code images display correctly in TreeDetailModal after implementing blob URL solution.

---

## 🧪 Test Cases

### Test Case 1: Happy Path - QR Code Display

**Prerequisites:**
- Backend running on `http://localhost:3000`
- Frontend running on `http://localhost:5173`
- Logged in as Admin (username: `admin`, password: `Test@123`)
- Database seeded with trees

**Steps:**
1. Navigate to "Quản lý Cây Xanh"
2. Click on any tree in the list
3. TreeDetailModal opens
4. Click "Mã QR" tab

**Expected Results:**
- ✅ Loading spinner appears immediately
- ✅ After ~100-200ms, QR code image displays
- ✅ QR code is clear and readable (300x300px)
- ✅ Tree info displays correctly below QR code
- ✅ Download button is enabled

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue): _______________

---

### Test Case 2: Loading State

**Steps:**
1. Open DevTools → Network tab
2. Throttle network to "Slow 3G"
3. Open tree detail modal
4. Click "Mã QR" tab

**Expected Results:**
- ✅ Loading spinner shows for 2-3 seconds
- ✅ "Đang tải QR code..." message displays
- ✅ Download button is disabled during loading
- ✅ QR code eventually displays

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue): _______________

---

### Test Case 3: Error Handling - Backend Down

**Steps:**
1. Stop backend server
2. Open tree detail modal
3. Click "Mã QR" tab
4. Wait for error

**Expected Results:**
- ✅ Error icon (red exclamation) displays
- ✅ "Không thể tải QR code" message shows
- ✅ "Thử lại" button appears
- ✅ No console errors (only logged errors)

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue): _______________

---

### Test Case 4: Error Recovery - Retry

**Prerequisites:**
- Backend initially down (from Test Case 3)

**Steps:**
1. Start backend server
2. Click "Thử lại" button in error state

**Expected Results:**
- ✅ Loading spinner appears
- ✅ QR code loads successfully
- ✅ Error state clears

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue): _______________

---

### Test Case 5: Download Functionality

**Steps:**
1. Open tree detail modal (tree code: LC-0001)
2. Click "Mã QR" tab
3. Wait for QR code to load
4. Click "Tải mã QR (PNG)" button

**Expected Results:**
- ✅ File downloads immediately
- ✅ Filename: `LC-0001-qrcode.png`
- ✅ File size: ~1.2-1.8 KB
- ✅ File opens correctly as PNG image
- ✅ Success message: "✅ Đã tải QR code thành công!"
- ✅ Message disappears after 3 seconds

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue): _______________

---

### Test Case 6: Memory Cleanup

**Steps:**
1. Open DevTools → Memory tab
2. Take heap snapshot (Snapshot 1)
3. Open tree detail modal → "Mã QR" tab
4. Close modal
5. Repeat steps 3-4 ten times
6. Take heap snapshot (Snapshot 2)
7. Compare snapshots

**Expected Results:**
- ✅ Memory increase < 1MB between snapshots
- ✅ No blob URLs retained in memory
- ✅ No memory leak warnings

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue): _______________

---

### Test Case 7: Multiple Trees

**Steps:**
1. Open tree detail for Tree 1 → "Mã QR" tab
2. Close modal
3. Open tree detail for Tree 2 → "Mã QR" tab
4. Close modal
5. Open tree detail for Tree 3 → "Mã QR" tab

**Expected Results:**
- ✅ Each QR code displays correctly
- ✅ QR codes are different for each tree
- ✅ No caching issues
- ✅ Previous blob URLs are cleaned up

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue): _______________

---

### Test Case 8: Tab Switching

**Steps:**
1. Open tree detail modal
2. Click "Mã QR" tab → wait for load
3. Click "Thông tin cây" tab
4. Click "Mã QR" tab again

**Expected Results:**
- ✅ QR code displays immediately (cached in state)
- ✅ No re-fetch occurs
- ✅ No loading spinner on second view

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue): _______________

---

### Test Case 9: Authentication Token Expiry

**Steps:**
1. Open tree detail modal → "Mã QR" tab
2. Wait for QR code to load
3. In DevTools, clear localStorage (remove `access_token`)
4. Close and reopen modal
5. Click "Mã QR" tab

**Expected Results:**
- ✅ Error state displays
- ✅ User is redirected to login (or shown auth error)
- ✅ No infinite loading

**Actual Results:**
- [ ] Pass
- [ ] Fail (describe issue): _______________

---

### Test Case 10: Browser Compatibility

**Browsers to Test:**
- [ ] Chrome 120+
- [ ] Firefox 120+
- [ ] Safari 17+
- [ ] Edge 120+

**Steps:**
1. Open tree detail modal
2. Click "Mã QR" tab
3. Verify QR code displays

**Expected Results:**
- ✅ QR code displays in all browsers
- ✅ No console errors
- ✅ Download works in all browsers

**Actual Results:**
- Chrome: [ ] Pass [ ] Fail
- Firefox: [ ] Pass [ ] Fail
- Safari: [ ] Pass [ ] Fail
- Edge: [ ] Pass [ ] Fail

---

## 🔍 Manual Inspection

### Console Logs

**Check for:**
- ✅ No 401 Unauthorized errors
- ✅ No CORS errors
- ✅ Logged errors are informative
- ✅ No unhandled promise rejections

**Example Good Log:**
```
Failed to load QR code: Error: Network Error
```

**Example Bad Log:**
```
Uncaught (in promise) Error: Request failed with status code 401
```

---

### Network Tab

**Check for:**
- ✅ Request to `/trees/:id/qrcode` has `Authorization` header
- ✅ Response status: 200 OK
- ✅ Response type: `image/png`
- ✅ Response size: ~1.2-1.8 KB

**Example Request:**
```
GET http://localhost:3000/trees/1/qrcode
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Example Response:**
```
Status: 200 OK
Content-Type: image/png
Content-Length: 1775
```

---

### Elements Tab

**Check for:**
- ✅ `<img>` has `src` starting with `blob:http://localhost:5173/`
- ✅ Blob URL format: `blob:http://localhost:5173/abc-123-def-456`
- ✅ Image loads successfully

**Example:**
```html
<img 
  src="blob:http://localhost:5173/a1b2c3d4-e5f6-7890-abcd-ef1234567890" 
  alt="QR Code for LC-0001"
  class="w-64 h-64 object-contain"
/>
```

---

## 📊 Performance Metrics

### Target Metrics:
- QR code load time: < 200ms (normal network)
- QR code load time: < 3s (slow 3G)
- Memory usage per modal open: < 100KB
- Memory cleanup: 100% (no leaks)

### Actual Metrics:
- QR code load time (normal): _____ ms
- QR code load time (slow 3G): _____ ms
- Memory usage per modal: _____ KB
- Memory cleanup: _____ %

---

## ✅ Acceptance Criteria

All test cases must pass:
- [ ] Test Case 1: Happy Path
- [ ] Test Case 2: Loading State
- [ ] Test Case 3: Error Handling
- [ ] Test Case 4: Error Recovery
- [ ] Test Case 5: Download
- [ ] Test Case 6: Memory Cleanup
- [ ] Test Case 7: Multiple Trees
- [ ] Test Case 8: Tab Switching
- [ ] Test Case 9: Auth Token Expiry
- [ ] Test Case 10: Browser Compatibility

---

## 🐛 Bug Report Template

If any test fails, use this template:

```markdown
### Bug: [Short Description]

**Test Case:** [Test Case Number and Name]

**Steps to Reproduce:**
1. 
2. 
3. 

**Expected Result:**
[What should happen]

**Actual Result:**
[What actually happened]

**Screenshots:**
[Attach screenshots if applicable]

**Console Errors:**
[Copy any console errors]

**Environment:**
- Browser: [Chrome/Firefox/Safari/Edge]
- OS: [Windows/Mac/Linux]
- Backend: [Running/Not Running]
- Frontend: [Running/Not Running]

**Severity:**
- [ ] Critical (blocks feature)
- [ ] High (major issue)
- [ ] Medium (minor issue)
- [ ] Low (cosmetic)
```

---

## 📝 Test Execution Log

**Tester:** _______________  
**Date:** _______________  
**Environment:** _______________  

**Summary:**
- Total Tests: 10
- Passed: _____
- Failed: _____
- Blocked: _____

**Notes:**
_______________________________________________
_______________________________________________
_______________________________________________

**Sign-off:**
- [ ] All tests passed
- [ ] Ready for production
- [ ] Issues found (see bug reports)

---

**Created by:** SV1  
**Date:** 2026-05-29  
**Version:** 1.0
