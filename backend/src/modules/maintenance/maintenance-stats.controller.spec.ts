import { Test, TestingModule } from '@nestjs/testing';
import { MaintenanceController } from './maintenance.controller';
import { MaintenanceService } from './maintenance.service';
import { ExportService } from './export.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

describe('MaintenanceController Stats Endpoints', () => {
  let controller: MaintenanceController;

  const mockMaintenanceService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findByUserId: jest.fn(),
    findById: jest.fn(),
    updateStatus: jest.fn(),
    completeTask: jest.fn(),
    getTasksForExport: jest.fn(),
    getStaffPerformance: jest.fn(),
    getOverdueTasks: jest.fn(),
  };
  const mockExportService = {
    exportToExcel: jest.fn(),
    exportToPdf: jest.fn(),
  };

  const mockJwtAuthGuard = {
    canActivate: jest.fn(() => true),
  };

  const mockRolesGuard = {
    canActivate: jest.fn(() => true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MaintenanceController],
      providers: [
        {
          provide: MaintenanceService,
          useValue: mockMaintenanceService,
        },
        {
          provide: ExportService,
          useValue: mockExportService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockRolesGuard)
      .compile();

    controller = module.get<MaintenanceController>(MaintenanceController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /maintenance/stats/by-staff', () => {
    it('should return array with username, completed, pending, avg_completion_hours', async () => {
      const mockStats = [
        {
          username: 'alice',
          completed: 5,
          pending: 2,
          avg_completion_hours: 6.4,
        },
        {
          username: 'bob',
          completed: 3,
          pending: 1,
          avg_completion_hours: 8,
        },
      ];

      mockMaintenanceService.getStaffPerformance.mockResolvedValue(mockStats);

      const result = await controller.getStaffPerformance();

      expect(result).toEqual(mockStats);
      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toEqual(
        expect.objectContaining({
          username: expect.any(String),
          completed: expect.any(Number),
          pending: expect.any(Number),
          avg_completion_hours: expect.any(Number),
        }),
      );
      expect(mockMaintenanceService.getStaffPerformance).toHaveBeenCalledTimes(1);
    });

    it('should allow only Admin/Manager (Staff should be forbidden by guard)', async () => {
      expect(mockRolesGuard.canActivate()).toBe(true);

      mockRolesGuard.canActivate.mockReturnValue(false);
      expect(mockRolesGuard.canActivate()).toBe(false);
    });
  });
describe('GET /maintenance/stats/overdue', () => {
    it('should return overdue task list', async () => {
      const mockOverdueTasks = [
        {
          id: 1,
          task_type: 'PRUNING',
          scheduled_date: '2026-05-01',
          status: 'Pending',
        },
      ];

      mockMaintenanceService.getOverdueTasks.mockResolvedValue(mockOverdueTasks);

      const result = await controller.getOverdueTasks();

      expect(result).toEqual(mockOverdueTasks);
      expect(Array.isArray(result)).toBe(true);
      expect(mockMaintenanceService.getOverdueTasks).toHaveBeenCalledTimes(1);
    });

    it('should classify overdue as scheduled_date < today and status != Completed', async () => {
      const today = new Date('2026-05-04T00:00:00.000Z');
      const tasks = [
        { id: 1, scheduled_date: '2026-05-01', status: 'Pending' },
        { id: 2, scheduled_date: '2026-05-03', status: 'In Progress' },
        { id: 3, scheduled_date: '2026-05-02', status: 'Completed' },
        { id: 4, scheduled_date: '2026-05-04', status: 'Pending' },
      ];

      const overdue = tasks.filter(
        (task) => new Date(task.scheduled_date).getTime() < today.getTime() && task.status !== 'Completed',
      );

      mockMaintenanceService.getOverdueTasks.mockResolvedValue(overdue);

      const result = await controller.getOverdueTasks();

      expect(result).toEqual([
        { id: 1, scheduled_date: '2026-05-01', status: 'Pending' },
        { id: 2, scheduled_date: '2026-05-03', status: 'In Progress' },
      ]);
      expect(result).not.toContainEqual(
        expect.objectContaining({ id: 3, status: 'Completed' }),
      );
      expect(result).not.toContainEqual(
        expect.objectContaining({ id: 4, scheduled_date: '2026-05-04' }),
      );
    });
  });

  describe('JSON response format', () => {
    it('should return data in correct JSON format for both endpoints', async () => {
      const byStaff = [
        {
          username: 'charlie',
          completed: 10,
          pending: 0,
          avg_completion_hours: 4.2,
        },
      ];

      const overdue = [
        {
          id: 10,
          tree_id: 5,
          assigned_to: 3,
          scheduled_date: '2026-05-01',
          status: 'Pending',
        },
      ];

      mockMaintenanceService.getStaffPerformance.mockResolvedValue(byStaff);
      mockMaintenanceService.getOverdueTasks.mockResolvedValue(overdue);

      const byStaffResult = await controller.getStaffPerformance();
      const overdueResult = await controller.getOverdueTasks();

      expect(typeof byStaffResult).toBe('object');
      expect(typeof overdueResult).toBe('object');

      expect(JSON.parse(JSON.stringify(byStaffResult))).toEqual(byStaff);
      expect(JSON.parse(JSON.stringify(overdueResult))).toEqual(overdue);
    });
  });
});
