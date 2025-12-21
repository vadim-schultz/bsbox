import { Input, Stack, Text } from "@chakra-ui/react";

import type { CityDto } from "../../types/dto";

type Props = {
  cities: CityDto[];
  value: string | null;
  onChange: (value: string | null) => void;
  loading?: boolean;
};

export function CitySelector({ cities, value, onChange, loading }: Props) {
  return (
    <Stack gap={1}>
      <Text fontWeight="medium" fontSize="sm">
        City
      </Text>
      <Input
        list="city-options"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        disabled={loading}
        placeholder="Select or type a city"
        size="md"
      />
      <datalist id="city-options">
        {cities.map((city) => (
          <option key={city.id} value={city.name} />
        ))}
      </datalist>
    </Stack>
  );
}
