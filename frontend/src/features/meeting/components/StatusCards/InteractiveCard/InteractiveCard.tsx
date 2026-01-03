import type { KeyboardEvent, PropsWithChildren } from "react";
import { Card } from "@chakra-ui/react";

type Props = PropsWithChildren<{
  isActive: boolean;
  colorPalette: "orange" | "green" | "blue";
  onToggle: () => void;
}>;

export function InteractiveCard({
  isActive,
  colorPalette,
  onToggle,
  children,
}: Props) {
  const bg = isActive ? `${colorPalette}.500` : "surface";
  const color = isActive ? "white" : "textColor";
  const borderColor = isActive ? `${colorPalette}.600` : "borderSubtle";
  const shadow = isActive ? "md" : "sm";

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onToggle();
    }
  };

  return (
    <Card.Root
      role="button"
      tabIndex={0}
      aria-pressed={isActive}
      bg={bg}
      color={color}
      borderWidth="1px"
      borderColor={borderColor}
      shadow={shadow}
      cursor="pointer"
      transition="all 0.2s ease"
      onClick={onToggle}
      onKeyDown={handleKeyDown}
      _hover={{ shadow: "md", transform: "translateY(-2px)" }}
    >
      {children}
    </Card.Root>
  );
}

