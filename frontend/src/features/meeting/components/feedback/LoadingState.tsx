import { Center, Spinner, Stack, Text } from "@chakra-ui/react";

type Props = {
  label?: string;
};

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

