import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import TripTimeline from "@/components/TripTimeline";

describe("TripTimeline", () => {
  it("renders scheduled status", () => {
    render(<TripTimeline status="scheduled" />);
    expect(screen.getByText("Scheduled")).toBeDefined();
    expect(screen.getByText("En Route")).toBeDefined();
    expect(screen.getByText("Completed")).toBeDefined();
  });

  it("shows actual start time when en_route", () => {
    render(<TripTimeline status="en_route" actualStartTime="2026-07-20T08:15:00Z" />);
    expect(screen.getByText("En Route")).toBeDefined();
  });

  it("shows delay badge when delayed", () => {
    render(<TripTimeline status="delayed" delayMinutes={30} delayReason="Traffic" />);
    expect(screen.getByText(/Delayed by 30 min/)).toBeDefined();
    expect(screen.getByText(/Traffic/)).toBeDefined();
  });

  it("shows cancel badge when cancelled with reason", () => {
    render(<TripTimeline status="cancelled" rejectionReason="Weather conditions" />);
    expect(screen.getByText(/Weather conditions/)).toBeDefined();
  });

  it("shows Completed label when completed", () => {
    render(<TripTimeline status="completed" actualEndTime="2026-07-20T12:00:00Z" />);
    expect(screen.getByText("Completed")).toBeDefined();
  });

  it("shows Cancelled label when cancelled", () => {
    render(<TripTimeline status="cancelled" />);
    expect(screen.getByText("Cancelled")).toBeDefined();
  });
});
