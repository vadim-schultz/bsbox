import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { Box, Loader, Text } from "@mantine/core";
import { MeetingAnalytics } from "../types/meeting";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

type MeetingTimelineProps = {
  history: MeetingAnalytics[];
};

const MeetingTimeline = ({ history }: MeetingTimelineProps) => {
  if (!history.length) {
    return (
      <Box ta="center">
        <Loader size="sm" color="teal" />
        <Text size="sm" c="dimmed" mt="xs">
          Waiting for meeting history...
        </Text>
      </Box>
    );
  }

  const labels = history
    .slice()
    .reverse()
    .map((meeting) => new Date(meeting.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));

  const data = {
    labels,
    datasets: [
      {
        label: "Relevance %",
        data: history
          .slice()
          .reverse()
          .map((meeting) => Math.round(meeting.relevanceScore * 100)),
        borderColor: "#2dd4bf",
        backgroundColor: "rgba(45, 212, 191, 0.2)",
        tension: 0.4,
        fill: true,
      },
      {
        label: "Speaking %",
        data: history
          .slice()
          .reverse()
          .map((meeting) => Math.round(meeting.speakingScore * 100)),
        borderColor: "#f97316",
        backgroundColor: "rgba(249, 115, 22, 0.2)",
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: "#e2e8f0",
        },
      },
      tooltip: {
        mode: "index" as const,
        intersect: false,
      },
    },
    scales: {
      x: {
        ticks: {
          color: "#94a3b8",
        },
      },
      y: {
        ticks: {
          color: "#94a3b8",
          callback: (value: string | number) => `${value}%`,
        },
        suggestedMin: 0,
        suggestedMax: 100,
      },
    },
  };

  return (
    <Box h={240}>
      <Line data={data} options={options} />
    </Box>
  );
};

export default MeetingTimeline;

