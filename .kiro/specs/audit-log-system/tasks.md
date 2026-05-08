# Implementation Plan: Audit Log System

## Overview

Implement a cross-cutting audit log layer for the NestJS backend using a TDD approach. Unit tests are written first (section 6), then the implementation files are created (sections 1–5), followed by the e2e integration test suite (section 7). The `AuditInterceptor` uses RxJS `tap`/`catchError` for fire-and-forget logging. `GeofenceException` is introduced to prevent double-logging on geofence failures. `fast-check` is used for property-based tests.

## Tasks

- [ ] 1. Install fast-check and set up the AuditLog entity
  - [ ] 1.1 Install fast-check as a devDependency
    - Run `npm install --save-dev fast-check` inside `backend/`
    - Verify it appears in `package.json` devDependencies
    - _Requirements: 2.1, 2.2_

  - [ ] 1.2 Create the AuditLog entity and enums
    - Create `backend/src/entities/auditLog.entity.ts`
    - Define `AuditAction` enum with all 16 values: `LOGIN_SUCCESS`, `LOGIN_FAIL`, `LOGOUT`, `TREE_CREATE`, `TREE_READ`, `TREE_UPDATE`, `TREE_DELETE`, `TASK_CREATE`, `TASK_READ`, `TASK_UPDATE`, `TASK_ASSIGN`, `TASK_COMPLETE`, `TASK_STATUS_UPDATE`, `GEOFENCE_FAIL`, `FORBIDDEN`, `VALIDATION_ERROR`
    - Define `AuditEntity` enum with values: `AUTH = 'auth'`, `TREE = 'tree'`, `TASK = 'task'`
    - Define `AuditLog` entity mapped to table `audit_logs` with columns: `id` (UUID PK), `user_id` (nullable int), `action` (varchar 50), `entity` (varchar 50), `entity_id` (nullable varchar 255), `metadata` (jsonb nullable), `request_body` (jsonb nullable), `response_status` (int), `gps_latitude` (decimal 10,7 nullable), `gps_longitude` (decimal 10,7 nullable), `ip_address` (varchar 45), `user_agent` (varchar 500), `created_at` (CreateDateColumn)
    - Add `@Index()` on `user_id`, `action`, and `created_at`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [ ] 2. Unit tests for SensitiveFieldFilter (TDD — write tests first)
  - [ ] 2.1 Write unit tests for filterSensitiveFields
    - Create `backend/src/modules/audit-log/sensitiveFieldFilter.spec.ts`
    - Test: removes `password` at top level
    - Test: removes `token` at top level
    - Test: removes `access_token` at top level
    - Test: deep removal — nested object containing `password` is sanitised
    - Test: deep removal — doubly-nested object containing `token` is sanitised
    - Test: preserves all non-sensitive keys and their values unchanged
    - Test: handles null/undefined input gracefully (returns `{}` or passes through)
    - Test: handles arrays of objects containing sensitive keys
    - _Requirements: 2.1, 2.2, 2.5_

  - [ ]* 2.2 Write property test for filterSensitiveFields (Property 1)
    - Add to `sensitiveFieldFilter.spec.ts` using `fast-check`
    - **Property 1: Sensitive Field Filter Correctness**
    - Generate arbitrary objects with random mixes of sensitive keys (`password`, `token`, `access_token`) and non-sensitive keys at arbitrary nesting depth
    - Assert: filtered result contains none of `password`, `token`, `access_token` at any nesting level
    - Assert: all non-sensitive keys are present with their original values unchanged
    - Run minimum 100 iterations (`numRuns: 100`)
    - **Validates: Requirements 2.1, 2.2, 2.5**

- [ ] 3. Implement SensitiveFieldFilter
  - [ ] 3.1 Implement filterSensitiveFields pure function
    - Create `backend/src/modules/audit-log/sensitiveFieldFilter.ts`
    - Export `const SENSITIVE_KEYS = ['password', 'token', 'access_token']`
    - Export `function filterSensitiveFields(obj: Record<string, any>): Record<string, any>`
    - Perform deep clone with recursive removal of any key in `SENSITIVE_KEYS`
    - Return a new object — do not mutate the input
    - Handle null/undefined input by returning `{}`
    - Handle arrays by recursively filtering each element
    - Run `sensitiveFieldFilter.spec.ts` tests — all must pass before proceeding
    - _Requirements: 2.1, 2.2, 2.5_

- [ ] 4. Unit tests for AuditLogService (TDD — write tests first)
  - [ ] 4.1 Write unit tests for AuditLogService
    - Create `backend/src/modules/audit-log/auditLog.service.spec.ts`
    - Mock the `AuditLog` TypeORM repository
    - Test: `create()` saves a record with correct field mapping from `CreateAuditLogDto`
    - Test: `create()` never throws when the repository `save()` throws — error is caught internally
    - Test: `create()` calls `filterSensitiveFields` on `requestBody` before persisting
    - Test: `create()` calls `filterSensitiveFields` on `metadata` before persisting
    - Test: `findAll()` returns all records ordered by `created_at DESC`
    - _Requirements: 2.3, 2.4, 3.1, 3.2, 3.3_

  - [ ]* 4.2 Write property test for AuditLogService (Property 4)
    - Add to `auditLog.service.spec.ts` using `fast-check`
    - **Property 4: No Sensitive Data in Persisted Audit Logs**
    - Generate arbitrary `CreateAuditLogDto` objects with random `requestBody` and `metadata` that may contain sensitive keys at any nesting depth
    - Call `service.create(dto)` and inspect the object passed to `mockRepo.save()`
    - Assert: `request_body` in the saved record contains none of `password`, `token`, `access_token` at any nesting level
    - Assert: `metadata` in the saved record contains none of `password`, `token`, `access_token` at any nesting level
    - Run minimum 100 iterations (`numRuns: 100`)
    - **Validates: Requirements 2.3, 2.4, 11.1**

- [ ] 5. Unit tests for AuditInterceptor (TDD — write tests first)
  - [ ] 5.1 Write unit tests for AuditInterceptor
    - Create `backend/src/modules/audit-log/auditLog.interceptor.spec.ts`
    - Mock `AuditLogService` and `ExecutionContext`
    - Test: extracts `user_id` from `req.user.userId` (primary field)
    - Test: falls back to `req.user.id` when `req.user.userId` is absent
    - Test: sets `user_id = null` when `req.user` is absent (unauthenticated request)
    - Test: extracts `gps_latitude` and `gps_longitude` from request body when `latitude`/`longitude` are present
    - Test: sets GPS fields to `null` when absent from request body
    - Test: calls `AuditLogService.create()` with the correct `action` and `entity` from the config object
    - Test: on success path — calls `create()` with response status 200 or 201
    - Test: on error path — calls `create()` with the error's HTTP status code, then re-throws the original error
    - Test: does not block the response when `AuditLogService.create()` is slow (fire-and-forget)
    - Test: skips logging in `catchError` when the error is an instance of `GeofenceException`
    - _Requirements: 3.1, 3.2, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 12.1, 12.3_

- [ ] 6. Implement CreateAuditLogDto, AuditLogService, AuditInterceptor, and AuditLogModule
  - [ ] 6.1 Create CreateAuditLogDto
    - Create `backend/src/modules/audit-log/dto/create-audit-log.dto.ts`
    - Define `CreateAuditLogDto` class with fields: `userId?: number | null`, `action: AuditAction`, `entity: AuditEntity`, `entityId?: string | null`, `metadata?: Record<string, any> | null`, `requestBody?: Record<string, any> | null`, `responseStatus: number`, `gpsLatitude?: number | null`, `gpsLongitude?: number | null`, `ipAddress: string`, `userAgent: string`
    - _Requirements: 4.5_

  - [ ] 6.2 Implement AuditLogService
    - Create `backend/src/modules/audit-log/auditLog.service.ts`
    - Inject `AuditLog` TypeORM repository via `@InjectRepository(AuditLog)`
    - Implement `create(dto: CreateAuditLogDto): Promise<void>` — wraps the entire body in try/catch, calls `filterSensitiveFields` on `dto.requestBody` and `dto.metadata`, maps DTO fields to entity columns, calls `repository.save()`, catches and logs any error to `NestJS Logger` without re-throwing
    - Implement `findAll(): Promise<AuditLog[]>` — returns all records ordered by `created_at DESC`
    - Run `auditLog.service.spec.ts` tests — all must pass before proceeding
    - _Requirements: 2.3, 2.4, 3.1, 3.2, 3.3_

  - [ ] 6.3 Implement GeofenceException
    - Add `GeofenceException` class to `backend/src/modules/maintenance/maintenance.service.ts` (or a shared exceptions file imported by both maintenance and audit-log modules)
    - `GeofenceException extends ForbiddenException`
    - Used by `MaintenanceService.completeTask()` to throw a distinguishable exception that the interceptor can detect and skip double-logging
    - _Requirements: 7.4_

  - [ ] 6.4 Implement AuditInterceptor
    - Create `backend/src/modules/audit-log/auditLog.interceptor.ts`
    - Implement `AuditInterceptorConfig` interface: `{ action: AuditAction; entity: AuditEntity }`
    - Implement `AuditInterceptor` class implementing `NestInterceptor`
    - Constructor: `constructor(private readonly auditLogService: AuditLogService, private readonly config: AuditInterceptorConfig)`
    - `intercept()`: extract `userId` from `req.user?.userId ?? req.user?.id ?? null`, extract `ipAddress` from `req.ip`, `userAgent` from `req.headers['user-agent']`, `requestBody` from `req.body`, GPS from `req.body.latitude`/`req.body.longitude`
    - Success path: use RxJS `tap` to call `this.writeAuditLog(req, status, responseBody).catch(() => {})`
    - Error path: use RxJS `catchError` — if `err instanceof GeofenceException` skip logging and re-throw; otherwise call `this.writeAuditLog(req, status, null, err).catch(() => {})` then `return throwError(() => err)`
    - `writeAuditLog()` is a private async method that calls `auditLogService.create()`
    - Run `auditLog.interceptor.spec.ts` tests — all must pass before proceeding
    - _Requirements: 3.1, 3.2, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 12.1, 12.3_

  - [ ] 6.5 Create AuditLogController
    - Create `backend/src/modules/audit-log/auditLog.controller.ts`
    - Implement `GET /audit-logs` endpoint protected by `JwtAuthGuard`
    - Inject `AuditLogService` and call `findAll()`
    - Returns all records ordered by `created_at DESC`
    - _Requirements: 12.1_

  - [ ] 6.6 Create AuditLogModule
    - Create `backend/src/modules/audit-log/auditLog.module.ts`
    - Import `TypeOrmModule.forFeature([AuditLog])`
    - Declare `AuditLogController`
    - Provide and export `AuditLogService`
    - _Requirements: 4.1_

- [ ] 7. Checkpoint — run unit tests
  - Ensure all unit tests pass (`npm test --run` or `npx jest` inside `backend/`), ask the user if questions arise.

- [ ] 8. Integration — Auth module
  - [ ] 8.1 Import AuditLogModule into AuthModule
    - Modify `backend/src/modules/auth/auth.module.ts`
    - Add `AuditLogModule` to the `imports` array
    - _Requirements: 5.1, 5.2, 5.3_

  - [ ] 8.2 Add AuditInterceptor to auth login route
    - Modify `backend/src/modules/auth/auth.controller.ts`
    - Inject `AuditLogService` into `AuthController` constructor
    - Add `@UseInterceptors(new AuditInterceptor(auditLogService, { action: AuditAction.LOGIN_SUCCESS, entity: AuditEntity.AUTH }))` to the `POST /auth/login` route
    - The interceptor's `catchError` path will log `LOGIN_FAIL` using the error status (401); the success path logs `LOGIN_SUCCESS`
    - Note: the config `action` is the success-path action; the error path uses the HTTP status from the thrown exception
    - _Requirements: 5.1, 5.2, 5.3_

- [ ] 9. Integration — Trees module
  - [ ] 9.1 Import AuditLogModule into TreesModule
    - Modify `backend/src/modules/trees/trees.module.ts`
    - Add `AuditLogModule` to the `imports` array
    - _Requirements: 6.1, 6.4_

  - [ ] 9.2 Add AuditInterceptor to trees routes
    - Modify `backend/src/modules/trees/trees.controller.ts`
    - Inject `AuditLogService` into `TreesController` constructor
    - Add `@UseInterceptors(new AuditInterceptor(auditLogService, { action: AuditAction.TREE_CREATE, entity: AuditEntity.TREE }))` to `POST /trees`
    - Add `@UseInterceptors(new AuditInterceptor(auditLogService, { action: AuditAction.TREE_READ, entity: AuditEntity.TREE }))` to `GET /trees/:id`
    - The interceptor extracts `entity_id` from the response object's `id` field and `metadata` from `tree_code`/`species_id`
    - _Requirements: 6.1, 6.2, 6.4_

- [ ] 10. Integration — Maintenance module
  - [ ] 10.1 Import AuditLogModule into MaintenanceModule
    - Modify `backend/src/modules/maintenance/maintenance.module.ts`
    - Add `AuditLogModule` to the `imports` array
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ] 10.2 Add AuditInterceptor to maintenance task routes
    - Modify `backend/src/modules/maintenance/maintenance.controller.ts`
    - Inject `AuditLogService` into `MaintenanceController` constructor
    - Add `@UseInterceptors(new AuditInterceptor(auditLogService, { action: AuditAction.TASK_CREATE, entity: AuditEntity.TASK }))` to `POST /maintenance/tasks`
    - Add `@UseInterceptors(new AuditInterceptor(auditLogService, { action: AuditAction.TASK_STATUS_UPDATE, entity: AuditEntity.TASK }))` to `PATCH /maintenance/tasks/:id/status`
    - Add `@UseInterceptors(new AuditInterceptor(auditLogService, { action: AuditAction.TASK_COMPLETE, entity: AuditEntity.TASK }))` to `POST /maintenance/tasks/:id/complete`
    - The complete-task interceptor skips `catchError` logging when `err instanceof GeofenceException` (service already logged `GEOFENCE_FAIL`)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ] 10.3 Inject AuditLogService into MaintenanceService and add GeofenceException logging
    - Modify `backend/src/modules/maintenance/maintenance.service.ts`
    - Inject `AuditLogService` via constructor
    - In `completeTask()`, replace the geofence `throw new ForbiddenException(...)` with:
      1. Call `await this.auditLogService.create({ action: AuditAction.GEOFENCE_FAIL, entity: AuditEntity.TASK, entityId: String(taskId), userId, metadata: { distance: parseFloat(distance.toFixed(1)), maxDistance: this.MAX_DISTANCE_METERS }, requestBody: filterSensitiveFields(completeDto as any), responseStatus: 403, gpsLatitude: completeDto.latitude, gpsLongitude: completeDto.longitude, ipAddress: '', userAgent: '' }).catch(() => {})`
      2. `throw new GeofenceException(...)`
    - For the "not assigned to this task" `ForbiddenException`, the interceptor's `catchError` path handles logging `FORBIDDEN` automatically — no direct service call needed
    - _Requirements: 7.4, 7.5_

- [ ] 11. Wire AuditLogModule into AppModule
  - Modify `backend/src/app.module.ts`
  - Add `AuditLogModule` to the `imports` array
  - This ensures the `audit_logs` table is created via `synchronize: true` on startup
  - _Requirements: 1.5_

- [ ] 12. Checkpoint — run unit tests and verify app starts
  - Ensure all unit tests still pass after module wiring
  - Verify the application compiles without TypeScript errors (`npm run build` inside `backend/`)
  - Ask the user if questions arise.

- [-] 13. Integration tests (TDD — write e2e tests)
  - [x] 13.1 Write the full e2e integration test suite
    - Create `backend/test/audit-log.e2e-spec.ts`
    - Use SuperTest with a full NestJS application bootstrapped via `Test.createTestingModule`
    - Override the `AuditLog` TypeORM repository with an in-memory mock (`getRepositoryToken(AuditLog)`) that stores records in an array — avoids requiring a real test database
    - Also override the real DB repositories for `User`, `Tree`, `MaintenanceTask` with in-memory mocks or use `AppModule` with a test database (match the existing `app.e2e-spec.ts` pattern)
    - Implement the following 10 test scenarios:
      1. **Login success**: POST valid credentials → assert `AuditLog` with `action=LOGIN_SUCCESS`, `user_id` set, `request_body` has no `password` field — _Requirements: 5.1, 5.3, 8.1, 8.3_
      2. **Login fail**: POST invalid credentials → assert `AuditLog` with `action=LOGIN_FAIL`, `user_id=null` — _Requirements: 5.2, 8.2, 8.4_
      3. **TREE_CREATE**: POST valid tree (authenticated) → assert `AuditLog` with `action=TREE_CREATE`, `entity_id` = new tree's ID, `metadata.tree_code` present — _Requirements: 6.1, 9.1, 9.2_
      4. **TASK_COMPLETE with GPS**: POST complete within 10 m → assert `AuditLog` with `action=TASK_COMPLETE`, `gps_latitude`/`gps_longitude` match submitted values — _Requirements: 7.3, 10.1_
      5. **GEOFENCE_FAIL**: POST complete from > 10 m → assert `AuditLog` with `action=GEOFENCE_FAIL`, GPS coordinates match submitted values — _Requirements: 7.4, 10.2_
      6. **Full mobile workflow**: login → GET my tasks → PATCH status → POST complete with GPS → assert audit trail contains `LOGIN_SUCCESS`, `TASK_STATUS_UPDATE`, `TASK_COMPLETE` records in order — _Requirements: 10.3_
      7. **Security — no sensitive data**: After login request, assert no `AuditLog` record in the in-memory store contains `password`, `token`, or `access_token` in `request_body` or `metadata` — _Requirements: 2.3, 2.4, 11.1_
      8. **Resilience**: Override `AuditLogService.create` to throw → assert HTTP response still returns expected status code and body — _Requirements: 3.2, 11.2_
      9. **User ID capture**: Authenticated POST /trees → assert `AuditLog.user_id` matches the JWT `sub` — _Requirements: 4.3, 9.3_
      10. **FORBIDDEN**: Attempt to complete another user's task → assert `AuditLog` with `action=FORBIDDEN`, HTTP response is 403 — _Requirements: 7.5, 11.4_
    - _Requirements: 8.1–8.4, 9.1–9.3, 10.1–10.4, 11.1–11.4_

- [ ] 14. Final checkpoint — ensure all tests pass
  - Run unit tests: `npx jest --testPathPattern=src` inside `backend/`
  - Run e2e tests: `npm run test:e2e` inside `backend/`
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- TDD order: unit test tasks (2, 4, 5) are written before their implementation tasks (3, 6)
- `GeofenceException extends ForbiddenException` is the clean solution to prevent double-logging on geofence failures
- `AuditLogService.create()` never throws — all errors are caught internally and logged to NestJS Logger
- The interceptor is instantiated with `new AuditInterceptor(service, config)` (not injected as a class) to support per-route action/entity configuration
- `fast-check` property tests run 100 iterations each; Properties 1 and 4 are covered by unit-level PBTs; Properties 2 and 3 are validated through the e2e integration tests
- `synchronize: true` is already configured — no migration files are needed; the `audit_logs` table is auto-created on startup
- Each task references specific requirements for traceability
