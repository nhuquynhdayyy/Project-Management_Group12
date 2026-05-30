import { describe, expect, it, vi, beforeEach } from 'vitest';
import apiClient from './client';
import { fetchActivityLogs } from './activityLogs';

vi.mock('./client', () => ({
  default: {
    get: vi.fn(),
  },
}));

describe('fetchActivityLogs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should request paginated activity logs with filters', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        data: [],
        meta: { total: 0, page: 2, limit: 25, totalPages: 0 },
      },
    });

    await fetchActivityLogs({
      page: 2,
      limit: 25,
      search: 'tree',
      userId: 1,
      action: 'UPDATE',
      entityType: 'tree',
      from: '2026-05-01',
      to: '2026-05-31',
    });

    expect(apiClient.get).toHaveBeenCalledWith('/audit-logs/activity', {
      params: {
        page: 2,
        limit: 25,
        search: 'tree',
        user_id: 1,
        action: 'UPDATE',
        entity_type: 'tree',
        from: '2026-05-01',
        to: '2026-05-31',
      },
    });
  });
});
