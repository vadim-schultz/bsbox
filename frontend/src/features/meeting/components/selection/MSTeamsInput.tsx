import { Input, Stack, Text, Flex } from "@chakra-ui/react";
import { useMemo } from "react";

type Props = {
  value: string | null;
  onChange: (value: string | null) => void;
};

function validateTeamsInput(input: string | null): { isValid: boolean; message: string } {
  if (!input || input.trim() === "") {
    return { isValid: true, message: "" };
  }

  const trimmed = input.trim();

  // Check for Teams URL patterns
  if (trimmed.toLowerCase().startsWith("http")) {
    if (trimmed.includes("teams.microsoft.com")) {
      return { isValid: true, message: "✓ Valid Teams URL" };
    }
    return { isValid: false, message: "⚠ URL doesn't look like a Teams link" };
  }

  // Check for numeric meeting ID pattern
  const numericPattern = /^\d[\d\s]+\d$/;
  if (numericPattern.test(trimmed)) {
    return { isValid: true, message: "✓ Valid meeting ID format" };
  }

  // Single digit
  if (/^\d$/.test(trimmed)) {
    return { isValid: false, message: "⚠ Meeting ID should have multiple digits" };
  }

  return { isValid: false, message: "⚠ Enter a Teams URL or numeric meeting ID" };
}

export function MSTeamsInput({ value, onChange }: Props) {
  const validation = useMemo(() => validateTeamsInput(value), [value]);

  return (
    <Stack gap={1}>
      <Text fontWeight="medium" fontSize="sm">
        Microsoft Teams meeting (optional)
      </Text>
      <Input
        placeholder="Paste invite URL or meeting ID"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        size="md"
      />
      <Flex justify="space-between" align="center" gap={2}>
        <Text color="gray.600" fontSize="xs">
          Accepts full Teams invite links or numeric meeting IDs
        </Text>
        {value && value.trim() && (
          <Text
            color={validation.isValid ? "green.600" : "orange.600"}
            fontSize="xs"
            fontWeight="medium"
          >
            {validation.message}
          </Text>
        )}
      </Flex>
    </Stack>
  );
}
