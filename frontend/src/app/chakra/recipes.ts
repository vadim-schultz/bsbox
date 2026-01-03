import { defineRecipe } from "@chakra-ui/react";

/**
 * Custom Chakra UI recipes for repeated UI patterns in the application.
 */

export const interactiveCardRecipe = defineRecipe({
  base: {
    cursor: "pointer",
    transition: "all 0.2s ease",
    borderWidth: "1px",
    _hover: {
      shadow: "md",
      transform: "translateY(-2px)",
    },
  },
  variants: {
    state: {
      active: {
        shadow: "md",
      },
      inactive: {
        shadow: "sm",
      },
    },
    colorScheme: {
      orange: {
        _active: {
          bg: "orange.500",
          color: "white",
          borderColor: "orange.600",
        },
      },
      green: {
        _active: {
          bg: "green.500",
          color: "white",
          borderColor: "green.600",
        },
      },
      blue: {
        _active: {
          bg: "blue.500",
          color: "white",
          borderColor: "blue.600",
        },
      },
    },
  },
  defaultVariants: {
    state: "inactive",
    colorScheme: "blue",
  },
});

export const chartContainerRecipe = defineRecipe({
  base: {
    borderWidth: "1px",
    borderRadius: "lg",
    borderColor: "borderSubtle",
    bg: "surface",
    p: 4,
  },
  variants: {
    size: {
      sm: {
        p: 3,
      },
      md: {
        p: 4,
      },
      lg: {
        p: 6,
      },
    },
  },
  defaultVariants: {
    size: "md",
  },
});

export const statusBadgeRecipe = defineRecipe({
  base: {
    fontSize: "md",
    px: 3,
    py: 2,
    borderRadius: "md",
    fontWeight: "medium",
  },
  variants: {
    variant: {
      participant: {
        colorPalette: "blue",
      },
      status: {
        colorPalette: "green",
      },
      warning: {
        colorPalette: "orange",
      },
    },
  },
  defaultVariants: {
    variant: "participant",
  },
});

