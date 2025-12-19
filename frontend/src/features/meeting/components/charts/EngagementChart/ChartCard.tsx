import { Box, Heading } from "@chakra-ui/react";
import type { PropsWithChildren } from "react";

type Props = PropsWithChildren<{
  title: string;
}>;

export function ChartCard({ title, children }: Props) {
  return (
    <Box borderWidth="1px" borderRadius="lg" p={4}>
      <Heading size="sm" mb={4}>
        {title}
      </Heading>
      {children}
    </Box>
  );
}

