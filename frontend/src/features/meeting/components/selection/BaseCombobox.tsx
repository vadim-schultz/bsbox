import { Combobox, Stack, Text, createListCollection } from "@chakra-ui/react";
import { useMemo, useRef, type FormEvent, type KeyboardEvent } from "react";

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
  emptyMessage = "Type to create a new entry",
}: BaseComboboxProps<T>) {
  const inputRef = useRef<HTMLInputElement>(null);

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
    // User selected from the list
    const selectedValue = details.value[0] || null;
    if (selectedValue) {
      onChange(selectedValue);
    }
  };

  // Handle native input events for free-text entry (using onInput for real-time updates)
  const handleInput = (e: FormEvent<HTMLInputElement>) => {
    const newValue = (e.target as HTMLInputElement).value;
    onChange(newValue || null);
  };

  // Handle Enter key to confirm custom value
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const currentValue = inputRef.current?.value?.trim();
      if (currentValue) {
        onChange(currentValue);
      }
    }
  };

  // Handle blur to capture final value
  const handleBlur = () => {
    const currentValue = inputRef.current?.value?.trim();
    if (currentValue) {
      onChange(currentValue);
    }
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
        allowCustomValue
        size="md"
      >
        <Combobox.Control>
          <Combobox.Input 
            ref={inputRef}
            placeholder={placeholder}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            defaultValue={value ?? ""}
          />
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
              <Combobox.Empty>
                {emptyMessage}
              </Combobox.Empty>
            )}
          </Combobox.Content>
        </Combobox.Positioner>
      </Combobox.Root>
    </Stack>
  );
}
