import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { SeederService } from '../src/database/seeder/seeder.service';

jest.setTimeout(60000);

describe('Maintenance Module (e2e)', () => {
  let app: INestApplication;
  let seederService: SeederService;
  let adminToken: string;
  let staffToken: string;
  let staffUserId: number;

  const PENDING_STATUS = 'Pending';
  const NEAR_DELTA = 0.00005;
  const FAR_DELTA = 0.001;

  const parseTreeLocation = (task: any) => {
    const location = task?.tree?.location;
    if (!location) return null;
    if (typeof location === 'string') {
      const match = location.match(/POINT\(([-\d.]+)\s+([\d.-]+)\)/);
      if (!match) return null;
      return {
        longitude: parseFloat(match[1]),
        latitude: parseFloat(match[2]),
      };
    }
    return {
      longitude: location.coordinates[0],
      latitude: location.coordinates[1],
    };
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();

    seederService = moduleFixture.get(SeederService);
    await seederService.seed();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeAll(async () => {
    const staffLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'staff', password: 'Test@123' })
      .expect(200);

    staffToken = staffLogin.body.access_token;
    staffUserId = staffLogin.body.id;

    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'admin', password: 'Test@123' })
      .expect(200);

    adminToken = adminLogin.body.access_token;
  });

  describe('RBAC: Staff vs Admin task access', () => {
    it('should return only tasks assigned to staff user', async () => {
      const res = await request(app.getHttpServer())
        .get('/maintenance/tasks/my-tasks')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      for (const task of res.body) {
        expect(task.assigned_to).toBe(staffUserId);
      }
    });

    it('should return all tasks for admin user', async () => {
      const res = await request(app.getHttpServer())
        .get('/maintenance/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      const staffTasks = res.body.filter(
        (task: any) => task.assigned_to === staffUserId,
      );
      expect(staffTasks.length).toBeGreaterThan(0);
    });
  });

  describe('Successful task completion within geofence', () => {
    let taskId: number;
    let taskLocation: { latitude: number; longitude: number };

    beforeAll(async () => {
      const myTasks = await request(app.getHttpServer())
        .get('/maintenance/tasks/my-tasks')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      const pendingTask = myTasks.body.find(
        (task: any) => task.status === PENDING_STATUS,
      );
      expect(pendingTask).toBeDefined();
      taskId = pendingTask.id;

      const location = parseTreeLocation(pendingTask);
      expect(location).toBeDefined();
      taskLocation = location;
    });

    it('should complete task successfully with GPS within 10m', async () => {
      const res = await request(app.getHttpServer())
        .post(`/maintenance/tasks/${taskId}/complete`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          latitude: taskLocation.latitude + NEAR_DELTA,
          longitude: taskLocation.longitude,
          notes: 'Task completed successfully within geofence',
        })
        .expect(201);

      expect(res.body.status).toBe('Completed');
      expect(res.body.completed_at).toBeDefined();
    });

    it('should persist completed status in database', async () => {
      const taskRes = await request(app.getHttpServer())
        .get(`/maintenance/tasks/${taskId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(taskRes.body.status).toBe('Completed');
      expect(taskRes.body.completed_at).toBeDefined();
    });
  });

  describe('Geofencing failure', () => {
    let taskId: number;
    let taskLocation: { latitude: number; longitude: number };

    beforeAll(async () => {
      const myTasks = await request(app.getHttpServer())
        .get('/maintenance/tasks/my-tasks')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      const pendingTask = myTasks.body.find(
        (task: any) => task.status === PENDING_STATUS,
      );
      expect(pendingTask).toBeDefined();
      taskId = pendingTask.id;

      const location = parseTreeLocation(pendingTask);
      expect(location).toBeDefined();
      taskLocation = location;
    });

    it('should reject completion when GPS is outside 10m', async () => {
      await request(app.getHttpServer())
        .post(`/maintenance/tasks/${taskId}/complete`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          latitude: taskLocation.latitude + FAR_DELTA,
          longitude: taskLocation.longitude,
          notes: 'Attempting completion outside geofence',
        })
        .expect(403);
    });
  });

  describe('Image upload (multipart)', () => {
    let taskId: number;
    let taskLocation: { latitude: number; longitude: number };

    beforeAll(async () => {
      const myTasks = await request(app.getHttpServer())
        .get('/maintenance/tasks/my-tasks')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      const pendingTask = myTasks.body.find(
        (task: any) => task.status === PENDING_STATUS,
      );
      expect(pendingTask).toBeDefined();
      taskId = pendingTask.id;

      const location = parseTreeLocation(pendingTask);
      expect(location).toBeDefined();
      taskLocation = location;
    });

    it('should accept multipart image upload and persist evidence URL', async () => {
      const res = await request(app.getHttpServer())
        .post(`/maintenance/tasks/${taskId}/complete`)
        .set('Authorization', `Bearer ${staffToken}`)
        .field('latitude', taskLocation.latitude + NEAR_DELTA)
        .field('longitude', taskLocation.longitude)
        .field('notes', 'Completed with multipart image upload')
        .attach(
          'evidence_image',
          Buffer.from('fake-image-bytes'),
          'task-image.jpg',
        )
        .expect(201);

      expect(res.body.status).toBe('Completed');
      expect(typeof res.body.evidence_image_url).toBe('string');
      expect(res.body.evidence_image_url).toContain('/evidence/');
      expect(res.body.evidence_image_url).toMatch(/\.jpg$/);
    });
  });
});
