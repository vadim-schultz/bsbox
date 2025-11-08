import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import MeetingTimeline from "../MeetingTimeline";

vi.mock("react-chartjs-2", () => ({
  Line: ({ data }: { data: unknown }) => <pre data-testid="line-chart">{JSON.stringify(data)}</pre>,
}));

const mockHistory = [
  {
    meetingId: "1",
    participantCount: 3,
    speakers: 1,
    relevanceScore: 0.5,
    speakingScore: 0.4,
    timestamp: new Date("2024-01-01T10:00:00Z").toISOString(),
    participants: [],
  },
  {
    meetingId: "2",
    participantCount: 4,
    speakers: 2,
    relevanceScore: 0.8,
    speakingScore: 0.6,
    timestamp: new Date("2024-01-01T11:00:00Z").toISOString(),
    participants: [],
  },
];

describe("MeetingTimeline", () => {
  it("renders loading state when history is empty", () => {
    render(<MeetingTimeline history={[]} />);

    expect(screen.getByText(/waiting for meeting history/i)).toBeInTheDocument();
  });

  it("passes chart data when history is available", () => {
    render(<MeetingTimeline history={mockHistory} />);

    const chart = screen.getByTestId("line-chart");
    const payload = JSON.parse(chart.textContent ?? "{}");

    expect(payload.labels).toHaveLength(2);
    expect(payload.datasets[0].data).toEqual([50, 80]);
    expect(payload.datasets[1].data).toEqual([40, 60]);
  });
});


