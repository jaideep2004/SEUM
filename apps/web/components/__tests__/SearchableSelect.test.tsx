import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SearchableSelect from "../SearchableSelect";

const OPTIONS = [
  { value: "Jeddah", label: "Jeddah" },
  { value: "Makkah", label: "Makkah" },
  { value: "Madinah", label: "Madinah" },
];

describe("SearchableSelect", () => {
  it("shows the matched label for the current value", () => {
    render(<SearchableSelect value="Makkah" onChange={() => {}} options={OPTIONS} placeholder="From" />);
    expect((screen.getByPlaceholderText("From") as HTMLInputElement).value).toBe("Makkah");
  });

  it("filters options as the user types", async () => {
    render(<SearchableSelect value="" onChange={() => {}} options={OPTIONS} placeholder="From" />);
    const input = screen.getByPlaceholderText("From");
    await userEvent.click(input);
    await userEvent.type(input, "jed");
    expect(screen.getByRole("button", { name: "Jeddah" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Makkah" })).toBeNull();
  });

  it("calls onChange with the option value on pick", async () => {
    const onChange = vi.fn();
    render(<SearchableSelect value="" onChange={onChange} options={OPTIONS} placeholder="From" />);
    await userEvent.click(screen.getByPlaceholderText("From"));
    await userEvent.click(screen.getByRole("button", { name: "Madinah" }));
    expect(onChange).toHaveBeenCalledWith("Madinah");
  });

  it("shows raw value text when it matches no option", () => {
    render(<SearchableSelect value="Custom City" onChange={() => {}} options={OPTIONS} placeholder="From" />);
    expect((screen.getByPlaceholderText("From") as HTMLInputElement).value).toBe("Custom City");
  });
});
