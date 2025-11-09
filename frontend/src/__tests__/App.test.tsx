import { render, fireEvent, screen, waitFor } from "@testing-library/preact";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { Mock } from "vitest";
import { App } from "../App";

vi.mock("chart.js/auto", () => {
  return {
    default: class MockChart {
      data: unknown;
      constructor(_: unknown, config: { data: unknown }) {
        this.data = config.data;
      }
      update() {
        return;
      }
      destroy() {
        return;
      }
    },
  };
});

const analyticsPayload = {
  meeting_id: "meeting-1",
  participant_count: 0,
  speakers: 0,
  relevance_score: 0,
  speaking_score: 0,
  timestamp: new Date().toISOString(),
  participants: [],
};

const historyPayload = [
  {
    ...analyticsPayload,
    timestamp: new Date().toISOString(),
    participant_count: 2,
    speaking_score: 0.5,
    relevance_score: 0.5,
  },
];

function mockFetchSequence(): Mock {
  const fetchMock = vi.fn();
  fetchMock.mockResolvedValueOnce({
    ok: true,
    json: async () => analyticsPayload,
  } as Response);
  fetchMock.mockResolvedValueOnce({
    ok: true,
    json: async () => historyPayload,
  } as Response);
  fetchMock.mockResolvedValue({
    ok: true,
    json: async () => analyticsPayload,
  } as Response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("App", () => {
  let fetchMock: Mock;

  beforeEach(() => {
    fetchMock = mockFetchSequence();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetAllMocks();
  });

  it("submits updated participation toggles and refreshes analytics", async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /current meeting/i })).toBeInTheDocument();
    });

    const speakingCheckbox = screen.getByLabelText("Speaking") as HTMLInputElement;
    const relevantCheckbox = screen.getByLabelText("Relevant") as HTMLInputElement;

    expect(speakingCheckbox.checked).toBe(false);
    expect(relevantCheckbox.checked).toBe(false);

    fireEvent.click(speakingCheckbox);
    fireEvent.click(relevantCheckbox);

    expect(speakingCheckbox.checked).toBe(true);
    expect(relevantCheckbox.checked).toBe(true);

    const submitButton = await screen.findByRole("button", { name: /submit/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/meetings/events"),
        expect.objectContaining({
          method: "POST",
        }),
      );
    });
  });
});


