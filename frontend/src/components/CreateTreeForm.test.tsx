import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CreateTreeForm from './CreateTreeForm';
import * as treesApi from '../api/trees';

// Mock the API module
vi.mock('../api/trees');

describe('CreateTreeForm', () => {
  const mockOnSuccess = vi.fn();
  const mockOnCancel = vi.fn();

  const mockSpecies = [
    { id: 1, common_name: 'Phượng vĩ', scientific_name: 'Delonix regia' },
    { id: 2, common_name: 'Bằng lăng', scientific_name: 'Lagerstroemia speciosa' },
  ];

  const mockAreas = [
    { id: 1, area_name: 'Quận Liên Chiểu' },
    { id: 2, area_name: 'Quận Hải Châu' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(treesApi.fetchTreeSpecies).mockResolvedValue(mockSpecies);
    vi.mocked(treesApi.fetchAdministrativeAreas).mockResolvedValue(mockAreas);
  });

  it('should render all required form fields', async () => {
    render(<CreateTreeForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    // Wait for species and areas to load
    await waitFor(() => {
      expect(screen.getByLabelText(/mã cây/i)).toBeInTheDocument();
    });

    // Required fields
    expect(screen.getByLabelText(/mã cây/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/loài cây/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/khu vực/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/vĩ độ/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/kinh độ/i)).toBeInTheDocument();

    // Optional fields
    expect(screen.getByLabelText(/năm trồng/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/chiều cao/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/đường kính thân/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/tình trạng sức khỏe/i)).toBeInTheDocument();

    // Buttons
    expect(screen.getByRole('button', { name: /tạo cây/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /hủy/i })).toBeInTheDocument();
  });

  it('should load species and areas on mount', async () => {
    render(<CreateTreeForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    await waitFor(() => {
      expect(treesApi.fetchTreeSpecies).toHaveBeenCalledTimes(1);
      expect(treesApi.fetchAdministrativeAreas).toHaveBeenCalledTimes(1);
    });

    // Check if species options are rendered
    const speciesSelect = screen.getByLabelText(/loài cây/i);
    expect(speciesSelect).toBeInTheDocument();
  });

  it('should show validation errors for required fields when submitting empty form', async () => {
    const user = userEvent.setup();
    render(<CreateTreeForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    await waitFor(() => {
      expect(screen.getByLabelText(/mã cây/i)).toBeInTheDocument();
    });

    const submitButton = screen.getByRole('button', { name: /tạo cây/i });
    await user.click(submitButton);

    // Should show validation errors (HTML5 validation or custom)
    const treeCodeInput = screen.getByLabelText(/mã cây/i) as HTMLInputElement;
    expect(treeCodeInput.validity.valid).toBe(false);
  });

  it('should validate latitude range (-90 to 90)', async () => {
    const user = userEvent.setup();
    render(<CreateTreeForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    await waitFor(() => {
      expect(screen.getByLabelText(/vĩ độ/i)).toBeInTheDocument();
    });

    const latitudeInput = screen.getByLabelText(/vĩ độ/i) as HTMLInputElement;

    // Test invalid value
    await user.clear(latitudeInput);
    await user.type(latitudeInput, '100');
    expect(parseFloat(latitudeInput.value)).toBeGreaterThan(90);

    // Test valid value
    await user.clear(latitudeInput);
    await user.type(latitudeInput, '16.0544');
    expect(parseFloat(latitudeInput.value)).toBeGreaterThanOrEqual(-90);
    expect(parseFloat(latitudeInput.value)).toBeLessThanOrEqual(90);
  });

  it('should validate longitude range (-180 to 180)', async () => {
    const user = userEvent.setup();
    render(<CreateTreeForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    await waitFor(() => {
      expect(screen.getByLabelText(/kinh độ/i)).toBeInTheDocument();
    });

    const longitudeInput = screen.getByLabelText(/kinh độ/i) as HTMLInputElement;

    // Test valid value
    await user.clear(longitudeInput);
    await user.type(longitudeInput, '108.2022');
    expect(parseFloat(longitudeInput.value)).toBeGreaterThanOrEqual(-180);
    expect(parseFloat(longitudeInput.value)).toBeLessThanOrEqual(180);
  });

  it('should call createTree API with correct payload when form is valid', async () => {
    const user = userEvent.setup();
    const mockCreatedTree = {
      id: 1,
      tree_code: 'TREE-001',
      species_id: 1,
      area_id: 1,
      location: { type: 'Point' as const, coordinates: [108.2022, 16.0544] },
      health_status: 'Tốt' as const,
      species: mockSpecies[0],
      area: mockAreas[0],
      qr_code: null,
      planting_year: 2020,
      height_m: 5.5,
      trunk_diameter_cm: 30,
      last_maintained_at: null,
      created_at: '2026-05-05T00:00:00Z',
      updated_at: '2026-05-05T00:00:00Z',
    };

    vi.mocked(treesApi.createTree).mockResolvedValue(mockCreatedTree);

    render(<CreateTreeForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    await waitFor(() => {
      expect(screen.getByLabelText(/mã cây/i)).toBeInTheDocument();
    });

    // Fill required fields
    await user.type(screen.getByLabelText(/mã cây/i), 'TREE-001');
    
    const speciesSelect = screen.getByLabelText(/loài cây/i);
    await user.selectOptions(speciesSelect, '1');

    const areaSelect = screen.getByLabelText(/khu vực/i);
    await user.selectOptions(areaSelect, '1');

    await user.type(screen.getByLabelText(/vĩ độ/i), '16.0544');
    await user.type(screen.getByLabelText(/kinh độ/i), '108.2022');

    // Fill optional fields
    await user.type(screen.getByLabelText(/năm trồng/i), '2020');
    await user.type(screen.getByLabelText(/chiều cao/i), '5.5');
    await user.type(screen.getByLabelText(/đường kính thân/i), '30');

    const healthSelect = screen.getByLabelText(/tình trạng sức khỏe/i);
    await user.selectOptions(healthSelect, 'Tốt');

    // Submit form
    const submitButton = screen.getByRole('button', { name: /tạo cây/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(treesApi.createTree).toHaveBeenCalledWith({
        tree_code: 'TREE-001',
        species_id: 1,
        area_id: 1,
        latitude: 16.0544,
        longitude: 108.2022,
        planting_year: 2020,
        height_m: 5.5,
        trunk_diameter_cm: 30,
        health_status: 'Tốt',
      });
    });

    expect(mockOnSuccess).toHaveBeenCalledWith(mockCreatedTree);
  });

  it('should call onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(<CreateTreeForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /hủy/i })).toBeInTheDocument();
    });

    const cancelButton = screen.getByRole('button', { name: /hủy/i });
    await user.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('should show error message when API call fails', async () => {
    const user = userEvent.setup();
    const errorMessage = 'Mã cây đã tồn tại';
    vi.mocked(treesApi.createTree).mockRejectedValue({
      response: { data: { message: errorMessage } },
    });

    render(<CreateTreeForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    await waitFor(() => {
      expect(screen.getByLabelText(/mã cây/i)).toBeInTheDocument();
    });

    // Fill minimum required fields
    await user.type(screen.getByLabelText(/mã cây/i), 'TREE-001');
    await user.selectOptions(screen.getByLabelText(/loài cây/i), '1');
    await user.selectOptions(screen.getByLabelText(/khu vực/i), '1');
    await user.type(screen.getByLabelText(/vĩ độ/i), '16.0544');
    await user.type(screen.getByLabelText(/kinh độ/i), '108.2022');

    const submitButton = screen.getByRole('button', { name: /tạo cây/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it('should disable submit button while submitting', async () => {
    const user = userEvent.setup();
    vi.mocked(treesApi.createTree).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    render(<CreateTreeForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    await waitFor(() => {
      expect(screen.getByLabelText(/mã cây/i)).toBeInTheDocument();
    });

    // Fill minimum required fields
    await user.type(screen.getByLabelText(/mã cây/i), 'TREE-001');
    await user.selectOptions(screen.getByLabelText(/loài cây/i), '1');
    await user.selectOptions(screen.getByLabelText(/khu vực/i), '1');
    await user.type(screen.getByLabelText(/vĩ độ/i), '16.0544');
    await user.type(screen.getByLabelText(/kinh độ/i), '108.2022');

    const submitButton = screen.getByRole('button', { name: /tạo cây/i });
    await user.click(submitButton);

    // Button should be disabled during submission
    expect(submitButton).toBeDisabled();
  });
});
