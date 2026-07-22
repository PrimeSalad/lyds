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
  readOnly?: boolean;
  autoComplete?: string;
  min?: number;
  max?: number;
  onBlur?: () => void;
  ref?: React.Ref<HTMLInputElement>;
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
  readOnly,
  autoComplete,
  min,
  max,
  onBlur,
  ref,
}: TextFieldProps) => (
  <Field.Root invalid={!!error} required={required}>
    <Field.Label fontWeight="600" color="text.primary">{label}</Field.Label>
    <Input
      name={name}
      type={type}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      readOnly={readOnly}
      autoComplete={autoComplete}
      min={min}
      max={max}
      onBlur={onBlur}
      ref={ref}
      minH="44px"
      bg={readOnly ? 'surface.muted' : 'surface'}
      borderColor="border.strong"
      _hover={{ borderColor: readOnly ? 'border.strong' : 'gray.400' }}
      _focusVisible={{ borderColor: 'primary.600', boxShadow: '0 0 0 1px var(--chakra-colors-primary-600)' }}
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
  onBlur?: () => void;
  ref?: React.Ref<HTMLTextAreaElement>;
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
  onBlur,
  ref,
}: TextareaFieldProps) => (
  <Field.Root invalid={!!error} required={required}>
    <Field.Label fontWeight="600" color="text.primary">{label}</Field.Label>
    <Textarea
      name={name}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      onBlur={onBlur}
      ref={ref}
      borderColor="border.strong"
      _focusVisible={{ borderColor: 'primary.600', boxShadow: '0 0 0 1px var(--chakra-colors-primary-600)' }}
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
  helpText?: string;
  onBlur?: () => void;
  ref?: React.Ref<HTMLSelectElement>;
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
  helpText,
  onBlur,
  ref,
}: SelectFieldProps) => (
  <Field.Root invalid={!!error} required={required}>
    <Field.Label fontWeight="600" color="text.primary">{label}</Field.Label>
    <NativeSelect.Root disabled={disabled}>
      <NativeSelect.Field
        name={name}
        value={value ?? ''}
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange(e.target.value)}
        onBlur={onBlur}
        ref={ref}
        minH="44px"
        borderColor="border.strong"
        bg="surface"
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
    {helpText && !error && <Field.HelperText>{helpText}</Field.HelperText>}
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
      colorPalette="green"
      minH="44px"
    >
      <Checkbox.HiddenInput />
      <Checkbox.Control />
      <Checkbox.Label>{label}</Checkbox.Label>
    </Checkbox.Root>
    {error && <Text fontSize="sm" color="red.500">{error}</Text>}
  </VStack>
);
