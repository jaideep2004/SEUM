import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  getDaysUntilExpiry,
  getExpiryStatus,
  ExpiryBadge,
  ExpiryBanner,
} from "../fleet/ExpiryBadge";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("getDaysUntilExpiry", () => {
  it("returns positive days for a future date", () => {
    vi.setSystemTime(new Date("2025-06-01"));
    const result = getDaysUntilExpiry("2025-07-01");
    expect(result).toBe(30);
  });

  it("returns negative days for a past date", () => {
    vi.setSystemTime(new Date("2025-07-01"));
    const result = getDaysUntilExpiry("2025-06-15");
    expect(result).toBeLessThan(0);
  });

  it("returns 0 for today", () => {
    vi.setSystemTime(new Date("2025-06-15T00:00:00"));
    const result = getDaysUntilExpiry("2025-06-15");
    expect(result).toBe(0);
  });
});

describe("getExpiryStatus", () => {
  it("returns no-expiry state when daysLeft is null", () => {
    const status = getExpiryStatus(null);
    expect(status.label).toBe("No expiry");
  });

  it("returns expired for 0 or negative days", () => {
    const status = getExpiryStatus(0);
    expect(status.label).toBe("Expired");

    const status2 = getExpiryStatus(-5);
    expect(status2.label).toBe("Expired");
  });

  it("returns critical (red) for ≤7 days", () => {
    const status = getExpiryStatus(7);
    expect(status.label).toBe("7 days");
    expect(status.color).toBe("#ef4444");
  });

  it("returns danger (orange) for ≤14 days", () => {
    const status = getExpiryStatus(10);
    expect(status.label).toBe("10 days");
    expect(status.color).toBe("#f97316");
  });

  it("returns warning (yellow) for ≤30 days", () => {
    const status = getExpiryStatus(25);
    expect(status.label).toBe("25 days");
    expect(status.color).toBe("#f59e0b");
  });

  it("returns healthy (green) for >30 days", () => {
    const status = getExpiryStatus(60);
    expect(status.label).toBe("60 days");
    expect(status.color).toBe("#10b981");
  });

  it("uses custom thresholds", () => {
    const thresholds = { warning: 60, danger: 30, critical: 15 };
    const status = getExpiryStatus(25, thresholds);
    expect(status.color).toBe("#f97316");
  });

  it("respects custom warning threshold", () => {
    const thresholds = { warning: 60, danger: 30, critical: 15 };
    const status = getExpiryStatus(40, thresholds);
    expect(status.color).toBe("#f59e0b");
  });
});

describe("ExpiryBadge", () => {
  it("renders no-expiry text when no date given", () => {
    render(<ExpiryBadge expiryDate={null} />);
    expect(screen.getByText("No expiry")).toBeDefined();
  });

  it("renders days remaining for a future date", () => {
    vi.setSystemTime(new Date("2025-06-01"));
    render(<ExpiryBadge expiryDate="2025-06-20" />);
    expect(screen.getByText("19 days")).toBeDefined();
  });

  it("renders expired for past date", () => {
    vi.setSystemTime(new Date("2025-07-01"));
    render(<ExpiryBadge expiryDate="2025-06-01" />);
    expect(screen.getByText("Expired")).toBeDefined();
  });

  it('uses singular "day" for 1 day', () => {
    vi.setSystemTime(new Date("2025-06-14"));
    render(<ExpiryBadge expiryDate="2025-06-15" />);
    expect(screen.getByText("1 day")).toBeDefined();
  });
});

describe("ExpiryBanner", () => {
  it("renders nothing when counts are zero", () => {
    const { container } = render(<ExpiryBanner expiredCount={0} expiringCount={0} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders expired warning when >0 expired", () => {
    render(<ExpiryBanner expiredCount={2} expiringCount={1} />);
    expect(screen.getByText(/2 documents expired/)).toBeDefined();
  });

  it("renders expiring warning with singular/plural", () => {
    render(<ExpiryBanner expiredCount={0} expiringCount={1} />);
    expect(screen.getByText(/1 document expiring/)).toBeDefined();
  });
});
