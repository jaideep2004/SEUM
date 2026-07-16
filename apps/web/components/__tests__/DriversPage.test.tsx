import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DriversPage from '../../app/dashboard/drivers/page';

const mockFetch = vi.fn();
global.fetch = mockFetch;
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.setItem('seum_access_token', 'test-token');
});

afterEach(() => localStorage.clear());

const mockDrivers = [
  { id: 'd1', name: 'Ahmed Khan', email: 'ahmed@test.com' },
  { id: 'd2', name: 'Khalid Hassan', email: 'khalid@test.com' },
];

const mockTrips = [
  {
    id: 't1', routeName: 'Makkah → Madinah', busPlate: 'ABC 123', status: 'scheduled',
    driverConfirmationStatus: 'accepted', scheduledDate: '2026-07-20',
    scheduledStartTime: '08:00:00', origin: 'Makkah', destination: 'Madinah', tripType: 'regular',
  },
  {
    id: 't2', routeName: 'Jeddah → Makkah', busPlate: 'DEF 456', status: 'en_route',
    driverConfirmationStatus: 'pending', scheduledDate: '2026-07-21',
    scheduledStartTime: '14:30:00', origin: 'Jeddah', destination: 'Makkah', tripType: 'shuttle',
  },
];

describe('DriversPage', () => {
  it('renders page title and fetches drivers', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockDrivers }),
    });

    render(<DriversPage />);
    expect(screen.getByText('Driver Schedule')).toBeTruthy();

    await waitFor(() => expect(screen.getByText('Ahmed Khan')).toBeTruthy());
    expect(screen.getByText('Khalid Hassan')).toBeTruthy();
  });

  it('shows empty state when no drivers selected', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockDrivers }),
    });

    render(<DriversPage />);
    await waitFor(() => expect(screen.getByText('Ahmed Khan')).toBeTruthy());
    expect(screen.getByText('Select a driver to view their schedule')).toBeTruthy();
  });

  it('loads schedule when driver is selected', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockDrivers }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockTrips }),
      });

    render(<DriversPage />);
    await waitFor(() => expect(screen.getByText('Ahmed Khan')).toBeTruthy());

    await userEvent.click(screen.getByText('Ahmed Khan'));

    await waitFor(() => expect(screen.getByText('Makkah → Madinah')).toBeTruthy());
    expect(screen.getByText('Jeddah → Makkah')).toBeTruthy();
    expect(screen.getByText('accepted')).toBeTruthy();
  });

  it('filters drivers by search', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockDrivers }),
    });

    render(<DriversPage />);
    await waitFor(() => expect(screen.getByText('Ahmed Khan')).toBeTruthy());

    const searchInput = screen.getByPlaceholderText('Search drivers...');
    await userEvent.type(searchInput, 'Khalid');
    expect(screen.queryByText('Ahmed Khan')).toBeFalsy();
    expect(screen.getByText('Khalid Hassan')).toBeTruthy();
  });

  it('shows empty state when no trips', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockDrivers }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      });

    render(<DriversPage />);
    await waitFor(() => expect(screen.getByText('Ahmed Khan')).toBeTruthy());

    await userEvent.click(screen.getByText('Ahmed Khan'));
    await waitFor(() => expect(screen.getByText('No trips scheduled for this week')).toBeTruthy());
  });
});
