import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import ParticipantList from "../ParticipantList";

const baseParticipant = {
  visitorId: "aa:bb:cc:dd:ee:ff",
  displayName: null,
  signalStrength: -40,
  isSpeaking: false,
  isRelevant: false,
};

const analytics = {
  meetingId: "1",
  participantCount: 1,
  speakers: 0,
  relevanceScore: 0.5,
  speakingScore: 0.3,
  timestamp: new Date().toISOString(),
  participants: [baseParticipant],
};

describe("ParticipantList", () => {
  it("renders placeholder when there are no participants", () => {
    render(
      <ParticipantList analytics={{ ...analytics, participants: [] }} onToggleSpeaking={vi.fn()} onToggleRelevance={vi.fn()} />,
    );

    expect(screen.getByText(/no participants connected/i)).toBeInTheDocument();
  });

  it("calls toggle callbacks when buttons are pressed", () => {
    const onToggleSpeaking = vi.fn();
    const onToggleRelevance = vi.fn();

    render(
      <ParticipantList analytics={analytics} onToggleSpeaking={onToggleSpeaking} onToggleRelevance={onToggleRelevance} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /speaking/i }));
    fireEvent.click(screen.getByRole("button", { name: /relevant/i }));

    expect(onToggleSpeaking).toHaveBeenCalledWith(baseParticipant.visitorId);
    expect(onToggleRelevance).toHaveBeenCalledWith(baseParticipant.visitorId);
  });
});


