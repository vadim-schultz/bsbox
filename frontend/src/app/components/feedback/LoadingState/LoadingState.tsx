import { Center, Spinner, Stack, Text } from "@chakra-ui/react";

/**
 * Props for the LoadingState component.
 */
type Props = {
  /** Text label to display below the spinner */
  label?: string;
};

/**
 * A centered loading state component with a spinner and optional label.
 * Provides consistent loading UI across the application.
 *
 * @example
 * ```tsx
 * <LoadingState label="Loading meeting data..." />
 * ```
 */
export function LoadingState({ label = "Loading..." }: Props) {
  return (
    <Center py={10}>
      <Stack align="center" gap={3}>
        <Spinner size="lg" />
        <Text color="muted" fontSize="sm">
          {label}
        </Text>
      </Stack>
    </Center>
  );
}

