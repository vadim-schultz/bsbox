import type { MeetingRoomDto } from "../../../types/dto";
import { BaseCombobox } from "../../../../../app/components/ui";

type Props = {
  rooms: MeetingRoomDto[];
  value: string;
  onChange: (value: string) => void;
  loading?: boolean;
  disabled?: boolean;
  teamsProvided?: boolean;
};

export function MeetingRoomSelector({ rooms, value, onChange, loading, disabled, teamsProvided }: Props) {
  const handleChange = (val: string | null) => {
    onChange(val ?? "");
  };

  let placeholder = "Select or type a room";
  if (teamsProvided) {
    placeholder = "Not needed - Teams link provided";
  } else if (disabled) {
    placeholder = "Select a city first";
  }

  return (
    <BaseCombobox
      label="Meeting room"
      items={rooms}
      value={value || null}
      onChange={handleChange}
      placeholder={placeholder}
      loading={loading}
      disabled={disabled}
    />
  );
}
