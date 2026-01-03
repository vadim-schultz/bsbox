import type { CityDto } from "../../../types/dto";
import { BaseCombobox } from "../../../../../app/components/ui";

type Props = {
  cities: CityDto[];
  value: string;
  onChange: (value: string) => void;
  loading?: boolean;
  disabled?: boolean;
};

export function CitySelector({ cities, value, onChange, loading, disabled }: Props) {
  const handleChange = (val: string | null) => {
    onChange(val ?? "");
  };

  return (
    <BaseCombobox
      label="City"
      items={cities}
      value={value || null}
      onChange={handleChange}
      placeholder={disabled ? "Not needed - Teams link provided" : "Select or type a city"}
      loading={loading}
      disabled={disabled}
    />
  );
}
