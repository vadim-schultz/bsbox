import { Alert } from "@chakra-ui/react";

type ErrorNoticeProps = {
  message: string;
  title?: string;
  status?: "error" | "warning" | "info";
};

export function ErrorNotice({
  message,
  title = "Unable to load",
  status = "error",
}: ErrorNoticeProps) {
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

