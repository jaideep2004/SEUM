import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SeatMap from "../SeatMap";

describe("SeatMap", () => {
  it("renders all seats with capacity and marks occupied ones", () => {
    const onToggle = vi.fn();
    render(<SeatMap capacity={5} occupied={[2]} selected={[]} maxSelectable={5} onToggle={onToggle} />);
    expect(screen.getByRole("button", { name: "Seat 1 available" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Seat 2 occupied" })).toBeTruthy();
    expect((screen.getByRole("button", { name: "Seat 2 occupied" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Seat 1 available" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("marks selected seats with aria-pressed", () => {
    const onToggle = vi.fn();
    render(<SeatMap capacity={5} occupied={[]} selected={[3]} maxSelectable={5} onToggle={onToggle} />);
    expect((screen.getByRole("button", { name: "Seat 3 selected" }) as HTMLButtonElement).getAttribute("aria-pressed")).toBe("true");
  });

  it("calls onToggle when an available seat is clicked", async () => {
    const onToggle = vi.fn();
    render(<SeatMap capacity={5} occupied={[]} selected={[]} maxSelectable={5} onToggle={onToggle} />);
    await userEvent.click(screen.getByRole("button", { name: "Seat 4 available" }));
    expect(onToggle).toHaveBeenCalledWith(4);
  });

  it("disables available seats when max selection reached", () => {
    const onToggle = vi.fn();
    render(<SeatMap capacity={5} occupied={[]} selected={[1, 2]} maxSelectable={2} onToggle={onToggle} />);
    expect((screen.getByRole("button", { name: "Seat 3 available" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Seat 1 selected" }) as HTMLButtonElement).disabled).toBe(false);
  });
});
