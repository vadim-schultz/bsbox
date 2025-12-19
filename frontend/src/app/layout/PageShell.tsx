import { Box, Container } from "@chakra-ui/react";
import type { PropsWithChildren } from "react";

export function PageShell({ children }: PropsWithChildren) {
  return (
    <Box bg="pageBg" minH="100vh" color="textColor">
      <Container maxW="5xl" py={{ base: 8, md: 12 }}>
        {children}
      </Container>
    </Box>
  );
}

