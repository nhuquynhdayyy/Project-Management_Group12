import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ActivityLogsPage from './ActivityLogsPage';
import { fetchActivityLogs } from '../api/activityLogs';

vi.mock('../api/activityLogs', () => ({
  fetchActivityLogs: vi.fn(),
}));

describe('ActivityLogsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchActivityLogs).mockResolvedValue({
      data: [
        {
          id: 1,
          created_at: '2026-05-30T01:00:00.000Z',
          user_id: 1,
          user: { id: 1, username: 'admin' },
          action: 'UPDATE',
          entity_type: 'tree',
          entity_id: 10,
          old_value: { health_status: 'Tốt' },
          new_value: { health_status: 'Yếu' },
        },
      ],
      meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
    });
  });

  it('should render activity logs in a table', async () => {
    render(<ActivityLogsPage />);

    expect(await screen.findByRole('heading', { name: /Nhật ký hoạt động/i })).toBeVisible();
    expect(await screen.findByText('admin')).toBeVisible();
    expect(await screen.findByText(/08:00:00/)).toBeVisible();
    expect(screen.getAllByText('UPDATE').length).toBeGreaterThan(0);
    expect(screen.getAllByText('tree').length).toBeGreaterThan(0);
  });

  it('should search and filter logs', async () => {
    render(<ActivityLogsPage />);

    await userEvent.type(screen.getByLabelText(/Tìm kiếm/i), 'TREE-001');
    await userEvent.selectOptions(screen.getByLabelText(/Action/i), 'UPDATE');
    await userEvent.selectOptions(screen.getByLabelText(/Entity Type/i), 'tree');

    await waitFor(() => {
      expect(fetchActivityLogs).toHaveBeenLastCalledWith(
        expect.objectContaining({
          search: 'TREE-001',
          action: 'UPDATE',
          entityType: 'tree',
        }),
      );
    });
  });
});
