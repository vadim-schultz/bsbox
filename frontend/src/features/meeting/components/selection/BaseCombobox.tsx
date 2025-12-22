import { Combobox, Stack, Text, createListCollection } from "@chakra-ui/react";
import { useMemo } from "react";

type BaseComboboxProps<T extends { id: string; name: string }> = {
  label: string;
  items: T[];
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder: string;
  loading?: boolean;
  disabled?: boolean;
  emptyMessage?: string;
};

export function BaseCombobox<T extends { id: string; name: string }>({
  label,
  items,
  value,
  onChange,
  placeholder,
  loading,
  disabled,
  emptyMessage = "No results found",
}: BaseComboboxProps<T>) {
  const collection = useMemo(
    () =>
      createListCollection({
        items: items.map((item) => ({
          label: item.name,
          value: item.name,
        })),
      }),
    [items]
  );

  const handleValueChange = (details: { value: string[] }) => {
    // Combobox returns an array, but we want single selection
    const selectedValue = details.value[0] || null;
    onChange(selectedValue);
  };

  return (
    <Stack gap={1}>
      <Text fontWeight="medium" fontSize="sm">
        {label}
      </Text>
      <Combobox.Root
        collection={collection}
        value={value ? [value] : []}
        onValueChange={handleValueChange}
        disabled={disabled || loading}
        openOnClick
        size="md"
      >
        <Combobox.Control>
          <Combobox.Input placeholder={placeholder} />
          <Combobox.Trigger />
        </Combobox.Control>
        <Combobox.Positioner>
          <Combobox.Content>
            <Combobox.ItemGroup>
              {collection.items.map((item) => (
                <Combobox.Item key={item.value} item={item}>
                  <Combobox.ItemText>{item.label}</Combobox.ItemText>
                  <Combobox.ItemIndicator />
                </Combobox.Item>
              ))}
            </Combobox.ItemGroup>
            {collection.items.length === 0 && (
              <Combobox.Empty>{emptyMessage}</Combobox.Empty>
            )}
          </Combobox.Content>
        </Combobox.Positioner>
      </Combobox.Root>
    </Stack>
  );
}
