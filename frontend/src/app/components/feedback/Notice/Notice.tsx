import { Alert } from "@chakra-ui/react";

/**
 * Props for the Notice component.
 */
type NoticeProps = {
  /** The main message content */
  message: string;
  /** Optional title for the notice */
  title?: string;
  /** Visual status/severity of the notice */
  status?: "error" | "warning" | "info" | "success";
};

/**
 * A flexible notice/alert component built on Chakra UI's Alert.
 * Supports different status types for various use cases.
 *
 * @example
 * ```tsx
 * <Notice
 *   status="error"
 *   title="Connection Failed"
 *   message="Unable to connect to the server. Please try again."
 * />
 * ```
 */
export function Notice({
  message,
  title = "Notice",
  status = "info",
}: NoticeProps) {
  return (
    <Alert.Root status={status}>
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>{title}</Alert.Title>
        <Alert.Description>{message}</Alert.Description>
      </Alert.Content>
    </Alert.Root>
  );
}

