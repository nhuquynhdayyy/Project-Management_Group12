import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { SeederService } from '../src/database/seeder/seeder.service';

jest.setTimeout(60000);

describe('Audit Log System (e2e)', () => {
  let app: INestApplication;
  let seederService: SeederService;
  let adminToken: string;
  let staffToken: string;

  // Tree location: Da Nang City Hall area
  const TREE_LAT = 16.0544;
  const TREE_LNG = 108.2022;
  const GPS_WITHIN = { latitude: 16.05444, longitude: 108.2022 };  // ~4 m north
  const GPS_OUTSIDE = { latitude: 16.0549, longitude: 108.2022 };  // ~55 m north
  const PENDING_STATUS = 'Pending';
  const NEAR_DELTA = 0.00005;
  const FAR_DELTA = 0.001;

  const parseTreeLocation = (task: any) => {
    const location = task?.tree?.location;
    if (!location) return null;
    if (typeof location === 'string') {
      const match = location.match(/POINT\(([-\d.]+)\s+([-\d.]+)\)/);
      if (!match) return null;
      return { longitude: parseFloat(match[1]), latitude: parseFloat(match[2]) };
    }
    return { longitude: location.coordinates[0], latitude: location.coordinates[1] };
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, transformOptions: { enableImplicitConversion: true } }));
    await app.init();

    seederService = moduleFixture.get(SeederService);

    // Seed test data
    await seederService.seed();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeAll(async () => {
    // Login as admin
    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'admin', password: 'Test@123' })
      .expect(200);

    adminToken = adminLogin.body.access_token;

    // Login as staff
    const staffLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'staff', password: 'Test@123' })
      .expect(200);

    staffToken = staffLogin.body.access_token;
  });

  // =========================================================================
  // 1. Login success -> audit log
  // =========================================================================
  describe('Auth: login success', () => {
    it('should create an audit log for successful login', async () => {
      // Login was already done in beforeAll, check audit logs
      const auditLogs = await request(app.getHttpServer())
        .get('/audit-logs?entity_type=auth')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(auditLogs.body)).toBe(true);
      expect(auditLogs.body.length).toBeGreaterThan(0);

      // Check that passwords are not stored
      for (const log of auditLogs.body) {
        const oldValue = log.old_value ? JSON.stringify(log.old_value) : '';
        const newValue = log.new_value ? JSON.stringify(log.new_value) : '';

        expect(oldValue).not.toContain('password');
        expect(newValue).not.toContain('password');
        expect(oldValue).not.toContain('token');
        expect(newValue).not.toContain('token');
      }
    });
  });

  // =========================================================================
  // 2. Tree creation -> audit log
  // =========================================================================
  describe('Trees: create tree', () => {
    it('should create a CREATE audit log when POST /trees', async () => {
      const treeCode = `AUDIT-TEST-${Date.now()}`;
      const res = await request(app.getHttpServer())
        .post('/trees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          tree_code: treeCode,
          species_id: 1,
          area_id: 1,
          latitude: TREE_LAT,
          longitude: TREE_LNG,
        })
        .expect(201);

      // Check audit logs
      const auditLogs = await request(app.getHttpServer())
        .get('/audit-logs?entity_type=tree&entity_id=' + res.body.id)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(auditLogs.body.length).toBeGreaterThan(0);
      const createLog = auditLogs.body.find(log => log.action === 'CREATE');
      expect(createLog).toBeDefined();
      expect(createLog.entity_type).toBe('tree');
      expect(createLog.entity_id).toBe(res.body.id);
      expect(createLog.new_value.tree_code).toBe(treeCode);
      expect(createLog.old_value).toBeNull();
    });
  });

  // =========================================================================
  // 3. Task completion within geofence -> audit log
  // =========================================================================
  describe('Maintenance: complete task within geofence', () => {
    let taskId: number;
    let taskLocation: { latitude: number; longitude: number } | null;

    beforeAll(async () => {
      // Get a task assigned to staff
      const myTasks = await request(app.getHttpServer())
        .get('/maintenance/tasks/my-tasks')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      const pendingTask = myTasks.body.find((task: any) => task.status === PENDING_STATUS);
      if (pendingTask) {
        taskId = pendingTask.id;
        taskLocation = parseTreeLocation(pendingTask);
      }
    });

    it('should create UPDATE audit log on successful task completion', async () => {
      if (!taskId || !taskLocation) {
        console.warn('No pending task with valid location found, skipping audit log test');
        return;
      }

      await request(app.getHttpServer())
        .post(`/maintenance/tasks/${taskId}/complete`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          latitude: taskLocation.latitude + NEAR_DELTA,
          longitude: taskLocation.longitude,
          notes: 'Integration test completion',
        })
        .expect(201);

      // Check audit logs
      const auditLogs = await request(app.getHttpServer())
        .get('/audit-logs?entity_type=task&entity_id=' + taskId)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const updateLogs = auditLogs.body.filter((log: any) => log.action === 'UPDATE');
      expect(updateLogs.length).toBeGreaterThan(0);

      const completionLog = updateLogs.find((log: any) => log.new_value?.status === 'Completed');
      expect(completionLog).toBeDefined();
      expect(completionLog.new_value.gps).toBeDefined();
    });
  });

  // =========================================================================
  // 4. Task completion outside geofence -> audit log with error
  // =========================================================================
  describe('Maintenance: complete task outside geofence', () => {
    let taskId: number;
    let taskLocation: { latitude: number; longitude: number } | null;

    beforeAll(async () => {
      // Get another pending task
      const myTasks = await request(app.getHttpServer())
        .get('/maintenance/tasks/my-tasks')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      const pendingTask = myTasks.body.find((task: any) => task.status === PENDING_STATUS);
      if (pendingTask) {
        taskId = pendingTask.id;
        taskLocation = parseTreeLocation(pendingTask);
      }
    });

    it('should create UPDATE audit log with GEOFENCE_FAIL on geofence violation', async () => {
      if (!taskId || !taskLocation) {
        console.warn('No pending task with valid location found, skipping geofence audit test');
        return;
      }

      await request(app.getHttpServer())
        .post(`/maintenance/tasks/${taskId}/complete`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          latitude: taskLocation.latitude + FAR_DELTA,
          longitude: taskLocation.longitude,
          notes: 'Outside geofence test',
        })
        .expect(403);

      // Check audit logs
      const auditLogs = await request(app.getHttpServer())
        .get('/audit-logs?entity_type=task&entity_id=' + taskId)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const updateLogs = auditLogs.body.filter(log => log.action === 'UPDATE');
      const geofenceFailLog = updateLogs.find(log => log.new_value?.error === 'GEOFENCE_FAIL');
      expect(geofenceFailLog).toBeDefined();
      expect(geofenceFailLog.new_value.distance).toBeGreaterThan(10);
    });
  });

  // =========================================================================
  // 5. Admin API: GET /audit-logs
  // =========================================================================
  describe('Admin API: GET /audit-logs', () => {
    it('should return 401 when called without token', async () => {
      await request(app.getHttpServer())
        .get('/audit-logs')
        .expect(401);
    });

    it('should return 403 when called by non-admin user', async () => {
      await request(app.getHttpServer())
        .get('/audit-logs')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(403);
    });

    it('should return audit logs for admin user', async () => {
      const res = await request(app.getHttpServer())
        .get('/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should support filtering by entity_type', async () => {
      const res = await request(app.getHttpServer())
        .get('/audit-logs?entity_type=tree')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      for (const log of res.body) {
        expect(log.entity_type).toBe('tree');
      }
    });
  });

  // =========================================================================
  // 6. Security: no sensitive data in logs
  // =========================================================================
  describe('Security: sensitive data never stored', () => {
    it('should not store password, token, or sensitive data in any audit log', async () => {
      const allLogs = await request(app.getHttpServer())
        .get('/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const containsSensitiveKey = (obj: any): boolean => {
        if (!obj || typeof obj !== 'object') return false;
        const sensitive = ['password', 'token', 'access_token', 'refresh_token'];
        for (const key of Object.keys(obj)) {
          if (sensitive.includes(key)) return true;
          if (typeof obj[key] === 'object' && containsSensitiveKey(obj[key])) return true;
        }
        return false;
      };

      for (const log of allLogs.body) {
        expect(containsSensitiveKey(log.old_value)).toBe(false);
        expect(containsSensitiveKey(log.new_value)).toBe(false);
      }
    });
  });
});