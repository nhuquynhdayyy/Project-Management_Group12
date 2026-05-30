import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchActivityLogs } from '../api/activityLogs';
import ActivityLogsPage from './ActivityLogsPage';

vi.mock('../api/activityLogs', () => ({
  fetchActivityLogs: vi.fn(),
}));

const emptyResponse = {
  data: [],
  meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
};

describe('ActivityLogsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchActivityLogs).mockResolvedValue(emptyResponse);
  });

  it('should show entity type category tabs', async () => {
    render(<ActivityLogsPage />);

    expect(screen.getByRole('tab', { name: 'Tất cả' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Cây xanh' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Công việc' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Người dùng' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Đăng nhập' })).toBeInTheDocument();

    expect(screen.queryByRole('tab', { name: 'Đăng nhập hệ thống' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Thay đổi cây' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Bảo trì cây' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Quản lý người dùng' })).not.toBeInTheDocument();

    await waitFor(() => expect(fetchActivityLogs).toHaveBeenCalled());
  });

  it('should filter tabs by entityType instead of quickFilter', async () => {
    const user = userEvent.setup();
    render(<ActivityLogsPage />);

    await waitFor(() =>
      expect(fetchActivityLogs).toHaveBeenCalledWith(
        expect.objectContaining({ entityType: '', page: 1 }),
      ),
    );

    await user.click(screen.getByRole('tab', { name: 'Công việc' }));

    await waitFor(() =>
      expect(fetchActivityLogs).toHaveBeenLastCalledWith(
        expect.not.objectContaining({ quickFilter: expect.any(String) }),
      ),
    );
    expect(fetchActivityLogs).toHaveBeenLastCalledWith(
      expect.objectContaining({ entityType: 'task', page: 1 }),
    );
    expect(screen.getByRole('tab', { name: 'Công việc' })).toHaveAttribute('aria-selected', 'true');
  });
});
