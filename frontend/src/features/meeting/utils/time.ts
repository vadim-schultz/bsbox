export const formatTimespan = (start?: Date, end?: Date) => {
  if (!start || !end) return "Loading meeting time...";
  const format = (value: Date) =>
    value.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  return `${format(start)} – ${format(end)}`;
};

