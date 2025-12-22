import type { CityDto } from "../../types/dto";
import { BaseCombobox } from "./BaseCombobox";

type Props = {
  cities: CityDto[];
  value: string | null;
  onChange: (value: string | null) => void;
  loading?: boolean;
};

export function CitySelector({ cities, value, onChange, loading }: Props) {
  return (
    <BaseCombobox
      label="City"
      items={cities}
      value={value}
      onChange={onChange}
      placeholder="Select or type a city"
      loading={loading}
    />
  );
}
