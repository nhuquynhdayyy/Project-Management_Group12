# Requirements Document

## Introduction

This document defines the requirements for the Audit Log System (Phase 3: Security & Traceability) of the Urban Green Infrastructure Management System NestJS backend. The system records all critical user actions — including authentication events, tree CRUD operations, maintenance task lifecycle events, and failed/forbidden actions — into a persistent `audit_logs` table. Logging is performed asynchronously (fire-and-forget) via a NestJS interceptor so that audit failures never impact the main request flow. Sensitive data (passwords, tokens) is never stored. Integration tests cover real-world field-staff mobile scenarios including GPS-based task completion.

---

## Glossary

- **AuditLog**: A persisted record in the `audit_logs` table capturing a single user action event.
- **AuditLogService**: The NestJS service responsible for persisting `AuditLog` records asynchronously.
- **AuditInterceptor**: The NestJS `NestInterceptor` that intercepts HTTP requests/responses on configured endpoints and delegates to `AuditLogService`.
- **AuditAction**: An enum of loggable action types (e.g., `LOGIN_SUCCESS`, `LOGIN_FAIL`, `TREE_CREATE`, `TASK_COMPLETE`, `GEOFENCE_FAIL`, etc.).
- **AuditEntity**: An enum of entity domains targeted by an action (e.g., `auth`, `tree`, `task`).
- **SensitiveFieldFilter**: The logic that strips `password`, `token`, and `access_token` keys from request body objects before storage.
- **GeofenceResult**: The outcome of a GPS proximity check — either success (within 10 m) or failure (outside 10 m).
- **FireAndForget**: An async pattern where the audit write is initiated but its result is not awaited by the main request pipeline.
- **JSONB**: PostgreSQL binary JSON column type used for `metadata` and `request_body` fields.
- **JwtAuthGuard**: The existing NestJS guard that validates JWT Bearer tokens on protected routes.
- **MaintenanceTask**: The existing entity representing a tree maintenance task with geofencing completion logic.
- **Tree**: The existing entity representing an urban tree with a PostGIS geometry location.
- **User**: The existing entity representing a system user with roles.

---

## Requirements

### Requirement 1: Audit Log Entity and Database Schema

**User Story:** As a system administrator, I want all audit events stored in a structured database table, so that I can query and trace any user action across the system.

#### Acceptance Criteria

1. THE `AuditLog` entity SHALL map to a PostgreSQL table named `audit_logs` with the following columns: `id` (UUID primary key), `user_id` (nullable integer FK referencing `users.id`), `action` (varchar enum), `entity` (varchar), `entity_id` (nullable varchar), `metadata` (JSONB), `request_body` (JSONB), `response_status` (integer), `gps_latitude` (nullable decimal), `gps_longitude` (nullable decimal), `ip_address` (varchar), `user_agent` (varchar), `created_at` (timestamp, auto-set).
2. THE `AuditLog` entity SHALL define a database index on `user_id` to support efficient per-user queries.
3. THE `AuditLog` entity SHALL define a database index on `action` to support efficient action-type queries.
4. THE `AuditLog` entity SHALL define a database index on `created_at` to support efficient time-range queries.
5. WHEN the application starts with `synchronize: true`, THE TypeORM SHALL auto-create the `audit_logs` table and its indexes without requiring a separate migration file.
6. THE `AuditAction` enum SHALL include at minimum the values: `LOGIN_SUCCESS`, `LOGIN_FAIL`, `LOGOUT`, `TREE_CREATE`, `TREE_READ`, `TREE_UPDATE`, `TREE_DELETE`, `TASK_CREATE`, `TASK_READ`, `TASK_UPDATE`, `TASK_ASSIGN`, `TASK_COMPLETE`, `TASK_STATUS_UPDATE`, `GEOFENCE_FAIL`, `FORBIDDEN`, `VALIDATION_ERROR`.

---

### Requirement 2: Sensitive Data Filtering

**User Story:** As a security officer, I want passwords and tokens never stored in audit logs, so that the audit log database cannot be used to compromise user credentials.

#### Acceptance Criteria

1. THE `SensitiveFieldFilter` SHALL remove the keys `password`, `token`, and `access_token` from any object before it is stored in the `request_body` or `metadata` JSONB columns.
2. THE `SensitiveFieldFilter` SHALL perform deep removal, so that nested objects containing sensitive keys are also sanitised.
3. WHEN a login request body containing a `password` field is logged, THE `AuditLogService` SHALL store `request_body` without the `password` key.
4. WHEN an auth response containing an `access_token` field is logged, THE `AuditLogService` SHALL store `metadata` without the `access_token` key.
5. THE `SensitiveFieldFilter` SHALL preserve all non-sensitive fields in the filtered object.

---

### Requirement 3: Asynchronous Fire-and-Forget Logging

**User Story:** As a backend engineer, I want audit logging to be non-blocking, so that a failure in the audit subsystem never degrades or crashes the main API response.

#### Acceptance Criteria

1. WHEN the `AuditInterceptor` triggers an audit write, THE `AuditLogService` SHALL persist the record asynchronously without blocking the HTTP response.
2. IF the `AuditLogService` throws an error during persistence, THEN THE `AuditInterceptor` SHALL catch the error, log it to the NestJS logger, and allow the original HTTP response to complete normally.
3. IF the database connection is unavailable when an audit write is attempted, THEN THE `AuditLogService` SHALL fail silently without propagating the exception to the caller.
4. THE main HTTP request response time SHALL NOT increase by more than 5 ms on average due to audit log initialisation overhead (the async write itself is non-blocking).

---

### Requirement 4: NestJS Interceptor for Automatic Logging

**User Story:** As a backend engineer, I want a single interceptor to handle audit logging declaratively, so that individual controllers do not need manual logging code.

#### Acceptance Criteria

1. THE `AuditInterceptor` SHALL implement the NestJS `NestInterceptor` interface and be applicable via `@UseInterceptors()` at controller or route level.
2. WHEN applied to a route, THE `AuditInterceptor` SHALL capture the HTTP method, URL, request body, response status code, `ip_address` from `req.ip`, and `user_agent` from `req.headers['user-agent']`.
3. WHEN a JWT-authenticated request is intercepted, THE `AuditInterceptor` SHALL extract `user_id` from `req.user.userId` or `req.user.id`.
4. WHEN an unauthenticated request (e.g., login attempt) is intercepted, THE `AuditInterceptor` SHALL store `user_id` as `null`.
5. THE `AuditInterceptor` SHALL accept a configuration object specifying the `action` (`AuditAction`) and `entity` (`AuditEntity`) for each decorated route.
6. WHERE GPS coordinates are present in the request body (`latitude`, `longitude`), THE `AuditInterceptor` SHALL extract and store them in `gps_latitude` and `gps_longitude`.

---

### Requirement 5: Auth Module Audit Integration

**User Story:** As a security officer, I want every login and registration attempt logged, so that I can detect brute-force attacks and unauthorised access.

#### Acceptance Criteria

1. WHEN a `POST /auth/login` request succeeds (HTTP 200), THE `AuditLogService` SHALL create an `AuditLog` record with `action = LOGIN_SUCCESS`, `entity = auth`, and `user_id` set to the authenticated user's ID.
2. WHEN a `POST /auth/login` request fails with HTTP 401 (invalid credentials), THE `AuditLogService` SHALL create an `AuditLog` record with `action = LOGIN_FAIL`, `entity = auth`, and `user_id = null`.
3. THE `AuditLog` record for a login attempt SHALL store the `username` in `metadata` without storing the `password`.
4. WHEN a `POST /auth/register` request succeeds (HTTP 201), THE `AuditLogService` SHALL create an `AuditLog` record with `action = TASK_CREATE` mapped to the appropriate registration action, `entity = auth`, and `user_id` set to the new user's ID.

---

### Requirement 6: Trees Module Audit Integration

**User Story:** As a system administrator, I want all tree CRUD operations logged, so that I can audit who created, modified, or deleted tree records.

#### Acceptance Criteria

1. WHEN a `POST /trees` request succeeds (HTTP 201), THE `AuditLogService` SHALL create an `AuditLog` record with `action = TREE_CREATE`, `entity = tree`, `entity_id` set to the new tree's ID, and `metadata` containing the tree code and species ID.
2. WHEN a `GET /trees/:id` request is processed, THE `AuditLogService` SHALL create an `AuditLog` record with `action = TREE_READ` and `entity_id` set to the requested tree ID.
3. WHEN a `POST /trees` request fails with a validation error (HTTP 400), THE `AuditLogService` SHALL create an `AuditLog` record with `action = VALIDATION_ERROR`, `entity = tree`, and `metadata` containing the validation error details.
4. THE `AuditLog` record for tree operations SHALL include `user_id` of the authenticated user performing the action.

---

### Requirement 7: Maintenance Module Audit Integration

**User Story:** As a field supervisor, I want all maintenance task lifecycle events logged with GPS data, so that I can verify field staff completed tasks at the correct location.

#### Acceptance Criteria

1. WHEN a `POST /maintenance/tasks` request succeeds (HTTP 201), THE `AuditLogService` SHALL create an `AuditLog` record with `action = TASK_CREATE`, `entity = task`, `entity_id` set to the new task's ID, and `metadata` containing `tree_id` and `assigned_to`.
2. WHEN a `PATCH /maintenance/tasks/:id/status` request succeeds, THE `AuditLogService` SHALL create an `AuditLog` record with `action = TASK_STATUS_UPDATE`, `entity = task`, and `metadata` containing the new status value.
3. WHEN a `POST /maintenance/tasks/:id/complete` request succeeds (HTTP 200 or 201), THE `AuditLogService` SHALL create an `AuditLog` record with `action = TASK_COMPLETE`, `entity = task`, `entity_id` set to the task ID, `gps_latitude` and `gps_longitude` set to the submitted coordinates, and `metadata` containing the distance from the tree.
4. WHEN a `POST /maintenance/tasks/:id/complete` request fails due to geofencing (HTTP 403, distance > 10 m), THE `AuditLogService` SHALL create an `AuditLog` record with `action = GEOFENCE_FAIL`, `entity = task`, `entity_id` set to the task ID, `gps_latitude` and `gps_longitude` set to the submitted coordinates, and `metadata` containing the actual distance.
5. WHEN a `POST /maintenance/tasks/:id/complete` request fails because the task is not assigned to the requesting user (HTTP 403), THE `AuditLogService` SHALL create an `AuditLog` record with `action = FORBIDDEN`, `entity = task`, and `metadata` containing the reason.

---

### Requirement 8: Integration Tests — Authentication Scenarios

**User Story:** As a QA engineer, I want integration tests for auth audit logging, so that I can verify audit records are created correctly for both successful and failed login attempts.

#### Acceptance Criteria

1. WHEN a login integration test sends valid credentials to `POST /auth/login`, THE test SHALL assert that an `AuditLog` record with `action = LOGIN_SUCCESS` exists in the database after the request.
2. WHEN a login integration test sends invalid credentials to `POST /auth/login`, THE test SHALL assert that an `AuditLog` record with `action = LOGIN_FAIL` exists in the database after the request.
3. THE integration test for successful login SHALL assert that the stored `request_body` does not contain a `password` field.
4. THE integration test for failed login SHALL assert that `user_id` is `null` in the stored `AuditLog` record.

---

### Requirement 9: Integration Tests — Tree Operation Scenarios

**User Story:** As a QA engineer, I want integration tests for tree audit logging, so that I can verify the correct action and metadata are captured for tree creation.

#### Acceptance Criteria

1. WHEN a tree creation integration test sends a valid `POST /trees` request, THE test SHALL assert that an `AuditLog` record with `action = TREE_CREATE` and the correct `entity_id` exists in the database.
2. THE integration test SHALL assert that the `metadata` field of the `AuditLog` record contains the `tree_code` of the created tree.
3. THE integration test SHALL assert that `user_id` in the `AuditLog` record matches the authenticated user's ID.

---

### Requirement 10: Integration Tests — Maintenance Task Scenarios (Mobile/GPS)

**User Story:** As a QA engineer, I want integration tests for the full field-staff mobile workflow, so that I can verify GPS coordinates are captured and geofencing outcomes are correctly logged.

#### Acceptance Criteria

1. WHEN an integration test simulates a field staff member completing a task within 10 m of the tree, THE test SHALL assert that an `AuditLog` record with `action = TASK_COMPLETE` exists and that `gps_latitude` and `gps_longitude` match the submitted coordinates.
2. WHEN an integration test simulates a field staff member attempting to complete a task from more than 10 m away, THE test SHALL assert that an `AuditLog` record with `action = GEOFENCE_FAIL` exists and that `gps_latitude` and `gps_longitude` match the submitted coordinates.
3. WHEN an integration test simulates the full mobile workflow (login → get task → submit GPS → complete task), THE test SHALL assert that `AuditLog` records exist for each step and that the `TASK_COMPLETE` record contains valid GPS coordinates.
4. WHEN an integration test simulates task assignment, THE test SHALL assert that an `AuditLog` record with `action = TASK_ASSIGN` or `TASK_CREATE` exists with `metadata` containing `assigned_to`.

---

### Requirement 11: Integration Tests — Security and Resilience Scenarios

**User Story:** As a security engineer, I want integration tests that verify sensitive data is never logged and that audit failures never crash the API, so that I can certify the system meets security and resilience requirements.

#### Acceptance Criteria

1. THE security integration test SHALL assert that no `AuditLog` record in the database contains a `password`, `token`, or `access_token` value in `request_body` or `metadata` after a login request.
2. WHEN the `AuditLogService` is configured to throw an error (mocked), THE resilience integration test SHALL assert that the HTTP response still returns the expected status code and body.
3. THE resilience integration test SHALL assert that the main request completes within an acceptable time limit even when the audit service is slow or unavailable.
4. WHEN a forbidden action is attempted (e.g., completing another user's task), THE integration test SHALL assert that an `AuditLog` record with `action = FORBIDDEN` is created and the HTTP response returns HTTP 403.

---

### Requirement 12: Configurable Endpoint Logging

**User Story:** As a backend engineer, I want to control which endpoints are audited via configuration, so that low-value endpoints (e.g., health checks) do not generate unnecessary audit noise.

#### Acceptance Criteria

1. THE `AuditInterceptor` SHALL be applied only to explicitly decorated routes or controllers, not globally to all routes.
2. WHERE a route is not decorated with `@UseInterceptors(AuditInterceptor)`, THE `AuditLogService` SHALL NOT create an `AuditLog` record for requests to that route.
3. THE `AuditInterceptor` SHALL accept per-route configuration (action type and entity type) so that different routes produce correctly typed audit records.
