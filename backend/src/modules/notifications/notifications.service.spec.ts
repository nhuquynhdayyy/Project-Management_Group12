import { BadRequestException } from '@nestjs/common';
import {
  NotificationAudience,
  NotificationSeverity,
} from '../../entities/notification.entity';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  const mockNotificationRepository = {
    create: jest.fn((data) => data),
    save: jest.fn(async (data) => ({ id: 10, ...data })),
  };

  const mockRecipientRepository = {
    save: jest.fn(async (data) => data),
    find: jest.fn(),
    count: jest.fn(),
    findOne: jest.fn(),
  };

  const mockUserRepository = {
    find: jest.fn(),
  };

  let service: NotificationsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NotificationsService(
      mockNotificationRepository as any,
      mockRecipientRepository as any,
      mockUserRepository as any,
    );
  });

  it('creates recipients for Staff users when creating an all-audience system notification', async () => {
    mockUserRepository.find.mockResolvedValue([
      { id: 1, username: 'staff', roles: [{ role_name: 'Staff' }], role: null },
      { id: 2, username: 'manager', roles: [{ role_name: 'Manager' }], role: null },
      { id: 3, username: 'admin', roles: [{ role_name: 'Admin' }], role: null },
    ]);

    const result = await service.create(
      {
        title: 'Thong bao he thong',
        content: 'Staff nhan thong bao tren mobile',
        audience: NotificationAudience.ALL,
        severity: NotificationSeverity.NORMAL,
      },
      99,
    );

    expect(mockUserRepository.find).toHaveBeenCalledWith({ relations: ['roles'] });
    expect(mockNotificationRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        audience: NotificationAudience.ALL,
        target_roles: ['Staff', 'Manager'],
        created_by: 99,
      }),
    );
    expect(mockRecipientRepository.save).toHaveBeenCalledWith([
      expect.objectContaining({ notification_id: 10, user_id: 1, read_at: null }),
      expect.objectContaining({ notification_id: 10, user_id: 2, read_at: null }),
    ]);
    expect(result.recipient_count).toBe(2);
  });

  it('matches Staff users from legacy user.role values', async () => {
    mockUserRepository.find.mockResolvedValue([
      { id: 4, username: 'legacy_staff', roles: [], role: 'staff' },
    ]);

    await service.create({
      title: 'Thong bao',
      content: 'Noi dung',
      audience: NotificationAudience.ROLES,
      severity: NotificationSeverity.NORMAL,
      roles: ['Staff'],
    });

    expect(mockRecipientRepository.save).toHaveBeenCalledWith([
      expect.objectContaining({ notification_id: 10, user_id: 4 }),
    ]);
  });

  it('requires at least one role for role-targeted notifications', async () => {
    await expect(
      service.create({
        title: 'Thong bao',
        content: 'Noi dung',
        audience: NotificationAudience.ROLES,
        severity: NotificationSeverity.NORMAL,
        roles: [],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
