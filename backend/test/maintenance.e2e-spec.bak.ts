/**
 * Maintenance Module — Integration Tests (Mobile → Cloud Flow)
 *
 * Tests the full real-world workflow:
 *   Staff logs in → gets assigned tasks → completes task with GPS
 *
 * Strategy
 * --------
 * All repositories are replaced with in-memory mocks so no real database
 * is required. The full NestJS HTTP pipeline (guards, pipes, controllers,
 * services) is exercised via SuperTest.
 *
 * Run:
 *   cd backend
 *   npm run test:e2e -- --testPathPattern=maintenance
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { AppModule } from '../src/app.module';
import { MaintenanceTask, TaskStatus, TaskType } from '../src/entities/maintenance-task.entity';
import { Tree } from '../src/entities/tree.entity';
import { User } from '../src/modules/auth/user.entity';
import { AuditLog } from '../src/entities/auditLog.entity';

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

// Tree located at Da Nang City Hall (16.0544, 108.2022)
const TREE_LAT = 16.0544;
const TREE_LNG = 108.2022;

const seedTree: Partial<Tree> = {
  id: 1,
  tree_code: 'TREE-E2E-001',
  species_id: 1,
  area_id: 1,
  location: { type: 'Point', coordinates: [TREE_LNG, TREE_LAT] } as any,
  health_status: 'Tốt' as any,
};

const seedStaff: Partial<User> = {
  id: 10,
  username: 'staff_e2e',
  password: 'hashed',
  is_active: true,
  roles: [{ id: 2, role_name: 'staff' } as any],
  role: 'staff',
  email: null,
  full_name: 'E2E Staff',
  assigned_area_id: 1,
  last_login_at: null,
};

const seedAdmin: Partial<User> = {
  id: 1,
  username: 'admin_e2e',
  password: 'hashed',
  is_active: true,
  roles: [{ id: 1, role_name: 'admin' } as any],
  role: 'admin',
  email: null,
  full_name: 'E2E Admin',
  assigned_area_id: null,
  last_login_at: null,
};

const seedTask: Partial<MaintenanceTask> = {
  id: 100,
  tree_id: 1,
  assigned_to: 10,
  task_type: TaskType.PRUNING,
  status: TaskStatus.PENDING,
  scheduled_date: new Date('2026-12-01'),
  notes: 'E2E test task',
  completed_at: null,
  evidence_image_url: null,
  tree: seedTree as Tree,
};

// ---------------------------------------------------------------------------
// In-memory stores
// ---------------------------------------------------------------------------
let taskStore: Partial<MaintenanceTask>[] = [];
let auditStore: Partial<AuditLog>[] = [];

const mockTaskRepo = {
  create: jest.fn((dto) => ({ ...dto })),
  save: jest.fn(async (task) => {
    const idx = taskStore.findIndex((t) => t.id === task.id);
    if (idx >= 0) taskStore[idx] = { ...taskStore[idx], ...task };
    else taskStore.push(task);
    return task;
  }),
  findOne: jest.fn(async (opts) => {
    const id = opts?.where?.id;
    const found = taskStore.find((t) => t.id === id);
    if (!found) return null;
    // Attach tree relation if requested
    if (opts?.relations?.includes('tree')) {
      return { ...found, tree: seedTree };
    }
    return found;
  }),
  find: jest.fn(async (opts) => {
    if (opts?.where?.assigned_to !== undefined) {
      return taskStore.filter((t) => t.assigned_to === opts.where.assigned_to);
    }
    return [...taskStore];
  }),
};

const mockTreeRepo = {
  findOne: jest.fn(async (opts) =>
    opts?.where?.id === 1 ? seedTree : null,
  ),
  find: jest.fn(async () => [seedTree]),
  createQueryBuilder: jest.fn(),
};

const mockUserRepo = {
  findOne: jest.fn(async (opts) => {
    if (opts?.where?.id === 10) return seedStaff;
    if (opts?.where?.id === 1) return seedAdmin;
    if (opts?.where?.username === 'staff_e2e') return seedStaff;
    if (opts?.where?.username === 'admin_e2e') return seedAdmin;
    return null;
  }),
  find: jest.fn(async () => [seedStaff, seedAdmin]),
  save: jest.fn(async (u) => u),
  update: jest.fn(async () => ({ affected: 1 })),
  createQueryBuilder: jest.fn().mockReturnValue({
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getMany: jest.fn(async () => [seedStaff, seedAdmin]),
  }),
};

const mockAuditRepo = {
  create: jest.fn((dto) => ({ ...dto, created_at: new Date() })),
  save: jest.fn(async (log) => { auditStore.push(log); return log; }),
  find: jest.fn(async () => [...auditStore].reverse()),
};

// ---------------------------------------------------------------------------
// JWT helpers
// ---------------------------------------------------------------------------
function makeToken(app: INestApplication, user: Partial<User>): string {
  const jwtService = app.get(JwtService);
  return jwtService.sign({
    sub: user.id,
    userId: user.id,
    username: user.username,
    roles: (user.roles ?? []).map((r: any) => r.role_name.toLowerCase()),
  });
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------
describe('Maintenance Integration Tests (Mobile → Cloud)', () => {
  let app: INestApplication;
  let staffToken: string;
  let adminToken: string;

  // GPS within 10 m of the tree (~4 m north)
  const GPS_WITHIN = { latitude: 16.05444, longitude: 108.2022 };
  // GPS outside 10 m (~55 m north)
  const GPS_OUTSIDE = { latitude: 16.0549, longitude: 108.2022 };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(getRepositoryToken(MaintenanceTask)).useValue(mockTaskRepo)
      .overrideProvider(getRepositoryToken(Tree)).useValue(mockTreeRepo)
      .overrideProvider(getRepositoryToken(User)).useValue(mockUserRepo)
      .overrideProvider(getRepositoryToken(AuditLog)).useValue(mockAuditRepo)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    staffToken = makeToken(app, seedStaff);
    adminToken = makeToken(app, seedAdmin);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    // Reset stores and restore seed task before each test
    taskStore = [{ ...seedTask }];
    auditStore = [];
    jest.clearAllMocks();

    // Re-wire mocks after clearAllMocks
    mockTaskRepo.create.mockImplementation((dto) => ({ ...dto }));
    mockTaskRepo.save.mockImplementation(async (task) => {
      const idx = taskStore.findIndex((t) => t.id === task.id);
      if (idx >= 0) taskStore[idx] = { ...taskStore[idx], ...task };
      else taskStore.push(task);
      return task;
    });
    mockTaskRepo.findOne.mockImplementation(async (opts) => {
      const id = opts?.where?.id;
      const found = taskStore.find((t) => t.id === id);
      if (!found) return null;
      if (opts?.relations?.includes('tree')) return { ...found, tree: seedTree };
      return found;
    });
    mockTaskRepo.find.mockImplementation(async (opts) => {
      if (opts?.where?.assigned_to !== undefined)
        return taskStore.filter((t) => t.assigned_to === opts.where.assigned_to);
      return [...taskStore];
    });
    mockTreeRepo.findOne.mockImplementation(async (opts) =>
      opts?.where?.id === 1 ? seedTree : null,
    );
    mockUserRepo.findOne.mockImplementation(async (opts) => {
      if (opts?.where?.id === 10 || opts?.where?.username === 'staff_e2e') return seedStaff;
      if (opts?.where?.id === 1 || opts?.where?.username === 'admin_e2e') return seedAdmin;
      return null;
    });
    mockUserRepo.update.mockResolvedValue({ affected: 1 });
    mockAuditRepo.create.mockImplementation((dto) => ({ ...dto, created_at: new Date() }));
    mockAuditRepo.save.mockImplementation(async (log) => { auditStore.push(log); return log; });
    mockAuditRepo.find.mockImplementation(async () => [...auditStore].reverse());
  });

  // =========================================================================
  // Flow 1: Successful task completion (within 10 m)
  // =========================================================================
  describe('Flow 1: Successful task completion', () => {
    it('staff can get their assigned tasks', async () => {
      const res = await request(app.getHttpServer())
        .get('/maintenance/tasks/my-tasks')
        .set('Authorization', Bearer )
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0].assigned_to).toBe(seedStaff.id);
    });

    it('staff can complete a task when within 10 m of the tree', async () => {
      const res = await request(app.getHttpServer())
        .post(/maintenance/tasks//complete)
        .set('Authorization', Bearer )
        .send({
          latitude: GPS_WITHIN.latitude,
          longitude: GPS_WITHIN.longitude,
          notes: 'Completed during e2e test',
        })
        .expect(200);

      expect(res.body.status).toBe(TaskStatus.COMPLETED);
      expect(res.body.completed_at).toBeDefined();

      // Verify task status updated in the in-memory store
      const updatedTask = taskStore.find((t) => t.id === seedTask.id);
      expect(updatedTask?.status).toBe(TaskStatus.COMPLETED);
    });

    it('full mobile workflow: login → get tasks → complete with GPS', async () => {
      // Step 1: Login
      // (We already have a token from beforeAll — simulate by verifying it works)
      const myTasksRes = await request(app.getHttpServer())
        .get('/maintenance/tasks/my-tasks')
        .set('Authorization', Bearer )
        .expect(200);

      expect(myTasksRes.body.length).toBeGreaterThanOrEqual(1);
      const taskId = myTasksRes.body[0].id;

      // Step 2: Update status to In_Progress
      await request(app.getHttpServer())
        .patch(/maintenance/tasks//status)
        .set('Authorization', Bearer )
        .send({ status: TaskStatus.IN_PROGRESS })
        .expect(200);

      const inProgressTask = taskStore.find((t) => t.id === taskId);
      expect(inProgressTask?.status).toBe(TaskStatus.IN_PROGRESS);

      // Step 3: Complete with GPS
      const completeRes = await request(app.getHttpServer())
        .post(/maintenance/tasks//complete)
        .set('Authorization', Bearer )
        .send({
          latitude: GPS_WITHIN.latitude,
          longitude: GPS_WITHIN.longitude,
          evidence_image_url: 'https://storage.example.com/evidence/e2e-test.jpg',
          notes: 'Full workflow test',
        })
        .expect(200);

      expect(completeRes.body.status).toBe(TaskStatus.COMPLETED);
      expect(completeRes.body.evidence_image_url).toBe(
        'https://storage.example.com/evidence/e2e-test.jpg',
      );

      // Verify final state in store
      const completedTask = taskStore.find((t) => t.id === taskId);
      expect(completedTask?.status).toBe(TaskStatus.COMPLETED);
      expect(completedTask?.completed_at).toBeDefined();
    });
  });

  // =========================================================================
  // Flow 2: Geofencing failure (outside 10 m)
  // =========================================================================
  describe('Flow 2: Geofencing failure', () => {
    it('returns 403 when staff is outside 10 m of the tree', async () => {
      const res = await request(app.getHttpServer())
        .post(/maintenance/tasks//complete)
        .set('Authorization', Bearer )
        .send({
          latitude: GPS_OUTSIDE.latitude,
          longitude: GPS_OUTSIDE.longitude,
          notes: 'Outside geofence',
        })
        .expect(403);

      expect(res.body.message).toContain('meters of the tree');
    });

    it('task status remains unchanged after geofence failure', async () => {
      await request(app.getHttpServer())
        .post(/maintenance/tasks//complete)
        .set('Authorization', Bearer )
        .send({ latitude: GPS_OUTSIDE.latitude, longitude: GPS_OUTSIDE.longitude });

      const task = taskStore.find((t) => t.id === seedTask.id);
      expect(task?.status).toBe(TaskStatus.PENDING);
    });

    it('returns 401 when no token is provided', async () => {
      await request(app.getHttpServer())
        .post(/maintenance/tasks//complete)
        .send({ latitude: GPS_WITHIN.latitude, longitude: GPS_WITHIN.longitude })
        .expect(401);
    });
  });

  // =========================================================================
  // Flow 3: Image upload (evidence_image_url)
  // =========================================================================
  describe('Flow 3: Evidence image URL saved on completion', () => {
    it('saves evidence_image_url when provided on task completion', async () => {
      const imageUrl = 'https://storage.example.com/evidence/photo-001.jpg';

      const res = await request(app.getHttpServer())
        .post(/maintenance/tasks//complete)
        .set('Authorization', Bearer )
        .send({
          latitude: GPS_WITHIN.latitude,
          longitude: GPS_WITHIN.longitude,
          evidence_image_url: imageUrl,
          notes: 'Photo taken',
        })
        .expect(200);

      expect(res.body.evidence_image_url).toBe(imageUrl);

      // Verify persisted in store
      const task = taskStore.find((t) => t.id === seedTask.id);
      expect(task?.evidence_image_url).toBe(imageUrl);
    });

    it('completes successfully without an image URL', async () => {
      const res = await request(app.getHttpServer())
        .post(/maintenance/tasks//complete)
        .set('Authorization', Bearer )
        .send({ latitude: GPS_WITHIN.latitude, longitude: GPS_WITHIN.longitude })
        .expect(200);

      expect(res.body.status).toBe(TaskStatus.COMPLETED);
    });
  });

  // =========================================================================
  // Flow 4: RBAC — role-based task visibility
  // =========================================================================
  describe('Flow 4: RBAC — role-based task visibility', () => {
    beforeEach(() => {
      // Add a second task assigned to a different user (id=99)
      taskStore.push({
        id: 101,
        tree_id: 1,
        assigned_to: 99,
        task_type: TaskType.WATERING,
        status: TaskStatus.PENDING,
        scheduled_date: new Date('2026-12-02'),
        tree: seedTree as Tree,
      });
    });

    it('staff GET /maintenance/tasks/my-tasks returns only their own tasks', async () => {
      const res = await request(app.getHttpServer())
        .get('/maintenance/tasks/my-tasks')
        .set('Authorization', Bearer )
        .expect(200);

      // All returned tasks must be assigned to the staff user
      for (const task of res.body) {
        expect(task.assigned_to).toBe(seedStaff.id);
      }
    });

    it('admin GET /maintenance/tasks returns all tasks', async () => {
      const res = await request(app.getHttpServer())
        .get('/maintenance/tasks')
        .set('Authorization', Bearer )
        .expect(200);

      // Admin sees all tasks (both staff and other user)
      expect(res.body.length).toBeGreaterThanOrEqual(2);
    });

    it('returns 403 when staff tries to complete a task not assigned to them', async () => {
      await request(app.getHttpServer())
        .post('/maintenance/tasks/101/complete')
        .set('Authorization', Bearer )
        .send({ latitude: GPS_WITHIN.latitude, longitude: GPS_WITHIN.longitude })
        .expect(403);
    });
  });

  // =========================================================================
  // Security: no sensitive data in audit logs
  // =========================================================================
  describe('Security: audit logs contain no sensitive data', () => {
    it('audit logs do not contain password or token fields', async () => {
      await request(app.getHttpServer())
        .post(/maintenance/tasks//complete)
        .set('Authorization', Bearer )
        .send({ latitude: GPS_WITHIN.latitude, longitude: GPS_WITHIN.longitude });

      for (const log of auditStore) {
        const logStr = JSON.stringify(log);
        expect(logStr).not.toContain('"password"');
        expect(logStr).not.toContain('"access_token"');
      }
    });
  });
});
