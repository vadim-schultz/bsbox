import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";
import { interactiveCardRecipe, chartContainerRecipe, statusBadgeRecipe } from "./recipes";

const brand = {
  50: { value: "#fff8eb" },
  100: { value: "#ffe7c2" },
  200: { value: "#ffd48f" },
  300: { value: "#ffc05c" },
  400: { value: "#ffac2a" },
  500: { value: "#e29509" },
  600: { value: "#b37404" },
  700: { value: "#855402" },
  800: { value: "#563600" },
  900: { value: "#2a1a00" },
};

const customConfig = defineConfig({
  cssVarsPrefix: "muda",
  theme: {
    tokens: {
      colors: {
        brand,
      },
      radii: {
        xl: { value: "1.5rem" },
      },
      shadows: {
        float: { value: "0 10px 35px -18px rgba(0, 0, 0, 0.35)" },
      },
    },
    semanticTokens: {
      colors: {
        pageBg: { value: { base: "{colors.gray.50}", _dark: "{colors.gray.900}" } },
        surface: { value: { base: "white", _dark: "{colors.gray.800}" } },
        borderSubtle: { value: { base: "{colors.gray.200}", _dark: "{colors.gray.700}" } },
        muted: { value: { base: "{colors.gray.600}", _dark: "{colors.gray.400}" } },
        focusRing: { value: { base: "{colors.blue.500}", _dark: "{colors.blue.300}" } },
        textColor: { value: { base: "{colors.gray.900}", _dark: "{colors.gray.100}" } },
        success: { value: { base: "{colors.green.600}", _dark: "{colors.green.400}" } },
        warning: { value: { base: "{colors.orange.600}", _dark: "{colors.orange.400}" } },
        error: { value: { base: "{colors.red.600}", _dark: "{colors.red.400}" } },
        info: { value: { base: "{colors.blue.600}", _dark: "{colors.blue.400}" } },
      },
    },
    textStyles: {
      label: {
        value: {
          fontWeight: "600",
          letterSpacing: "0.01em",
          textTransform: "uppercase",
          fontSize: "sm",
        },
      },
    },
    recipes: {
      interactiveCard: interactiveCardRecipe,
      chartContainer: chartContainerRecipe,
      statusBadge: statusBadgeRecipe,
    },
  },
});

export const system = createSystem(defaultConfig, customConfig);
