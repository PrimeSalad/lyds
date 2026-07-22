import { Field, Input, Textarea, NativeSelect, Checkbox, Text, VStack } from '@chakra-ui/react';

interface TextFieldProps {
  label: string;
  name?: string;
  value?: string | number;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  type?: string;
  placeholder?: string;
  helpText?: string;
  disabled?: boolean;
}

export const TextField = ({
  label,
  name,
  value,
  onChange,
  error,
  required,
  type = 'text',
  placeholder,
  helpText,
  disabled,
}: TextFieldProps) => (
  <Field.Root invalid={!!error} required={required}>
    <Field.Label>{label}</Field.Label>
    <Input
      name={name}
      type={type}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
    />
    {helpText && !error && <Field.HelperText>{helpText}</Field.HelperText>}
    {error && <Field.ErrorText>{error}</Field.ErrorText>}
  </Field.Root>
);

interface TextareaFieldProps {
  label: string;
  name?: string;
  value?: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
  rows?: number;
}

export const TextareaField = ({
  label,
  name,
  value,
  onChange,
  error,
  required,
  placeholder,
  rows = 3,
}: TextareaFieldProps) => (
  <Field.Root invalid={!!error} required={required}>
    <Field.Label>{label}</Field.Label>
    <Textarea
      name={name}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
    />
    {error && <Field.ErrorText>{error}</Field.ErrorText>}
  </Field.Root>
);

interface SelectFieldProps {
  label: string;
  name?: string;
  value?: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  error?: string;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

export const SelectField = ({
  label,
  name,
  value,
  onChange,
  options,
  error,
  required,
  placeholder,
  disabled,
}: SelectFieldProps) => (
  <Field.Root invalid={!!error} required={required}>
    <Field.Label>{label}</Field.Label>
    <NativeSelect.Root disabled={disabled}>
      <NativeSelect.Field
        name={name}
        value={value ?? ''}
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange(e.target.value)}
      >
        {placeholder && <option value="" disabled>{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </NativeSelect.Field>
      <NativeSelect.Indicator />
    </NativeSelect.Root>
    {error && <Field.ErrorText>{error}</Field.ErrorText>}
  </Field.Root>
);

interface CheckboxFieldProps {
  label: string;
  name?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
}

export const CheckboxField = ({
  label,
  name,
  checked,
  onChange,
  error,
}: CheckboxFieldProps) => (
  <VStack align="start" gap={1}>
    <Checkbox.Root
      name={name}
      checked={checked}
      onCheckedChange={(e) => onChange(!!e.checked)}
    >
      <Checkbox.HiddenInput />
      <Checkbox.Control />
      <Checkbox.Label>{label}</Checkbox.Label>
    </Checkbox.Root>
    {error && <Text fontSize="sm" color="red.500">{error}</Text>}
  </VStack>
);
