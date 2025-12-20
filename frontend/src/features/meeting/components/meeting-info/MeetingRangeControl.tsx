import { Box, HStack, Slider, Stack, Text } from "@chakra-ui/react";
import { useEffect, useState } from "react";

type Props = {
  start?: Date;
  end?: Date;
  currentDurationMinutes: number;
  onDurationChange?: (minutes: 30 | 60) => Promise<void> | void;
  isLocked?: boolean;
};

const clampDuration = (value: number): 30 | 60 => (value >= 45 ? 60 : 30);

const formatTime = (value?: Date) =>
  value
    ? value.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "--:--";

export function MeetingRangeControl({
  start,
  end,
  currentDurationMinutes,
  onDurationChange,
  isLocked,
}: Props) {
  const baseDuration = clampDuration(currentDurationMinutes);
  const [value, setValue] = useState<number[]>([0, baseDuration]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasEdited, setHasEdited] = useState(false);

  useEffect(() => {
    setValue([0, baseDuration]);
  }, [baseDuration]);

  const locked = isLocked || hasEdited;
  const disabled = locked || saving || !start;

  const handleValueChange = (details: { value: number[] }) => {
    const endValue = details.value[1];
    const clamped = clampDuration(endValue);
    setValue([0, clamped]);
  };

  const handleValueChangeEnd = async (details: { value: number[] }) => {
    const endValue = details.value[1];
    const target = clampDuration(endValue);
    if (target === baseDuration || disabled || !onDurationChange) {
      setValue([0, baseDuration]);
      return;
    }
    try {
      setSaving(true);
      setError(null);
      await onDurationChange(target);
      setHasEdited(true);
      setValue([0, target]);
    } catch (err) {
      setValue([0, baseDuration]);
      setError(err instanceof Error ? err.message : "Failed to update duration");
    } finally {
      setSaving(false);
    }
  };

  const startLabel = formatTime(start);
  const end30Label = start
    ? formatTime(new Date(start.getTime() + 30 * 60000))
    : "--:--";
  const end60Label = start
    ? formatTime(new Date(start.getTime() + 60 * 60000))
    : "--:--";

  return (
    <Stack gap={2} w="full">
      <HStack justify="space-between">
        <Text fontWeight="medium">Adjust duration (one-time)</Text>
        <Text fontSize="sm" color="muted">
          {locked ? "Locked" : saving ? "Saving..." : "Editable"}
        </Text>
      </HStack>
      <Slider.Root
        min={0}
        max={60}
        step={30}
        value={value}
        onValueChange={handleValueChange}
        onValueChangeEnd={handleValueChangeEnd}
        disabled={disabled}
      >
        <Slider.Control>
          <Slider.Track>
            <Slider.Range />
          </Slider.Track>
          <Slider.Thumb index={0} cursor="not-allowed" pointerEvents="none" />
          <Slider.Thumb index={1} />
        </Slider.Control>
        <Slider.MarkerGroup>
          <Slider.Marker value={0}>
            <Text fontSize="xs" mt="2">
              {startLabel}
            </Text>
          </Slider.Marker>
          <Slider.Marker value={30}>
            <Text fontSize="xs" mt="2" textAlign="center" w="16">
              {end30Label}
            </Text>
          </Slider.Marker>
          <Slider.Marker value={60}>
            <Text fontSize="xs" mt="2" textAlign="right">
              {end60Label}
            </Text>
          </Slider.Marker>
        </Slider.MarkerGroup>
      </Slider.Root>
      {error ? (
        <Box
          bg="red.50"
          border="1px solid"
          borderColor="red.100"
          rounded="md"
          p={2}
        >
          <Text fontSize="sm" color="red.600">
            {error}
          </Text>
        </Box>
      ) : null}
    </Stack>
  );
}
