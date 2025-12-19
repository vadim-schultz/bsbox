import { Card, Heading, Text } from "@chakra-ui/react";
import { InteractiveCard } from "./InteractiveCard";

type Props = {
  title: string;
  description: string;
  isActive: boolean;
  colorPalette: "orange" | "green" | "blue";
  onToggle: () => void;
};

export function StatusCard({
  title,
  description,
  isActive,
  colorPalette,
  onToggle,
}: Props) {
  return (
    <InteractiveCard
      isActive={isActive}
      colorPalette={colorPalette}
      onToggle={onToggle}
    >
      <Card.Body>
        <Heading size="md" mb={2}>
          {title}
        </Heading>
        <Text color={isActive ? "whiteAlpha.900" : "muted"}>{description}</Text>
      </Card.Body>
    </InteractiveCard>
  );
}

