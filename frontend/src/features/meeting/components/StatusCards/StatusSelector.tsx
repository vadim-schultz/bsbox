import { Grid, GridItem } from "@chakra-ui/react";
import { StatusCard } from "./StatusCard";

type Status = "speaking" | "engaged" | "disengaged";

/**
 * Props for the StatusSelector component.
 */
type Props = {
  /** Currently active status */
  activeStatus: Status;
  /** Callback when a status card is toggled */
  onToggle: (status: "speaking" | "engaged") => void;
};

/**
 * A grid of interactive status cards allowing users to signal their
 * current meeting participation state (speaking or engaged).
 *
 * @example
 * ```tsx
 * <StatusSelector
 *   activeStatus={currentStatus}
 *   onToggle={(status) => updateStatus(status)}
 * />
 * ```
 */
export function StatusSelector({ activeStatus, onToggle }: Props) {
  return (
    <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={4}>
      <GridItem>
        <StatusCard
          title="I am speaking"
          description="Let others know you are taking the floor."
          isActive={activeStatus === "speaking"}
          colorPalette="orange"
          onToggle={() => onToggle("speaking")}
        />
      </GridItem>
      <GridItem>
        <StatusCard
          title="This is interesting"
          description="Signal engagement with the current discussion."
          isActive={activeStatus === "engaged"}
          colorPalette="green"
          onToggle={() => onToggle("engaged")}
        />
      </GridItem>
    </Grid>
  );
}

