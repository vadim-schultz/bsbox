import { ChakraProvider } from "@chakra-ui/react";
import type { PropsWithChildren } from "react";

import { system } from "../chakra/system";

export function AppChakraProvider({ children }: PropsWithChildren) {
  return <ChakraProvider value={system}>{children}</ChakraProvider>;
}

