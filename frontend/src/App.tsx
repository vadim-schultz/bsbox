import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import Chart from "chart.js/auto";
import { fetchAnalytics, fetchHistory, postEvent } from "./api";
import type { MeetingAnalytics } from "./types";

type ToggleState = {
  visitorId: string;
  isSpeaking: boolean;
  isRelevant: boolean;
};

const DEFAULT_VISITOR_ID = "guest";

export function App() {
  const [toggles, setToggles] = useState<ToggleState>({
    visitorId: DEFAULT_VISITOR_ID,
    isSpeaking: false,
    isRelevant: false,
  });
  const [analytics, setAnalytics] = useState<MeetingAnalytics | null>(null);
  const [history, setHistory] = useState<MeetingAnalytics[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chartRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstance = useRef<Chart | null>(null);

  const refreshAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const [current, historical] = await Promise.all([
        fetchAnalytics(),
        fetchHistory(10),
      ]);
      setAnalytics(current);
      setHistory(historical);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshAnalytics();
  }, []);

  useEffect(() => {
    if (!chartRef.current) {
      return;
    }

    const labels = history
      .slice()
      .reverse()
      .map((entry) => new Date(entry.timestamp).toLocaleTimeString());
    const speakingData = history
      .slice()
      .reverse()
      .map((entry) => entry.speaking_score * 100);
    const relevanceData = history
      .slice()
      .reverse()
      .map((entry) => entry.relevance_score * 100);

    const data = {
      labels,
      datasets: [
        {
          label: "Speaking %",
          data: speakingData,
          borderColor: "#2563eb",
          fill: false,
        },
        {
          label: "Relevance %",
          data: relevanceData,
          borderColor: "#16a34a",
          fill: false,
        },
      ],
    };

    if (chartInstance.current) {
      chartInstance.current.data = data;
      chartInstance.current.update();
      return;
    }

    chartInstance.current = new Chart(chartRef.current, {
      type: "line",
      data,
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
          },
        },
      },
    });

    return () => {
      chartInstance.current?.destroy();
      chartInstance.current = null;
    };
  }, [history]);

  const handleToggleChange = (key: "isSpeaking" | "isRelevant") => {
    setToggles((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleVisitorIdChange = (event: Event) => {
    const value = (event.target as HTMLInputElement).value;
    setToggles((prev) => ({ ...prev, visitorId: value }));
  };

  const submitEvent = async () => {
    try {
      setLoading(true);
      setError(null);
      await postEvent({
        visitorId: toggles.visitorId.trim() || DEFAULT_VISITOR_ID,
        isSpeaking: toggles.isSpeaking,
        isRelevant: toggles.isRelevant,
      });
      await refreshAnalytics();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit event");
    } finally {
      setLoading(false);
    }
  };

  const currentParticipants = useMemo(() => analytics?.participants ?? [], [analytics]);

  return (
    <div class="app-shell">
      <header>
        <h1>Meeting Hotspot Dashboard</h1>
        <p>Use the controls below to mark your participation and view meeting metrics.</p>
      </header>

      <section class="panel">
        <h2>Update Participation</h2>
        <label class="field">
          <span>Visitor ID</span>
          <input
            value={toggles.visitorId}
            onInput={handleVisitorIdChange}
            placeholder="Your identifier"
          />
        </label>
        <div class="toggles">
          <label>
            <input
              type="checkbox"
              checked={toggles.isSpeaking}
              onChange={() => handleToggleChange("isSpeaking")}
            />
            Speaking
          </label>
          <label>
            <input
              type="checkbox"
              checked={toggles.isRelevant}
              onChange={() => handleToggleChange("isRelevant")}
            />
            Relevant
          </label>
        </div>
        <div class="actions">
          <button onClick={submitEvent} disabled={loading}>
            {loading ? "Saving..." : "Submit"}
          </button>
          <button onClick={() => void refreshAnalytics()} disabled={loading}>
            Refresh Analytics
          </button>
        </div>
        {error && <p class="error">{error}</p>}
      </section>

      <section class="panel">
        <h2>Current Meeting</h2>
        {analytics ? (
          <div class="metrics">
            <div>
              <span class="label">Participants</span>
              <span class="value">{analytics.participant_count}</span>
            </div>
            <div>
              <span class="label">Speaking</span>
              <span class="value">{(analytics.speaking_score * 100).toFixed(0)}%</span>
            </div>
            <div>
              <span class="label">Relevance</span>
              <span class="value">{(analytics.relevance_score * 100).toFixed(0)}%</span>
            </div>
          </div>
        ) : (
          <p>No analytics available yet.</p>
        )}

        {currentParticipants.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Visitor</th>
                <th>Speaking</th>
                <th>Relevant</th>
              </tr>
            </thead>
            <tbody>
              {currentParticipants.map((participant) => (
                <tr key={participant.visitor_id}>
                  <td>{participant.visitor_id}</td>
                  <td>{participant.is_speaking ? "Yes" : "No"}</td>
                  <td>{participant.is_relevant ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section class="panel">
        <h2>History (last {history.length} snapshots)</h2>
        <canvas ref={chartRef} height={220} />
      </section>
    </div>
  );
}
