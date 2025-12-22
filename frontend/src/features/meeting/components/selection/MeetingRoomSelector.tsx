import type { MeetingRoomDto } from "../../types/dto";
import { BaseCombobox } from "./BaseCombobox";

type Props = {
  rooms: MeetingRoomDto[];
  value: string | null;
  onChange: (value: string | null) => void;
  loading?: boolean;
  disabled?: boolean;
};

export function MeetingRoomSelector({ rooms, value, onChange, loading, disabled }: Props) {
  return (
    <BaseCombobox
      label="Meeting room"
      items={rooms}
      value={value}
      onChange={onChange}
      placeholder={disabled ? "Select a city first" : "Select or type a room"}
      loading={loading}
      disabled={disabled}
    />
  );
}
