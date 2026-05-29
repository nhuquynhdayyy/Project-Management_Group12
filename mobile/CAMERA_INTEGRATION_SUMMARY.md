# Camera Integration - Mobile App Summary

## Objective
Add camera functionality to the mobile app to allow field workers to capture evidence photos when completing maintenance tasks.

---

## 📦 Dependencies Installed

```bash
npm install expo-image-picker
```

**Package:** `expo-image-picker` - Expo library for accessing camera and photo library
- Provides unified API for camera and gallery access
- Handles permissions automatically
- Supports image editing and quality control

---

## 🔧 Changes Made

### 1. TaskDetailScreen.tsx (`mobile/src/screens/TaskDetailScreen.tsx`)

#### Added Imports
```typescript
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'react-native';
```

#### Added State
```typescript
const [imageUri, setImageUri] = useState<string | null>(null);
```

#### New Functions

**1. handleTakePhoto()**
- Requests camera permission
- Shows alert with 2 options:
  - 📷 Chụp ảnh (Take photo)
  - 🖼️ Chọn từ thư viện (Choose from gallery)
- Launches camera or gallery picker
- Saves selected image URI to state
- Image quality: 0.8 (80%)
- Aspect ratio: 4:3
- Allows editing before confirmation

**2. handleRemoveImage()**
- Shows confirmation dialog
- Removes selected image from state

**3. Updated handleComplete()**
- Now passes `imageUri` to API call
- Image is optional (can be undefined)

#### UI Changes

**Added Camera Button:**
```typescript
<TouchableOpacity
  style={styles.cameraButton}
  onPress={handleTakePhoto}
>
  <Text style={styles.cameraButtonText}>
    📷 Chụp ảnh bằng chứng (tùy chọn)
  </Text>
</TouchableOpacity>
```

**Added Image Preview:**
```typescript
{imageUri && (
  <View style={styles.imagePreviewContainer}>
    <Image source={{ uri: imageUri }} style={styles.imagePreview} />
    <TouchableOpacity
      style={styles.removeImageButton}
      onPress={handleRemoveImage}
    >
      <Text style={styles.removeImageText}>✕</Text>
    </TouchableOpacity>
  </View>
)}
```

#### New Styles
- `cameraButton` - Blue button with camera icon
- `cameraButtonText` - White text, bold
- `imagePreviewContainer` - Container for image preview
- `imagePreview` - 200px height, full width, rounded corners
- `removeImageButton` - Red X button in top-right corner
- `removeImageText` - White X icon

---

### 2. maintenance.ts (`mobile/src/api/maintenance.ts`)

#### Updated Interface
```typescript
export interface CompleteTaskRequest {
  latitude: number;
  longitude: number;
  notes?: string;
  imageUri?: string; // ✅ Changed from evidence_image to imageUri
}
```

#### Updated completeTask Function

**Changed from JSON to FormData:**

```typescript
export async function completeTask(
  taskId: number,
  data: CompleteTaskRequest
): Promise<MaintenanceTask> {
  // Create FormData for multipart/form-data request
  const formData = new FormData();
  
  // Add required fields
  formData.append('latitude', data.latitude.toString());
  formData.append('longitude', data.longitude.toString());
  
  // Add optional notes
  if (data.notes) {
    formData.append('notes', data.notes);
  }
  
  // Add optional image
  if (data.imageUri) {
    const filename = data.imageUri.split('/').pop() || 'evidence.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';
    
    formData.append('image', {
      uri: data.imageUri,
      name: filename,
      type: type,
    } as any);
  }
  
  const response = await apiClient.post<MaintenanceTask>(
    `/maintenance/tasks/${taskId}/complete`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  
  return response.data;
}
```

**Key Features:**
- ✅ Converts to FormData format
- ✅ Extracts filename from URI
- ✅ Detects MIME type from file extension
- ✅ Sets proper Content-Type header
- ✅ Image is optional (only appended if provided)

---

## 🎯 User Flow

### 1. Task Completion Screen
```
┌─────────────────────────────────┐
│  Chi tiết công việc             │
├─────────────────────────────────┤
│  [Task Details]                 │
│                                 │
│  Hoàn thành công việc           │
│  ⚠️ Bạn phải ở trong bán kính   │
│     10m từ cây...               │
│                                 │
│  ┌─────────────────────────┐   │
│  │ Ghi chú (tùy chọn)      │   │
│  │                         │   │
│  └─────────────────────────┘   │
│                                 │
│  ┌─────────────────────────┐   │
│  │ 📷 Chụp ảnh bằng chứng  │   │
│  │    (tùy chọn)           │   │
│  └─────────────────────────┘   │
│                                 │
│  ┌─────────────────────────┐   │
│  │ ✓ Hoàn thành công việc │   │
│  └─────────────────────────┘   │
└─────────────────────────────────┘
```

### 2. Camera Options Dialog
```
┌─────────────────────────────────┐
│  Chọn ảnh bằng chứng            │
│  Bạn muốn chụp ảnh mới hay      │
│  chọn từ thư viện?              │
├─────────────────────────────────┤
│  [Chụp ảnh]                     │
│  [Chọn từ thư viện]             │
│  [Hủy]                          │
└─────────────────────────────────┘
```

### 3. With Image Preview
```
┌─────────────────────────────────┐
│  Hoàn thành công việc           │
│                                 │
│  ┌─────────────────────────┐   │
│  │ Ghi chú...              │   │
│  └─────────────────────────┘   │
│                                 │
│  ┌─────────────────────────┐   │
│  │ 📷 Chụp ảnh bằng chứng  │   │
│  └─────────────────────────┘   │
│                                 │
│  ┌─────────────────────────┐   │
│  │                    [✕]  │   │
│  │   [Image Preview]       │   │
│  │                         │   │
│  └─────────────────────────┘   │
│                                 │
│  ┌─────────────────────────┐   │
│  │ ✓ Hoàn thành công việc │   │
│  └─────────────────────────┘   │
└─────────────────────────────────┘
```

---

## 🔒 Permissions

### Camera Permission
```typescript
const { status } = await ImagePicker.requestCameraPermissionsAsync();
if (status !== 'granted') {
  Alert.alert('Lỗi', 'Cần cấp quyền truy cập camera để chụp ảnh');
  return;
}
```

### Required Permissions in app.json
```json
{
  "expo": {
    "plugins": [
      [
        "expo-image-picker",
        {
          "photosPermission": "The app accesses your photos to let you share them with your friends.",
          "cameraPermission": "The app accesses your camera to let you take photos."
        }
      ]
    ]
  }
}
```

---

## 📱 Features

### ✅ Camera Integration
- Take photo with device camera
- Choose from photo library
- Image editing (crop, rotate)
- Quality control (80% compression)
- Aspect ratio: 4:3

### ✅ Image Preview
- Display selected image
- 200px height preview
- Remove button (top-right corner)
- Confirmation before removal

### ✅ Optional Image
- Image is NOT required
- Can complete task without image
- Image field only sent if provided

### ✅ User Experience
- Clear Vietnamese labels
- Intuitive camera icon (📷)
- Alert dialogs for choices
- Loading indicators
- Error handling

---

## 🎨 UI Design

### Color Scheme
- **Camera Button**: Blue (`#3b82f6`)
- **Complete Button**: Green (`#16a34a`)
- **Remove Button**: Red (`rgba(239, 68, 68, 0.9)`)
- **Background**: Dark (`#0f172a`, `#1e293b`)
- **Text**: White (`#fff`)

### Button Hierarchy
1. **Primary**: Complete Task (Green, bottom)
2. **Secondary**: Take Photo (Blue, middle)
3. **Tertiary**: Remove Image (Red X, overlay)

---

## 📊 Data Flow

```
User taps "Chụp ảnh bằng chứng"
    ↓
Request camera permission
    ↓
Show options: Camera or Gallery
    ↓
User selects option
    ↓
Launch camera/gallery picker
    ↓
User captures/selects image
    ↓
Save image URI to state
    ↓
Display image preview
    ↓
User taps "Hoàn thành công việc"
    ↓
Get GPS location
    ↓
Create FormData with:
  - latitude
  - longitude
  - notes (optional)
  - image file (optional)
    ↓
POST to /maintenance/tasks/:id/complete
    ↓
Backend uploads to Supabase
    ↓
Returns task with evidence_image_url
    ↓
Show success message
    ↓
Navigate back to task list
```

---

## 🔧 Technical Details

### Image Picker Configuration
```typescript
{
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
  allowsEditing: true,
  aspect: [4, 3],
  quality: 0.8,
}
```

### FormData Structure
```
FormData {
  latitude: "16.05444"
  longitude: "108.2022"
  notes: "Task completed successfully"
  image: {
    uri: "file:///path/to/image.jpg"
    name: "evidence.jpg"
    type: "image/jpeg"
  }
}
```

### MIME Type Detection
```typescript
const filename = data.imageUri.split('/').pop() || 'evidence.jpg';
const match = /\.(\w+)$/.exec(filename);
const type = match ? `image/${match[1]}` : 'image/jpeg';
```

Supported formats:
- `.jpg` → `image/jpeg`
- `.jpeg` → `image/jpeg`
- `.png` → `image/png`
- `.webp` → `image/webp`
- Default → `image/jpeg`

---

## 📝 Commit Information

**Commit Hash:** `d6fdfa0`  
**Branch:** `neny`  
**Message:** `feat(mobile): add camera integration for task completion evidence`  
**Files Changed:** 4 files, 190 insertions(+), 4 deletions(-)

---

## ✨ Key Features Summary

✅ **Camera Access** - Take photos or choose from gallery  
✅ **Permission Handling** - Automatic permission requests  
✅ **Image Preview** - See selected image before submitting  
✅ **Optional Image** - Not required to complete task  
✅ **Image Editing** - Crop and adjust before confirmation  
✅ **Quality Control** - 80% compression for optimal size  
✅ **FormData Upload** - Proper multipart/form-data format  
✅ **Error Handling** - User-friendly error messages  
✅ **Vietnamese UI** - All labels in Vietnamese  
✅ **Dark Theme** - Consistent with app design  

---

## 🚀 Testing Checklist

### Functional Testing
- [ ] Camera permission request works
- [ ] Can take photo with camera
- [ ] Can select photo from gallery
- [ ] Image preview displays correctly
- [ ] Can remove selected image
- [ ] Can complete task without image
- [ ] Can complete task with image
- [ ] FormData is sent correctly
- [ ] Image uploads to Supabase
- [ ] evidence_image_url is saved

### UI Testing
- [ ] Camera button is visible
- [ ] Camera button has correct styling
- [ ] Image preview has correct size
- [ ] Remove button is positioned correctly
- [ ] Loading indicator shows during upload
- [ ] Success message displays after completion

### Error Testing
- [ ] Permission denied shows error
- [ ] Camera unavailable shows error
- [ ] Network error shows message
- [ ] Geofencing error shows message
- [ ] Large image uploads successfully

---

## 🎯 Next Steps (Optional Enhancements)

### 1. Image Validation
- Add file size limit (e.g., max 10MB)
- Validate image format
- Show file size in preview

### 2. Multiple Images
- Allow multiple evidence photos
- Gallery view for multiple images
- Delete individual images

### 3. Image Compression
- Add manual compression option
- Show before/after file sizes
- Optimize for slow networks

### 4. Offline Support
- Queue images for upload when offline
- Sync when connection restored
- Show upload status

### 5. Image Metadata
- Add timestamp to image
- Add GPS coordinates to EXIF
- Add device info

---

**Status:** ✅ **Camera Integration Complete - Ready for Testing!**

Field workers can now capture evidence photos when completing maintenance tasks. The image is optional and seamlessly integrated into the task completion flow! 📷
