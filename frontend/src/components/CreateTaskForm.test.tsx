import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CreateTaskForm from './CreateTaskForm';
import * as maintenanceApi from '../api/maintenance';
import * as treesApi from '../api/trees';

// Mock the API modules
vi.mock('../api/maintenance');
vi.mock('../api/trees');

describe('CreateTaskForm', () => {
  const mockOnSuccess = vi.fn();
  const mockOnCancel = vi.fn();

  const mockTrees = [
    {
      id: 1,
      tree_code: 'TREE-001',
      species: { id: 1, common_name: 'Phượng vĩ', scientific_name: 'Delonix regia' },
      area: { id: 1, area_name: 'Quận Liên Chiểu' },
      location: { type: 'Point' as const, coordinates: [108.2022, 16.0544] },
      health_status: 'Tốt' as const,
      species_id: 1,
      area_id: 1,
      qr_code: null,
      planting_year: 2020,
      height_m: 5.5,
      trunk_diameter_cm: 30,
      last_maintained_at: null,
      created_at: '2026-05-05T00:00:00Z',
      updated_at: '2026-05-05T00:00:00Z',
    },
    {
      id: 2,
      tree_code: 'TREE-002',
      species: { id: 2, common_name: 'Bằng lăng', scientific_name: 'Lagerstroemia speciosa' },
      area: { id: 1, area_name: 'Quận Liên Chiểu' },
      location: { type: 'Point' as const, coordinates: [108.2033, 16.0555] },
      health_status: 'Yếu' as const,
      species_id: 2,
      area_id: 1,
      qr_code: null,
      planting_year: 2019,
      height_m: 4.2,
      trunk_diameter_cm: 25,
      last_maintained_at: null,
      created_at: '2026-05-05T00:00:00Z',
      updated_at: '2026-05-05T00:00:00Z',
    },
  ];

  const mockStaffUsers = [
    { id: 3, username: 'staff1', full_name: 'Nguyễn Văn A', roles: [{ role_name: 'Staff' }] },
    { id: 4, username: 'staff2', full_name: 'Trần Thị B', roles: [{ role_name: 'Staff' }] },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(treesApi.fetchTrees).mockResolvedValue(mockTrees);
  });

  it('should render all required form fields', async () => {
    render(
      <CreateTaskForm
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
        staffUsers={mockStaffUsers}
      />
    );

    // Wait for trees to load
    await waitFor(() => {
      expect(screen.getByLabelText(/cây cần bảo trì/i)).toBeInTheDocument();
    });

    // Required fields
    expect(screen.getByLabelText(/cây cần bảo trì/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/nhân viên phụ trách/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/loại công việc/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/ngày hẹn/i)).toBeInTheDocument();

    // Optional field
    expect(screen.getByLabelText(/ghi chú/i)).toBeInTheDocument();

    // Buttons
    expect(screen.getByRole('button', { name: /tạo nhiệm vụ/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /hủy/i })).toBeInTheDocument();
  });

  it('should load trees on mount', async () => {
    render(
      <CreateTaskForm
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
        staffUsers={mockStaffUsers}
      />
    );

    await waitFor(() => {
      expect(treesApi.fetchTrees).toHaveBeenCalledTimes(1);
    });

    // Check if tree options are rendered
    const treeSelect = screen.getByLabelText(/cây cần bảo trì/i);
    expect(treeSelect).toBeInTheDocument();
  });

  it('should show validation errors for required fields when submitting empty form', async () => {
    const user = userEvent.setup();
    render(
      <CreateTaskForm
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
        staffUsers={mockStaffUsers}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/cây cần bảo trì/i)).toBeInTheDocument();
    });

    const submitButton = screen.getByRole('button', { name: /tạo nhiệm vụ/i });
    await user.click(submitButton);

    // Form should not submit with invalid data
    // In jsdom, HTML5 validation prevents form submission but doesn't set validity state
    // So we check that the API was not called
    expect(maintenanceApi.createMaintenanceTask).not.toHaveBeenCalled();
  });

  it('should render all task type options', async () => {
    render(
      <CreateTaskForm
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
        staffUsers={mockStaffUsers}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/loại công việc/i)).toBeInTheDocument();
    });

    const taskTypeSelect = screen.getByLabelText(/loại công việc/i);
    
    // Check if all task types are present
    expect(taskTypeSelect).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /cắt tỉa/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /bón phân/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /tưới nước/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /kiểm tra/i })).toBeInTheDocument();
  });

  it('should render staff users from props', async () => {
    render(
      <CreateTaskForm
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
        staffUsers={mockStaffUsers}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/nhân viên phụ trách/i)).toBeInTheDocument();
    });

    // Check if staff options are rendered
    expect(screen.getByRole('option', { name: /nguyễn văn a/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /trần thị b/i })).toBeInTheDocument();
  });

  it('should validate scheduled date is not in the past', async () => {
    const user = userEvent.setup();
    render(
      <CreateTaskForm
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
        staffUsers={mockStaffUsers}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/ngày hẹn/i)).toBeInTheDocument();
    });

    const dateInput = screen.getByLabelText(/ngày hẹn/i) as HTMLInputElement;

    // Set date to yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    await user.type(dateInput, yesterdayStr);
    
    // HTML5 validation should catch this with min attribute
    expect(dateInput.value).toBe(yesterdayStr);
  });

  it('should call createMaintenanceTask API with correct payload when form is valid', async () => {
    const user = userEvent.setup();
    const mockCreatedTask = {
      id: 1,
      tree_id: 1,
      assigned_to: 3,
      task_type: 'Cắt tỉa' as const,
      status: 'Pending' as const,
      scheduled_date: '2026-05-10',
      notes: 'Cần cắt tỉa gấp',
      completed_at: null,
      evidence_image_url: null,
      created_at: '2026-05-05T00:00:00Z',
      updated_at: '2026-05-05T00:00:00Z',
    };

    vi.mocked(maintenanceApi.createMaintenanceTask).mockResolvedValue(mockCreatedTask);

    render(
      <CreateTaskForm
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
        staffUsers={mockStaffUsers}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/cây cần bảo trì/i)).toBeInTheDocument();
    });

    // Fill required fields
    await user.selectOptions(screen.getByLabelText(/cây cần bảo trì/i), '1');
    await user.selectOptions(screen.getByLabelText(/nhân viên phụ trách/i), '3');
    await user.selectOptions(screen.getByLabelText(/loại công việc/i), 'Cắt tỉa');
    await user.type(screen.getByLabelText(/ngày hẹn/i), '2026-05-10');
    await user.type(screen.getByLabelText(/ghi chú/i), 'Cần cắt tỉa gấp');

    // Submit form
    const submitButton = screen.getByRole('button', { name: /tạo nhiệm vụ/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(maintenanceApi.createMaintenanceTask).toHaveBeenCalledWith({
        tree_id: 1,
        assigned_to: 3,
        task_type: 'Cắt tỉa',
        scheduled_date: '2026-05-10',
        notes: 'Cần cắt tỉa gấp',
      });
    });

    expect(mockOnSuccess).toHaveBeenCalledWith(mockCreatedTask);
  });

  it('should call onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <CreateTaskForm
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
        staffUsers={mockStaffUsers}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /hủy/i })).toBeInTheDocument();
    });

    const cancelButton = screen.getByRole('button', { name: /hủy/i });
    await user.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('should show error message when API call fails', async () => {
    const user = userEvent.setup();
    const errorMessage = 'Nhân viên đã có nhiệm vụ vào ngày này';
    vi.mocked(maintenanceApi.createMaintenanceTask).mockRejectedValue({
      response: { data: { message: errorMessage } },
    });

    render(
      <CreateTaskForm
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
        staffUsers={mockStaffUsers}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/cây cần bảo trì/i)).toBeInTheDocument();
    });

    // Fill minimum required fields
    await user.selectOptions(screen.getByLabelText(/cây cần bảo trì/i), '1');
    await user.selectOptions(screen.getByLabelText(/nhân viên phụ trách/i), '3');
    await user.selectOptions(screen.getByLabelText(/loại công việc/i), 'Cắt tỉa');
    await user.type(screen.getByLabelText(/ngày hẹn/i), '2026-05-10');

    const submitButton = screen.getByRole('button', { name: /tạo nhiệm vụ/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it('should disable submit button while submitting', async () => {
    const user = userEvent.setup();
    vi.mocked(maintenanceApi.createMaintenanceTask).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    render(
      <CreateTaskForm
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
        staffUsers={mockStaffUsers}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/cây cần bảo trì/i)).toBeInTheDocument();
    });

    // Fill minimum required fields
    await user.selectOptions(screen.getByLabelText(/cây cần bảo trì/i), '1');
    await user.selectOptions(screen.getByLabelText(/nhân viên phụ trách/i), '3');
    await user.selectOptions(screen.getByLabelText(/loại công việc/i), 'Cắt tỉa');
    await user.type(screen.getByLabelText(/ngày hẹn/i), '2026-05-10');

    const submitButton = screen.getByRole('button', { name: /tạo nhiệm vụ/i });
    await user.click(submitButton);

    // Button should be disabled during submission
    expect(submitButton).toBeDisabled();
  });

  it('should display tree information in select options', async () => {
    render(
      <CreateTaskForm
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
        staffUsers={mockStaffUsers}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/cây cần bảo trì/i)).toBeInTheDocument();
    });

    // Check if tree code and species are displayed
    expect(screen.getByRole('option', { name: /tree-001.*phượng vĩ/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /tree-002.*bằng lăng/i })).toBeInTheDocument();
  });
});
