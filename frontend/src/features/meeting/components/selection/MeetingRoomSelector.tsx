import type { MeetingRoomDto } from "../../types/dto";
import { BaseCombobox } from "./BaseCombobox";

type Props = {
  rooms: MeetingRoomDto[];
  value: string;
  onChange: (value: string) => void;
  loading?: boolean;
  disabled?: boolean;
};

export function MeetingRoomSelector({ rooms, value, onChange, loading, disabled }: Props) {
  const handleChange = (val: string | null) => {
    onChange(val ?? "");
  };

  return (
    <BaseCombobox
      label="Meeting room"
      items={rooms}
      value={value || null}
      onChange={handleChange}
      placeholder={disabled ? "Select a city first" : "Select or type a room"}
      loading={loading}
      disabled={disabled}
    />
  );
}
