# Mobile App Testing Checklist

## ✅ Pre-Testing Setup

- [x] Backend running on `http://10.141.239.201:3000`
- [x] Mobile API client configured with correct URL
- [x] All code changes applied and compiled without errors

---

## 🧪 Test Scenarios

### 1. **Login Flow**
- [ ] Open mobile app in Expo Go
- [ ] Enter Staff user credentials
- [ ] Tap "Đăng nhập" button
- [ ] **Expected**: Successfully login and navigate to TaskListScreen
- [ ] **Expected**: NO white screen crash

### 2. **Task List Loading**
- [ ] After login, observe the loading state
- [ ] **Expected**: See "Đang tải..." message briefly
- [ ] **Expected**: Task list appears with data
- [ ] **Expected**: No console errors

### 3. **Task Display Verification**
For each task in the list, verify:
- [ ] Task type is displayed (e.g., "Cắt tỉa", "Bón phân")
- [ ] Status badge shows correct color and text
  - Pending = Orange "Chờ xử lý"
  - In_Progress = Blue "Đang thực hiện"
  - Completed = Green "Hoàn thành"
- [ ] Tree information shows: "🌳 [tree_code] - [species_name]"
- [ ] Scheduled date shows in Vietnamese format (dd/mm/yyyy)

### 4. **Empty State**
If the logged-in user has no tasks:
- [ ] **Expected**: See "Không có công việc nào"
- [ ] **Expected**: See "Kéo xuống để làm mới" hint
- [ ] **Expected**: No crash or error

### 5. **Pull to Refresh**
- [ ] Pull down on the task list
- [ ] **Expected**: Refresh indicator appears
- [ ] **Expected**: Task list reloads
- [ ] **Expected**: Refresh indicator disappears

### 6. **Task Navigation**
- [ ] Tap on any task card
- [ ] **Expected**: Navigate to TaskDetail screen
- [ ] **Expected**: Task details are displayed correctly

### 7. **Logout**
- [ ] Tap "Đăng xuất" button in top right
- [ ] **Expected**: Return to login screen
- [ ] **Expected**: Token cleared from storage

---

## 🐛 Error Scenario Testing

### 8. **Network Error**
- [ ] Turn off WiFi/mobile data
- [ ] Pull to refresh
- [ ] **Expected**: Alert shows "Lỗi" with error message
- [ ] **Expected**: App doesn't crash
- [ ] Turn network back on
- [ ] Pull to refresh
- [ ] **Expected**: Tasks load successfully

### 9. **Invalid Token**
- [ ] Manually clear AsyncStorage (or wait for token expiry)
- [ ] Try to load tasks
- [ ] **Expected**: Redirect to login screen
- [ ] **Expected**: No crash

### 10. **Backend Down**
- [ ] Stop the backend server
- [ ] Pull to refresh in mobile app
- [ ] **Expected**: Error alert appears
- [ ] **Expected**: App shows empty state gracefully
- [ ] Start backend again
- [ ] Pull to refresh
- [ ] **Expected**: Tasks load successfully

---

## 📱 Console Log Verification

Open React Native Debugger or Expo console and check for:

### ✅ Expected Logs:
```
Tasks loaded: [array]
My tasks response: [array]
```

### ❌ Should NOT See:
```
Cannot read properties of undefined (reading 'toString')
Cannot read properties of undefined (reading 'tree_code')
TypeError: item.id is undefined
```

---

## 🔍 Data Integrity Checks

### 11. **Task Data Structure**
In console, verify each task has:
```javascript
{
  id: number,
  tree_id: number,
  assigned_to: number,
  task_type: string,
  status: string,
  scheduled_date: string,
  tree: {
    id: number,
    tree_code: string,
    location: { type: 'Point', coordinates: [lon, lat] },
    species: {
      common_name: string
    }
  }
}
```

### 12. **Tree Relations Loaded**
- [ ] Check that `item.tree` is NOT undefined
- [ ] Check that `item.tree.species` is NOT undefined
- [ ] Check that `item.tree.tree_code` exists
- [ ] Check that `item.tree.species.common_name` exists

---

## 🎯 Success Criteria

All of the following must be true:
- ✅ No white screen crash after login
- ✅ Task list loads and displays correctly
- ✅ Tree information shows for each task
- ✅ Pull-to-refresh works
- ✅ Navigation to task details works
- ✅ Empty state displays properly
- ✅ Error handling is graceful (no crashes)
- ✅ Console shows no critical errors

---

## 📝 Test Results

### Test Date: _____________
### Tester: _____________
### Device: _____________
### Expo Version: _____________

### Overall Result:
- [ ] ✅ PASS - All tests passed
- [ ] ⚠️ PARTIAL - Some issues found (list below)
- [ ] ❌ FAIL - Critical issues remain

### Issues Found:
1. _____________________________________________
2. _____________________________________________
3. _____________________________________________

### Notes:
_____________________________________________
_____________________________________________
_____________________________________________

---

## 🚀 Quick Test Command

To quickly test the fix:
1. Ensure backend is running: `cd backend && npm run start:dev`
2. Open mobile app in Expo Go
3. Login with Staff credentials
4. Verify task list loads without crash
5. Check console for "Tasks loaded:" log

**If you see the task list with tree information, the fix is successful!** ✅
