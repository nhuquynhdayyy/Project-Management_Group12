import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

describe('NotificationsController', () => {
  const mockNotificationsService = {
    create: jest.fn(),
    findMine: jest.fn(),
    countUnread: jest.fn(),
    markRead: jest.fn(),
  };

  let controller: NotificationsController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new NotificationsController(mockNotificationsService as any);
  });

  it('uses JWT sub when Staff mobile token does not include userId', async () => {
    mockNotificationsService.findMine.mockResolvedValue([]);

    await controller.findMine({ user: { sub: 7, username: 'staff' } });

    expect(mockNotificationsService.findMine).toHaveBeenCalledWith(7);
  });

  it('uses JWT sub when marking a Staff notification as read', async () => {
    mockNotificationsService.markRead.mockResolvedValue({ id: 1, read_at: new Date() });

    await controller.markRead('12', { user: { sub: 7, username: 'staff' } });

    expect(mockNotificationsService.markRead).toHaveBeenCalledWith(12, 7);
  });
});
