import { Field } from "@chakra-ui/react";
import { SegmentGroup } from "@chakra-ui/react";

type Props = {
  value: 30 | 60;
  onChange: (value: 30 | 60) => void;
};

const DURATION_OPTIONS = [
  { value: "30", label: "30 min" },
  { value: "60", label: "60 min" },
] as const;

/**
 * Duration selector using segmented control for meeting duration.
 * Allows selection between 30 and 60 minute durations.
 */
export function DurationControl({ value, onChange }: Props) {
  const handleValueChange = (details: { value: string | null }) => {
    if (!details.value) return;
    const numValue = parseInt(details.value, 10);
    if (numValue === 30 || numValue === 60) {
      onChange(numValue);
    }
  };

  return (
    <Field.Root>
      <Field.Label>Meeting duration</Field.Label>
      <SegmentGroup.Root
        value={String(value)}
        onValueChange={handleValueChange}
        size="md"
      >
        <SegmentGroup.Indicator />
        {DURATION_OPTIONS.map((option) => (
          <SegmentGroup.Item key={option.value} value={option.value}>
            <SegmentGroup.ItemText>{option.label}</SegmentGroup.ItemText>
            <SegmentGroup.ItemHiddenInput />
          </SegmentGroup.Item>
        ))}
      </SegmentGroup.Root>
    </Field.Root>
  );
}

