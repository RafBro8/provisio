import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SlotPicker } from "../SlotPicker";
import { ApiError } from "../../api/client";
import * as providersApi from "../../api/providers";

vi.mock("../../api/providers");

const mockedGetAvailability = vi.mocked(providersApi.getAvailability);

const SLOTS = [
  { startTime: "2026-08-10T09:00:00.000Z", endTime: "2026-08-10T09:30:00.000Z" },
  { startTime: "2026-08-10T09:30:00.000Z", endTime: "2026-08-10T10:00:00.000Z" },
];

describe("SlotPicker", () => {
  beforeEach(() => {
    mockedGetAvailability.mockReset();
  });

  it("shows a loading state, then renders the fetched slots", async () => {
    mockedGetAvailability.mockResolvedValue({ slots: SLOTS });

    render(
      <SlotPicker
        providerId="provider-1"
        serviceId="service-1"
        date="2026-08-10"
        selectedSlot={null}
        onSelectSlot={vi.fn()}
      />,
    );

    expect(screen.getByText(/loading times/i)).toBeInTheDocument();

    expect(await screen.findAllByRole("button")).toHaveLength(2);
    expect(mockedGetAvailability).toHaveBeenCalledWith("provider-1", "service-1", "2026-08-10");
  });

  it("shows an empty state when there are no open slots", async () => {
    mockedGetAvailability.mockResolvedValue({ slots: [] });

    render(
      <SlotPicker
        providerId="provider-1"
        serviceId="service-1"
        date="2026-08-10"
        selectedSlot={null}
        onSelectSlot={vi.fn()}
      />,
    );

    expect(await screen.findByText(/no open times/i)).toBeInTheDocument();
  });

  it("shows the API error message when the fetch fails", async () => {
    mockedGetAvailability.mockRejectedValue(new ApiError(404, "Provider not found"));

    render(
      <SlotPicker
        providerId="provider-1"
        serviceId="service-1"
        date="2026-08-10"
        selectedSlot={null}
        onSelectSlot={vi.fn()}
      />,
    );

    expect(await screen.findByText("Provider not found")).toBeInTheDocument();
  });

  it("calls onSelectSlot with the clicked slot", async () => {
    mockedGetAvailability.mockResolvedValue({ slots: SLOTS });
    const onSelectSlot = vi.fn();
    const user = userEvent.setup();

    render(
      <SlotPicker
        providerId="provider-1"
        serviceId="service-1"
        date="2026-08-10"
        selectedSlot={null}
        onSelectSlot={onSelectSlot}
      />,
    );

    const buttons = await screen.findAllByRole("button");
    await user.click(buttons[0]);

    expect(onSelectSlot).toHaveBeenCalledWith(SLOTS[0]);
  });

  it("marks the selected slot with aria-pressed", async () => {
    mockedGetAvailability.mockResolvedValue({ slots: SLOTS });

    render(
      <SlotPicker
        providerId="provider-1"
        serviceId="service-1"
        date="2026-08-10"
        selectedSlot={SLOTS[1]}
        onSelectSlot={vi.fn()}
      />,
    );

    const buttons = await screen.findAllByRole("button");
    expect(buttons[0]).toHaveAttribute("aria-pressed", "false");
    expect(buttons[1]).toHaveAttribute("aria-pressed", "true");
  });

  it("refetches when the refreshToken changes", async () => {
    mockedGetAvailability.mockResolvedValue({ slots: SLOTS });

    const { rerender } = render(
      <SlotPicker
        providerId="provider-1"
        serviceId="service-1"
        date="2026-08-10"
        selectedSlot={null}
        onSelectSlot={vi.fn()}
        refreshToken={0}
      />,
    );
    await screen.findAllByRole("button");
    expect(mockedGetAvailability).toHaveBeenCalledTimes(1);

    rerender(
      <SlotPicker
        providerId="provider-1"
        serviceId="service-1"
        date="2026-08-10"
        selectedSlot={null}
        onSelectSlot={vi.fn()}
        refreshToken={1}
      />,
    );

    await waitFor(() => expect(mockedGetAvailability).toHaveBeenCalledTimes(2));
  });
});
