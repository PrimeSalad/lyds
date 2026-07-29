import { Grid, GridItem } from '@chakra-ui/react';
import { Controller, type Control, type FieldValues } from 'react-hook-form';
import { SectionHeader } from '../../../../shared/components/SectionHeader';
import {
  CheckboxField,
  SelectField,
  TextareaField,
  TextField,
} from '../../../../shared/forms/FormFields';
import type { CategoryField } from '../../infrastructure/category-api';

const fieldOptions = (options: unknown) => {
  if (!Array.isArray(options)) return [];
  return options
    .map((option) => {
      if (typeof option === 'string') return { value: option, label: option };
      if (option && typeof option === 'object') {
        const item = option as { value?: unknown; label?: unknown };
        const label = String(item.label ?? item.value ?? '');
        return label ? { value: String(item.value ?? label), label } : null;
      }
      return null;
    })
    .filter((option): option is { value: string; label: string } => Boolean(option));
};

type CategoryCustomFieldsProps = {
  fields: CategoryField[];
  control: Control<FieldValues>;
};

export const CategoryCustomFields = ({ fields, control }: CategoryCustomFieldsProps) => {
  const activeFields = fields
    .filter((field) => field.is_active !== false)
    .sort((left, right) => left.sort_order - right.sort_order);

  if (activeFields.length === 0) return null;

  return (
    <>
      <SectionHeader>Additional category fields</SectionHeader>
      <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={5}>
        {activeFields.map((categoryField) => {
          const name = `custom_values.${categoryField.field_key}`;
          const label = categoryField.label;
          const rules = categoryField.is_required
            ? { required: `${categoryField.label} is required.` }
            : undefined;
          const options = fieldOptions(categoryField.options);

          return (
            <GridItem key={categoryField.id} colSpan={{ base: 1, md: categoryField.field_type === 'LONG_TEXT' ? 2 : 1 }}>
              <Controller
                name={name}
                control={control}
                rules={rules}
                render={({ field, fieldState }) => {
                  if (categoryField.field_type === 'YES_NO' || categoryField.field_type === 'BOOLEAN') {
                    return (
                      <CheckboxField
                        label={label}
                        checked={Boolean(field.value)}
                        onChange={field.onChange}
                        error={fieldState.error?.message}
                      />
                    );
                  }

                  if ((categoryField.field_type === 'SINGLE_SELECT' || categoryField.field_type === 'SELECT') && options.length > 0) {
                    return (
                      <SelectField
                        label={label}
                        required={categoryField.is_required}
                        value={String(field.value ?? '')}
                        onChange={field.onChange}
                        placeholder="Select option"
                        options={options}
                        helpText={categoryField.help_text || undefined}
                        error={fieldState.error?.message}
                      />
                    );
                  }

                  if (categoryField.field_type === 'LONG_TEXT') {
                    return (
                      <TextareaField
                        label={label}
                        required={categoryField.is_required}
                        value={String(field.value ?? '')}
                        onChange={field.onChange}
                        helpText={categoryField.help_text || undefined}
                        error={fieldState.error?.message}
                      />
                    );
                  }

                  return (
                    <TextField
                      label={label}
                      required={categoryField.is_required}
                      type={categoryField.field_type === 'DATE'
                        ? 'date'
                        : categoryField.field_type === 'NUMBER' ? 'number' : 'text'}
                      value={String(field.value ?? '')}
                      onChange={field.onChange}
                      helpText={categoryField.help_text || undefined}
                      error={fieldState.error?.message}
                    />
                  );
                }}
              />
            </GridItem>
          );
        })}
      </Grid>
    </>
  );
};
