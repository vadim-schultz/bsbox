import type { CityDto } from "../../../types/dto";
import { BaseCombobox } from "../../../../../app/components/ui";

type Props = {
  cities: CityDto[];
  value: string;
  onChange: (value: string) => void;
  loading?: boolean;
};

export function CitySelector({ cities, value, onChange, loading }: Props) {
  const handleChange = (val: string | null) => {
    onChange(val ?? "");
  };

  return (
    <BaseCombobox
      label="City"
      items={cities}
      value={value || null}
      onChange={handleChange}
      placeholder="Select or type a city"
      loading={loading}
    />
  );
}
