import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DriverAssignModal from '../../components/DriverAssignModal';

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.setItem('seum_access_token', 'test-token');
});

afterEach(() => localStorage.clear());

const baseProps = {
  tripId: 'trip-1',
  onClose: vi.fn(),
  onAssigned: vi.fn(),
};

const mockDrivers = [
  { id: 'd1', name: 'Ahmed Khan', email: 'ahmed@test.com' },
  { id: 'd2', name: 'Khalid Hassan', email: 'khalid@test.com' },
];

describe('DriverAssignModal', () => {
  it('renders and fetches available drivers', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockDrivers }),
    });

    render(<DriverAssignModal {...baseProps} />);
    expect(screen.getByText('Assign Driver')).toBeTruthy();
    expect(screen.getByText('Loading available drivers...')).toBeTruthy();

    await waitFor(() => expect(screen.getByText('Ahmed Khan')).toBeTruthy());
    expect(screen.getByText('Khalid Hassan')).toBeTruthy();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/operations/drivers/available'),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
      })
    );
  });

  it('shows current driver info when provided', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockDrivers }),
    });

    render(
      <DriverAssignModal
        {...baseProps}
        currentDriverId="d1"
        currentDriverName="Ahmed Khan"
        currentConfirmationStatus="accepted"
      />
    );

    await waitFor(() => expect(screen.getByText(/Ahmed Khan/)).toBeTruthy());
    expect(screen.getByText('accepted')).toBeTruthy();
    expect(screen.getByText('Remove')).toBeTruthy();
  });

  it('calls onClose when overlay is clicked', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockDrivers }),
    });

    const { container } = render(<DriverAssignModal {...baseProps} />);
    await waitFor(() => expect(screen.getByText('Ahmed Khan')).toBeTruthy());

    await userEvent.click(container.firstChild!);
    expect(baseProps.onClose).toHaveBeenCalled();
  });

  it('shows empty state when no drivers', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: [] }),
    });

    render(<DriverAssignModal {...baseProps} />);
    await waitFor(() => expect(screen.getByText('No available drivers')).toBeTruthy());
  });

  it('filters drivers by search', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockDrivers }),
    });

    render(<DriverAssignModal {...baseProps} />);
    await waitFor(() => expect(screen.getByText('Ahmed Khan')).toBeTruthy());

    const searchInput = screen.getByPlaceholderText('Search drivers...');
    await userEvent.type(searchInput, 'Khalid');
    expect(screen.queryByText('Ahmed Khan')).toBeFalsy();
    expect(screen.getByText('Khalid Hassan')).toBeTruthy();
  });

  it('calls assign API on assign button click', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockDrivers }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: {} }),
      });

    render(<DriverAssignModal {...baseProps} />);
    await waitFor(() => expect(screen.getByText('Ahmed Khan')).toBeTruthy());

    const assignBtns = screen.getAllByText('Assign');
    await userEvent.click(assignBtns[0]);

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
    expect(mockFetch).toHaveBeenLastCalledWith(
      expect.stringContaining('/operations/trips/trip-1/assign-driver'),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"driverId":"d1"'),
      })
    );
    await waitFor(() => expect(baseProps.onAssigned).toHaveBeenCalled());
  });
});
