import { Card, Heading } from "@chakra-ui/react";
import type { PropsWithChildren } from "react";

type Props = PropsWithChildren<{
  title: string;
}>;

export function ChartCard({ title, children }: Props) {
  return (
    <Card.Root>
      <Card.Header>
        <Heading size="sm">
          {title}
        </Heading>
      </Card.Header>
      <Card.Body>
        {children}
      </Card.Body>
    </Card.Root>
  );
}

