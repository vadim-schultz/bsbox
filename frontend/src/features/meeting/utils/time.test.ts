import { formatInTimeZone } from "date-fns-tz";
import { describe, expect, it } from "vitest";

import { formatTimespan, toLocalDate } from "./time";

describe("time utils", () => {
  it("converts UTC strings to local Dates for a given timezone", () => {
    const value = "2023-01-01T09:00:00Z";
    const zoned = toLocalDate(value, "America/New_York");
    expect(formatInTimeZone(zoned, "America/New_York", "HH:mm")).toBe("04:00");
  });

  it("formats timespans in the browser timezone", () => {
    const label = formatTimespan(
      "2023-01-01T09:00:00Z",
      "2023-01-01T10:00:00Z",
      "America/Chicago"
    );
    expect(label).toBe("03:00 – 04:00");
  });
});


