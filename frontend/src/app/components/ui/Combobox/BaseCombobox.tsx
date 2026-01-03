import { Combobox, Field, createListCollection } from "@chakra-ui/react";
import { useMemo, useRef, type FormEvent, type KeyboardEvent } from "react";

/**
 * Props for the BaseCombobox component.
 * @template T - Item type that must have id and name properties
 */
type BaseComboboxProps<T extends { id: string; name: string }> = {
  /** Label displayed above the combobox */
  label: string;
  /** Array of items to display in the dropdown */
  items: T[];
  /** Currently selected value */
  value: string | null;
  /** Callback when value changes */
  onChange: (value: string | null) => void;
  /** Placeholder text for the input */
  placeholder: string;
  /** Whether the combobox is in loading state */
  loading?: boolean;
  /** Whether the combobox is disabled */
  disabled?: boolean;
  /** Message to show when no items match */
  emptyMessage?: string;
  /** Helper text displayed below the input */
  helperText?: string;
};

/**
 * A reusable combobox component that supports both selection from a list
 * and free-text entry. Built on top of Chakra UI's Combobox and Field components.
 *
 * @example
 * ```tsx
 * <BaseCombobox
 *   label="City"
 *   items={cities}
 *   value={selectedCity}
 *   onChange={setSelectedCity}
 *   placeholder="Select or type a city"
 * />
 * ```
 */
export function BaseCombobox<T extends { id: string; name: string }>({
  label,
  items,
  value,
  onChange,
  placeholder,
  loading,
  disabled,
  emptyMessage = "Type to create a new entry",
  helperText,
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
    <Field.Root disabled={disabled || loading}>
      <Field.Label>{label}</Field.Label>
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
      {helperText && <Field.HelperText>{helperText}</Field.HelperText>}
    </Field.Root>
  );
}

