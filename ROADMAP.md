# 🗺️ Project Roadmap — Hệ thống Quản lý Cây Xanh Đô thị

> **Nguyên tắc cốt lõi:** AI thực thi – Con người quản lý – Con người chịu trách nhiệm
>
> Mỗi task dưới đây được thực thi bởi AI Agent, nhưng **quyết định, kiểm soát và nghiệm thu** thuộc về thành viên được phân công.

---

## 👥 Phân công thành viên

| Thành viên | Vai trò Team Lead | Trách nhiệm quản lý |
|------------|-------------------|---------------------|
| **SV1** | Technical Lead | Kỹ thuật, phạm vi, phân rã công việc (WBS) |
| **SV2** | Schedule & Cost Lead | Ước lượng, lập tiến độ, kiểm soát chi phí |
| **SV3** | Quality & Risk Lead | Chất lượng, rủi ro, truyền thông, kiểm thử |

---

## Phase 1 — Multimedia & Identification
### Mục tiêu: Hoàn thiện quy trình thực địa cho nhân viên (Staff)
docker run --name cayxanh-db ^
  -e POSTGRES_USER=postgres ^
  -e POSTGRES_PASSWORD=123456 ^
  -e POSTGRES_DB=cayxanh_db ^
  -p 5432:5432 ^
  -d postgis/postgis:15-3.4
**Owner: SV1 (Technical Lead)**
**Ưu tiên: Cao — Đây là nền tảng cho tính xác thực dữ liệu thực địa**

---

### 1.1 — Cloud Image Storage (Supabase Storage)

**Phụ trách: SV1**
**Lý do:** Theo PDF trang 3, ảnh chụp thực địa phải được lưu trên Cloud Storage để giảm tải server và đảm bảo tốc độ tải. Hiện tại `evidence_image_url` chỉ là một chuỗi rỗng — chưa có logic upload thực sự.

- [ ] **[SV1 - Backend]** Cài đặt Supabase client: `npm install @supabase/supabase-js` trong `backend/`
- [ ] **[SV1 - Backend]** Tạo `backend/src/services/cloud-storage.service.ts` với các method:
  - `uploadImage(file: Buffer, filename: string): Promise<string>` — trả về public URL
  - `deleteImage(url: string): Promise<void>`
- [ ] **[SV1 - Backend]** Thêm biến môi trường vào `backend/.env`:
  ```
  SUPABASE_URL=https://your-project.supabase.co
  SUPABASE_SERVICE_KEY=your-service-role-key
  SUPABASE_BUCKET=evidence-images
  ```
- [ ] **[SV1 - Backend]** Cập nhật `MaintenanceController.completeTask()` để nhận `multipart/form-data` (file + JSON)
- [ ] **[SV1 - Backend]** Cập nhật `MaintenanceService.completeTask()` để gọi `CloudStorageService.uploadImage()` và lưu URL vào `evidence_image_url`
- [ ] **[SV1 - Mobile]** Thêm `expo-image-picker` vào `mobile/`
- [ ] **[SV1 - Mobile]** Cập nhật `TaskDetailScreen.tsx`: thêm nút "Chụp ảnh bằng chứng" trước khi submit
- [ ] **[SV1 - Mobile]** Cập nhật `mobile/src/api/maintenance.ts` để gửi `FormData` thay vì JSON thuần
- [ ] **[SV1 - Frontend]** Hiển thị `evidence_image_url` trong Dashboard khi xem chi tiết task

**Định nghĩa hoàn thành (DoD):**
- Staff chụp ảnh trên điện thoại → ảnh xuất hiện trên Supabase Storage bucket
- URL ảnh được lưu vào cột `evidence_image_url` trong database
- Admin/Manager thấy ảnh khi xem chi tiết task trên web

---

### 1.2 — QR Code Generation cho mỗi cây

**Phụ trách: SV1**
**Lý do:** Mỗi cây là một tài sản số với ID riêng biệt. QR Code là cơ chế định danh nhanh ngoài thực địa, giúp Staff quét để xem thông tin cây mà không cần tìm kiếm thủ công.

- [ ] **[SV1 - Backend]** Cài đặt thư viện: `npm install qrcode` trong `backend/`
- [ ] **[SV1 - Backend]** Tạo `GET /trees/:id/qrcode` endpoint — trả về ảnh PNG của QR Code chứa tree ID
- [ ] **[SV1 - Backend]** Cập nhật `SeederService`: tự động sinh `qr_code` string (URL dạng `cayxanh://tree/{id}`) cho 80 cây đã seed
- [ ] **[SV1 - Frontend]** Thêm nút "Tải QR Code" trong trang chi tiết cây trên web (Admin/Manager)
- [ ] **[SV1 - Mobile]** Tạo màn hình `QRScannerScreen.tsx` sử dụng `expo-barcode-scanner`
- [ ] **[SV1 - Mobile]** Sau khi quét: gọi `GET /trees/code/{treeCode}` → hiển thị thông tin cây + danh sách task liên quan
- [ ] **[SV1 - Mobile]** Thêm nút "Quét QR" vào màn hình `TaskListScreen` (bottom navigation hoặc header)

**Định nghĩa hoàn thành (DoD):**
- Mỗi cây trong DB có `qr_code` string hợp lệ
- Staff quét QR ngoài thực địa → app hiển thị đúng thông tin cây đó
- Admin có thể tải file QR PNG từ web để in dán lên cây

---

## Phase 2 — Management & Analytics
### Mục tiêu: Nâng cấp cổng quản lý cho Admin/Manager

**Owner: SV2 (Schedule & Cost Lead)**
**Ưu tiên: Trung bình-Cao — Phục vụ trực tiếp nhu cầu báo cáo của quản lý**

---

### 2.1 — Export PDF/Excel cho báo cáo bảo trì

**Phụ trách: SV2**
**Lý do:** Quản lý cần xuất báo cáo định kỳ để nộp lên cấp trên. Dữ liệu đang có sẵn trong DB, chỉ cần thêm lớp export.

- [ ] **[SV2 - Backend]** Cài đặt: `npm install exceljs @nestjs/serve-static` trong `backend/`
- [ ] **[SV2 - Backend]** Tạo `GET /maintenance/tasks/export?format=xlsx&from=&to=` endpoint
  - Trả về file `.xlsx` với các cột: Task ID, Loại, Cây, Nhân viên, Ngày hẹn, Ngày hoàn thành, Ghi chú
  - Chỉ Admin/Manager mới được gọi (dùng `RolesGuard`)
- [ ] **[SV2 - Backend]** Cài đặt: `npm install pdfmake` trong `backend/`
- [ ] **[SV2 - Backend]** Tạo `GET /maintenance/tasks/export?format=pdf` endpoint
  - Trả về file PDF có header logo, bảng dữ liệu, footer ngày xuất
- [ ] **[SV2 - Frontend]** Thêm nút "Xuất Excel" và "Xuất PDF" vào `DashboardPage.tsx`
  - Nút kích hoạt download trực tiếp từ browser
  - Thêm bộ lọc ngày (date range picker) trước khi export

**Định nghĩa hoàn thành (DoD):**
- Admin click "Xuất Excel" → file `.xlsx` tải về với đầy đủ dữ liệu task
- Admin click "Xuất PDF" → file `.pdf` có định dạng chuyên nghiệp
- Bộ lọc ngày hoạt động đúng (chỉ export task trong khoảng thời gian chọn)

---

### 2.2 — Dashboard nâng cao: Hiệu suất nhân viên

**Phụ trách: SV2**
**Lý do:** Dashboard hiện tại chỉ hiển thị dữ liệu cây. Quản lý cần theo dõi năng suất từng nhân viên để phân công hợp lý.

- [ ] **[SV2 - Backend]** Tạo `GET /maintenance/stats/by-staff` endpoint — trả về:
  ```json
  [{ "username": "staff1", "completed": 12, "pending": 3, "avg_completion_hours": 4.5 }]
  ```
- [ ] **[SV2 - Backend]** Tạo `GET /maintenance/stats/overdue` endpoint — trả về danh sách task quá hạn (scheduled_date < today AND status != Completed)
- [ ] **[SV2 - Frontend]** Thêm section "Hiệu suất nhân viên" vào `DashboardPage.tsx`:
  - Bar chart: Số task hoàn thành theo từng nhân viên (dùng Recharts `BarChart`)
  - Table: Danh sách task quá hạn với tên nhân viên và số ngày trễ
- [ ] **[SV2 - Frontend]** Thêm bộ lọc thời gian (7 ngày / 30 ngày / tùy chọn) áp dụng cho toàn bộ Dashboard

**Định nghĩa hoàn thành (DoD):**
- Dashboard hiển thị đúng số task hoàn thành của từng nhân viên
- Danh sách task quá hạn cập nhật theo thời gian thực
- Bộ lọc thời gian hoạt động đúng trên tất cả chart

---

## Phase 3 — Security & Traceability
### Mục tiêu: Đảm bảo tính toàn vẹn và kiểm soát hệ thống

**Owner: SV3 (Quality & Risk Lead)**
**Ưu tiên: Trung bình — Cần thiết trước khi deploy production**

---

### 3.1 — Audit Logs: Theo dõi mọi thay đổi dữ liệu

**Phụ trách: SV3**
**Lý do:** Hệ thống quản lý tài sản công cần truy vết được "ai đã thay đổi gì, lúc nào" để đảm bảo trách nhiệm giải trình.

- [ ] **[SV3 - Backend]** Tạo entity `AuditLog`:
  ```
  id, user_id, action (CREATE/UPDATE/DELETE), entity_type (tree/task/user),
  entity_id, old_value (JSON), new_value (JSON), ip_address, created_at
  ```
- [ ] **[SV3 - Backend]** Tạo `AuditLogService` với method `log(userId, action, entityType, entityId, oldValue?, newValue?)`
- [ ] **[SV3 - Backend]** Inject `AuditLogService` vào `TreesService` — ghi log khi CREATE/UPDATE/DELETE cây
- [ ] **[SV3 - Backend]** Inject `AuditLogService` vào `MaintenanceService` — ghi log khi tạo task, thay đổi status, hoàn thành task
- [ ] **[SV3 - Backend]** Tạo `GET /audit-logs?entity_type=&entity_id=&from=&to=` endpoint (chỉ Admin)
- [ ] **[SV3 - Frontend]** Thêm tab "Nhật ký hoạt động" trong trang chi tiết cây — hiển thị lịch sử thay đổi

**Định nghĩa hoàn thành (DoD):**
- Mọi thao tác CREATE/UPDATE/DELETE trên cây và task đều có bản ghi trong `audit_logs`
- Admin có thể xem lịch sử thay đổi của từng cây cụ thể
- Log bao gồm: tên người dùng, thời gian, giá trị cũ và mới

---

### 3.2 — Integration Tests: Kiểm thử toàn bộ luồng Mobile → Cloud

**Phụ trách: SV3**
**Lý do:** Luồng quan trọng nhất của hệ thống (Staff hoàn thành task ngoài thực địa) chưa có integration test end-to-end. Đây là rủi ro kỹ thuật cao nhất.

- [ ] **[SV3 - Backend]** Viết integration test cho luồng hoàn thành task thành công:
  ```
  Login as staff → GET /maintenance/tasks/my-tasks → POST /maintenance/tasks/:id/complete
  (với tọa độ hợp lệ trong 10m) → Kiểm tra status = Completed trong DB
  ```
- [ ] **[SV3 - Backend]** Viết integration test cho luồng geofencing thất bại:
  ```
  POST /maintenance/tasks/:id/complete (tọa độ ngoài 10m) → Kiểm tra 403 response
  ```
- [ ] **[SV3 - Backend]** Viết integration test cho luồng upload ảnh (sau khi Phase 1.1 hoàn thành):
  ```
  POST /maintenance/tasks/:id/complete (multipart với file ảnh) → Kiểm tra URL trong DB
  ```
- [ ] **[SV3 - Backend]** Viết integration test cho RBAC:
  ```
  Staff token → GET /maintenance/tasks → Kiểm tra chỉ thấy task của mình
  Admin token → GET /maintenance/tasks → Kiểm tra thấy tất cả task
  ```
- [ ] **[SV3 - Backend]** Cấu hình test database riêng biệt trong `jest.config` để không ảnh hưởng DB development
- [ ] **[SV3]** Viết báo cáo Test Coverage — đảm bảo các luồng nghiệp vụ chính đạt ≥ 80% coverage

**Định nghĩa hoàn thành (DoD):**
- `npm run test:e2e` chạy thành công không có lỗi
- Tất cả 4 luồng trên đều có test case pass
- Coverage report được commit vào repo

---

## Phase 4 — Finalization
### Mục tiêu: Hoàn thiện tài liệu dự án cho báo cáo môn học

**Owner: SV2 (Estimation) + SV3 (User Manual)**
**Ưu tiên: Bắt buộc — Đây là yêu cầu nộp bài của môn học**

---

### 4.1 — Tài liệu Ước lượng Dự án (Function Point + COCOMO)

**Phụ trách: SV2**
**Lý do:** Môn học yêu cầu áp dụng ít nhất 1 phương pháp ước lượng với giả định, dữ liệu đầu vào và kết quả rõ ràng.

- [ ] **[SV2]** Tạo file `docs/estimation/function-point-analysis.md`:
  - Liệt kê tất cả Function Types: External Inputs (EI), External Outputs (EO), External Inquiries (EQ), Internal Logical Files (ILF), External Interface Files (EIF)
  - Tính Unadjusted Function Points (UFP) cho từng module (Auth, Trees, Maintenance, Mobile)
  - Áp dụng Value Adjustment Factor (VAF) với 14 General System Characteristics
  - Tính Adjusted Function Points (AFP) cuối cùng
- [ ] **[SV2]** Tạo file `docs/estimation/cocomo-estimation.md`:
  - Áp dụng COCOMO Basic với mode: Semi-detached (dự án vừa, nhóm có kinh nghiệm trung bình)
  - Tính KLOC từ AFP (dùng hệ số chuyển đổi ngôn ngữ TypeScript/JavaScript)
  - Tính Effort (person-months): `E = a × (KLOC)^b`
  - Tính Duration: `D = c × E^d`
  - Tính Team Size: `N = E / D`
  - So sánh với thực tế: 15 AI Agents × thời gian thực hiện
- [ ] **[SV2]** Tạo file `docs/estimation/project-schedule.md`:
  - Gantt Chart (dạng Markdown table hoặc link file Excel)
  - Milestones: Phase 1 → Phase 2 → Phase 3 → Phase 4
  - Critical Path: xác định các task không thể trễ

**Định nghĩa hoàn thành (DoD):**
- Ba file tài liệu được tạo trong `docs/estimation/`
- Tất cả con số có giải thích giả định rõ ràng
- Kết quả ước lượng được so sánh với thực tế thực hiện

---

### 4.2 — User Manual cho Web và Mobile

**Phụ trách: SV3**
**Lý do:** Tài liệu hướng dẫn sử dụng là deliverable bắt buộc, giúp người dùng cuối (Admin, Manager, Staff) vận hành hệ thống đúng cách.

- [ ] **[SV3]** Tạo `docs/user-manual/admin-manager-guide.md`:
  - Hướng dẫn đăng nhập và phân quyền
  - Hướng dẫn xem bản đồ 3D: zoom, click marker, xem Infobox
  - Hướng dẫn sử dụng Dashboard: đọc KPI, lọc theo thời gian
  - Hướng dẫn tạo và phân công task bảo trì
  - Hướng dẫn xuất báo cáo PDF/Excel (Phase 2.1)
  - Hướng dẫn xem Audit Log (Phase 3.1)
- [ ] **[SV3]** Tạo `docs/user-manual/staff-mobile-guide.md`:
  - Hướng dẫn cài đặt Expo Go và kết nối server
  - Hướng dẫn đăng nhập
  - Hướng dẫn xem danh sách task được giao
  - Hướng dẫn hoàn thành task: đến đúng vị trí GPS → chụp ảnh → submit
  - Giải thích lỗi "Bạn đang cách cây Xm" (geofencing)
  - Hướng dẫn quét QR Code để tra cứu cây (Phase 1.2)
- [ ] **[SV3]** Tạo `docs/user-manual/troubleshooting.md`:
  - Các lỗi thường gặp và cách xử lý
  - Liên hệ hỗ trợ kỹ thuật

**Định nghĩa hoàn thành (DoD):**
- Ba file tài liệu được tạo trong `docs/user-manual/`
- Mỗi bước có mô tả rõ ràng (có thể kèm screenshot nếu cần)
- Tài liệu được review bởi ít nhất 1 thành viên khác trong nhóm

---

## 📊 Tổng quan tiến độ

```
Phase 1 — Multimedia & Identification     [SV1]  ░░░░░░░░░░  0%
  1.1 Cloud Image Storage (Supabase)              □ □ □ □ □ □ □
  1.2 QR Code Generation                          □ □ □ □ □ □ □

Phase 2 — Management & Analytics          [SV2]  ░░░░░░░░░░  0%
  2.1 PDF/Excel Export                            □ □ □ □ □
  2.2 Staff Performance Dashboard                 □ □ □ □

Phase 3 — Security & Traceability         [SV3]  ░░░░░░░░░░  0%
  3.1 Audit Logs                                  □ □ □ □ □ □
  3.2 Integration Tests                           □ □ □ □ □ □

Phase 4 — Finalization                 [SV2+SV3]  ░░░░░░░░░░  0%
  4.1 Function Point + COCOMO Docs       [SV2]   □ □ □
  4.2 User Manual Web + Mobile           [SV3]   □ □ □
```

Cập nhật ô `□` thành `✅` khi hoàn thành từng task.

---

## 🛠️ Hướng dẫn sử dụng `.claude/rules/` và `.claude/skills/`

Đây là phần quan trọng nhất để nhóm làm việc hiệu quả với AI. Các file trong `.claude/` là **hướng dẫn hành vi** cho AI Agent — chúng kiểm soát cách AI viết code, commit, và thực thi task.

### Cấu trúc hiện tại

```
.claude/
├── rules/
│   ├── node.md                          # Quy tắc code cho Node.js/TypeScript
│   └── everything-claude-code-guardrails.md  # Guardrails tổng thể
├── skills/
│   └── everything-claude-code/
│       └── SKILL.md                     # Conventions: commit, naming, testing
└── commands/
    ├── feature-development.md           # Workflow cho feature mới
    └── database-migration.md            # Workflow cho thay đổi DB schema
```

---

### Cách SV1 dùng khi thực hiện Phase 1

**Khi implement Supabase Storage (task 1.1):**

1. Đây là **feature mới** → dùng workflow `feature-development`:
   - Đọc `.claude/commands/feature-development.md` để hiểu sequence
   - Sequence: Implement → Test → Document
   - Commit theo convention: `feat(storage): add Supabase image upload service`

2. Khi tạo `cloud-storage.service.ts`, AI sẽ tuân theo `.claude/rules/node.md`:
   - TypeScript strict mode
   - Không dùng `var`, ưu tiên `const`
   - File naming: `cloud-storage.service.ts` (lowercase-hyphen)

3. Khi thêm cột mới hoặc thay đổi entity → đây là **database change** → dùng workflow `database-migration`:
   - Đọc `.claude/commands/database-migration.md`
   - Tạo migration file trước khi sửa entity
   - Commit: `feat(db): add evidence_image_url column to maintenance_tasks`

**Khi implement QR Code (task 1.2):**
- Commit: `feat(trees): add QR code generation endpoint`
- Test file: `trees.service.spec.ts` (thêm test case cho QR generation)

---

### Cách SV2 dùng khi thực hiện Phase 2

**Khi implement Export (task 2.1):**

1. Đây là feature mới với endpoint mới → `feature-development` workflow
2. Commit convention từ `SKILL.md`:
   - `feat(reports): add Excel export endpoint for maintenance tasks`
   - `feat(reports): add PDF export with date range filter`
   - `feat(dashboard): add export buttons to DashboardPage`

3. Khi thêm stats endpoints (task 2.2):
   - `feat(stats): add staff performance aggregation endpoint`
   - `feat(dashboard): add employee performance bar chart`

**Lưu ý cho SV2:** Guardrails trong `.claude/rules/everything-claude-code-guardrails.md` yêu cầu:
- Giữ nguyên module organization hiện tại (không tạo module mới nếu không cần)
- Validate risky config changes trong PR
- Dùng relative imports

---

### Cách SV3 dùng khi thực hiện Phase 3

**Khi implement Audit Logs (task 3.1):**

1. Đây là **schema mới** → bắt đầu bằng `database-migration` workflow:
   - Tạo entity `AuditLog` trước
   - Commit: `feat(db): add audit_logs table entity`
   - Sau đó inject service: `feat(audit): add AuditLogService and integrate with TreesService`

2. Khi viết Integration Tests (task 3.2):
   - Theo `SKILL.md`: test files dùng pattern `*.spec.ts` hoặc `*.e2e-spec.ts`
   - Commit: `test(e2e): add integration tests for task completion workflow`
   - Commit: `test(e2e): add geofencing rejection test cases`

**Lưu ý cho SV3:** Guardrails yêu cầu:
- New features phải có test trước khi merge
- Coverage target: ≥ 80% cho business logic

---

### Quy trình làm việc chung cho cả nhóm

Mỗi khi bắt đầu một task mới, thực hiện theo thứ tự sau:

```
1. Đọc task description trong ROADMAP.md
      ↓
2. Xác định loại task:
   - Feature mới?     → dùng .claude/commands/feature-development.md
   - Thay đổi DB?     → dùng .claude/commands/database-migration.md
      ↓
3. Giao task cho AI với context đầy đủ:
   - Mô tả rõ yêu cầu
   - Chỉ định file cần tạo/sửa
   - Nêu Định nghĩa hoàn thành (DoD)
      ↓
4. Review output của AI:
   - Kiểm tra logic nghiệp vụ có đúng không
   - Kiểm tra test có pass không: npm test
   - Kiểm tra build không lỗi: npm run build
      ↓
5. Commit theo convention từ SKILL.md:
   feat/fix/test/docs(scope): mô tả ngắn gọn
      ↓
6. Cập nhật checkbox trong ROADMAP.md
```

> ⚠️ **Nhắc nhở quan trọng:** AI chỉ là công cụ thực thi. Mỗi thành viên phải **hiểu và có thể giải thích** code do AI tạo ra — đây là tiêu chí đánh giá cá nhân (25%) trong môn học.

---

## 📁 Cấu trúc thư mục tài liệu cần tạo

```
docs/
├── estimation/
│   ├── function-point-analysis.md    [SV2 - Phase 4.1]
│   ├── cocomo-estimation.md          [SV2 - Phase 4.1]
│   └── project-schedule.md           [SV2 - Phase 4.1]
└── user-manual/
    ├── admin-manager-guide.md        [SV3 - Phase 4.2]
    ├── staff-mobile-guide.md         [SV3 - Phase 4.2]
    └── troubleshooting.md            [SV3 - Phase 4.2]
```

---

*Roadmap này được quản lý bởi nhóm PM (SV1, SV2, SV3). Mọi thay đổi phạm vi phải được cả nhóm đồng thuận trước khi cập nhật.*
