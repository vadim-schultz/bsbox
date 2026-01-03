import { Field, Input, Text } from "@chakra-ui/react";
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
  const hasValue = value && value.trim();

  return (
    <Field.Root invalid={hasValue ? !validation.isValid : undefined}>
      <Field.Label>Microsoft Teams meeting (primary identifier)</Field.Label>
      <Input
        placeholder="Paste invite URL or meeting ID"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        size="md"
      />
      <Field.HelperText>
        If provided, this uniquely identifies your meeting regardless of location
      </Field.HelperText>
      {hasValue && validation.message && (
        <Text
          color={validation.isValid ? "success" : "warning"}
          fontSize="xs"
          fontWeight="medium"
          mt={1}
        >
          {validation.message}
        </Text>
      )}
    </Field.Root>
  );
}

