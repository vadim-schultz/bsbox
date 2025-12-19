import { Badge } from "@chakra-ui/react";

type Props = {
  count: number;
  label?: string;
};

export function ParticipantBadge({ count, label = "participant" }: Props) {
  const pluralLabel = count === 1 ? label : `${label}s`;
  
  return (
    <Badge colorPalette="blue" fontSize="md" px={3} py={2} borderRadius="md">
      {count} {pluralLabel}
    </Badge>
  );
}

