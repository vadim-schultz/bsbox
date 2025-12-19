import { Center, Text } from "@chakra-ui/react";

type Props = {
  message?: string;
};

export function ChartEmptyState({
  message = "No engagement data yet. Data will appear as participants interact.",
}: Props) {
  return (
    <Center height="320px">
      <Text color="muted" fontSize="sm">
        {message}
      </Text>
    </Center>
  );
}

