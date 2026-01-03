import { Alert } from "@chakra-ui/react";

type Props = {
  driftMs: number;
};

export function ClockDriftWarning({ driftMs }: Props) {
  return (
    <Alert.Root status="warning">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>Clock Drift Detected</Alert.Title>
        <Alert.Description>
          Your device clock appears to be {Math.abs(Math.floor(driftMs / 1000))} seconds{" "}
          {driftMs > 0 ? "ahead" : "behind"} the server. The countdown uses server time for accuracy.
        </Alert.Description>
      </Alert.Content>
    </Alert.Root>
  );
}

