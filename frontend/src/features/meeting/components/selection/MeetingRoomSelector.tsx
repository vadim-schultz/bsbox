import { Input, Stack, Text } from "@chakra-ui/react";

import type { MeetingRoomDto } from "../../types/dto";

type Props = {
  rooms: MeetingRoomDto[];
  value: string | null;
  onChange: (value: string | null) => void;
  loading?: boolean;
  disabled?: boolean;
};

export function MeetingRoomSelector({ rooms, value, onChange, loading, disabled }: Props) {
  return (
    <Stack gap={1}>
      <Text fontWeight="medium" fontSize="sm">
        Meeting room
      </Text>
      <Input
        list="meeting-room-options"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        disabled={disabled || loading}
        placeholder={disabled ? "Select a city first" : "Select or type a room"}
        size="md"
      />
      <datalist id="meeting-room-options">
        {rooms.map((room) => (
          <option key={room.id} value={room.name} />
        ))}
      </datalist>
    </Stack>
  );
}
