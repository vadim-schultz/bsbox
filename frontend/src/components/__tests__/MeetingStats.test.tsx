import { render, screen } from "@testing-library/react";
import MeetingStats from "../MeetingStats";

const mockAnalytics = {
  meetingId: "123",
  participantCount: 5,
  speakers: 2,
  relevanceScore: 0.6,
  speakingScore: 0.4,
  timestamp: new Date().toISOString(),
};

describe("MeetingStats", () => {
  it("renders analytics figures", () => {
    render(<MeetingStats analytics={mockAnalytics} />);

    expect(screen.getByText(/Live meeting/i)).toBeInTheDocument();
    expect(screen.getByText(/5 online/i)).toBeInTheDocument();
    expect(screen.getByText(/2 speaking/i)).toBeInTheDocument();
  });
});

