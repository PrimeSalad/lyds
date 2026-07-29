import { useEffect, useMemo, useState } from 'react';
import { Box, Button, Card, Grid, GridItem, HStack, Spinner, Text, VStack } from '@chakra-ui/react';
import { Controller, useForm, type Control, type FieldValues } from 'react-hook-form';
import { LuArrowLeft, LuSave, LuShieldCheck } from 'react-icons/lu';
import { useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router';
import { type RootState } from '../../../../redux/store';
import { ConfirmDialog } from '../../../../shared/components/ConfirmDialog';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { SectionHeader } from '../../../../shared/components/SectionHeader';
import { SelectField, TextareaField, TextField } from '../../../../shared/forms/FormFields';
import { showToast } from '../../../../shared/toast';
import { barangayApi, type Barangay } from '../../../barangays/infrastructure/barangay-api';
import {
  availableCategoryYears,
  categoriesForRegistry,
  categoriesForYear,
  preferredCategoryYear,
} from '../../../categories/domain/category-scope';
import { CategoryCustomFields } from '../../../categories/presentation/components/CategoryCustomFields';
import { categoryApi, type Category, type CategoryField } from '../../../categories/infrastructure/category-api';
import { DashboardLayout } from '../../../dashboard/presentation/pages/DashboardPage';
import {
  childLaborerApi,
  type ChildLaborerGender,
  type ChildLaborerStatus,
  type CreateChildLaborerInput,
  type UpdateChildLaborerInput,
} from '../../infrastructure/child-laborer-api';

const currentYear = new Date().getFullYear();
const workflowOptions: Array<{ value: ChildLaborerStatus; label: string }> = [
  { value: 'IDENTIFIED', label: 'Identified — newly recorded' },
  { value: 'VALIDATED', label: 'Validated — details confirmed' },
  { value: 'REFERRED', label: 'Referred — linked to support' },
  { value: 'MONITORED', label: 'Monitored — follow-up ongoing' },
  { value: 'CLOSED', label: 'Closed — monitoring completed' },
];

type ChildLaborerFormValues = {
  category_id: string;
  filing_year: string;
  barangay_id: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  birth_date: string;
  gender: ChildLaborerGender;
  attending_school: 'YES' | 'NO';
  highest_grade_completed: string;
  nature_of_work: string;
  father_name: string;
  mother_name: string;
  guardian_name: string;
  parent_guardian_occupation: string;
  record_status: Exclude<ChildLaborerStatus, 'ARCHIVED'>;
  remarks: string;
  custom_values: Record<string, unknown>;
};

const defaultValues: ChildLaborerFormValues = {
  category_id: '',
  filing_year: String(currentYear),
  barangay_id: '',
  first_name: '',
  middle_name: '',
  last_name: '',
  birth_date: '',
  gender: 'NOT_SPECIFIED',
  attending_school: 'YES',
  highest_grade_completed: '',
  nature_of_work: '',
  father_name: '',
  mother_name: '',
  guardian_name: '',
  parent_guardian_occupation: '',
  record_status: 'IDENTIFIED',
  remarks: '',
  custom_values: {},
};

const ChildLaborerFormPage = () => {
  const navigate = useNavigate();
  const { recordId } = useParams();
  const isEditing = Boolean(recordId);
  const profile = useSelector((state: RootState) => state.auth.profile);
  const isAdmin = profile?.role === 'ADMIN';
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryFields, setCategoryFields] = useState<CategoryField[]>([]);
  const [barangays, setBarangays] = useState<Barangay[]>([]);
  const [recordVersion, setRecordVersion] = useState(1);
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [discardOpen, setDiscardOpen] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    reset,
    setError,
    setValue,
    formState: { isDirty },
  } = useForm<ChildLaborerFormValues>({ defaultValues });

  const filingYear = Number(watch('filing_year'));
  const selectedCategoryId = watch('category_id');
  const birthDate = watch('birth_date');
  const recordStatus = watch('record_status');
  const selectableCategories = useMemo(
    () => categories.filter((category) => category.status === 'PUBLISHED' || category.id === selectedCategoryId),
    [categories, selectedCategoryId],
  );
  const categoryYears = useMemo(() => availableCategoryYears(selectableCategories), [selectableCategories]);
  const yearCategories = useMemo(
    () => categoriesForYear(selectableCategories, Number.isInteger(filingYear) ? filingYear : null),
    [filingYear, selectableCategories],
  );
  const age = useMemo(() => {
    const birthYear = Number(birthDate.slice(0, 4));
    return Number.isInteger(birthYear) && Number.isInteger(filingYear)
      ? Math.max(0, filingYear - birthYear)
      : null;
  }, [birthDate, filingYear]);

  useEffect(() => {
    if (!selectedCategoryId) {
      setCategoryFields([]);
      return;
    }

    void categoryApi.getById(selectedCategoryId)
      .then((response) => {
        if (response.data.record_type !== 'CHILD_LABORER') {
          throw new Error('The selected category does not belong to Child Laborer Records.');
        }
        setCategoryFields(response.data.fields);
        setValue('filing_year', String(response.data.filing_year), { shouldDirty: false });
      })
      .catch(() => {
        setCategoryFields([]);
        showToast.error('Could not load category fields');
      });
  }, [selectedCategoryId, setValue]);

  useEffect(() => {
    const load = async () => {
      try {
        const [barangayData, categoryResult, recordResult] = await Promise.all([
          isAdmin ? barangayApi.list() : Promise.resolve([]),
          categoryApi.list('CHILD_LABORER'),
          recordId ? childLaborerApi.get(recordId) : Promise.resolve(null),
        ]);
        setBarangays(barangayData);
        const categoryData: Category[] = categoriesForRegistry(categoryResult.data, 'CHILD_LABORER');
        if (recordResult && !categoryData.some((category) => category.id === recordResult.data.category_id)) {
          const recordCategory = await categoryApi.getById(recordResult.data.category_id);
          if (recordCategory.data.record_type === 'CHILD_LABORER') categoryData.push(recordCategory.data);
        }
        const availableCategories = categoryData
          .filter((category) => category.status === 'PUBLISHED')
          .sort((left, right) => right.filing_year - left.filing_year || left.name.localeCompare(right.name));
        setCategories(categoryData);
        if (recordResult) {
          const record = recordResult.data;
          setRecordVersion(record.version);
          reset({
            category_id: record.category_id,
            filing_year: String(record.filing_year),
            barangay_id: record.barangay_id,
            first_name: record.first_name,
            middle_name: record.middle_name ?? '',
            last_name: record.last_name,
            birth_date: record.birth_date,
            gender: record.gender,
            attending_school: record.attending_school ? 'YES' : 'NO',
            highest_grade_completed: record.highest_grade_completed ?? '',
            nature_of_work: record.nature_of_work,
            father_name: record.father_name ?? '',
            mother_name: record.mother_name ?? '',
            guardian_name: record.guardian_name ?? '',
            parent_guardian_occupation: record.parent_guardian_occupation ?? '',
            record_status: record.record_status === 'ARCHIVED' ? 'IDENTIFIED' : record.record_status,
            remarks: record.remarks ?? '',
            custom_values: record.custom_values ?? {},
          });
        } else if (availableCategories[0]) {
          const preferredYear = preferredCategoryYear(availableCategories);
          const preferredCategory = categoriesForYear(availableCategories, preferredYear)[0] ?? availableCategories[0];
          reset({
            ...defaultValues,
            category_id: preferredCategory.id,
            filing_year: String(preferredCategory.filing_year),
          });
        }
      } catch (error) {
        setServerError(error instanceof Error ? error.message : 'Could not load this record.');
      } finally {
        setFetching(false);
      }
    };
    void load();
  }, [isAdmin, recordId, reset]);

  const goBack = () => {
    if (isDirty) setDiscardOpen(true);
    else navigate('/child-laborers');
  };

  const submit = async (values: ChildLaborerFormValues) => {
    if (!values.father_name.trim() && !values.mother_name.trim() && !values.guardian_name.trim()) {
      setError('guardian_name', { message: 'Enter at least one parent or guardian name.' });
      return;
    }

    if (values.record_status === 'VALIDATED' && !values.remarks.trim()) {
      setError('remarks', { message: 'Add validation remarks before marking this record as validated.' });
      return;
    }

    setSaving(true);
    setServerError(null);
    const input: CreateChildLaborerInput = {
      category_id: values.category_id,
      filing_year: Number(values.filing_year),
      ...(isAdmin ? { barangay_id: values.barangay_id } : {}),
      first_name: values.first_name.trim(),
      middle_name: values.middle_name.trim(),
      last_name: values.last_name.trim(),
      birth_date: values.birth_date,
      gender: values.gender,
      attending_school: values.attending_school === 'YES',
      highest_grade_completed: values.highest_grade_completed.trim(),
      nature_of_work: values.nature_of_work.trim(),
      father_name: values.father_name.trim(),
      mother_name: values.mother_name.trim(),
      guardian_name: values.guardian_name.trim(),
      parent_guardian_occupation: values.parent_guardian_occupation.trim(),
      record_status: values.record_status,
      remarks: values.remarks.trim(),
      custom_values: Object.fromEntries(Object.entries(values.custom_values).filter(([, value]) => (
        value !== '' && value !== null && value !== undefined
      ))),
    };

    try {
      if (recordId) {
        await childLaborerApi.update(recordId, { ...input, version: recordVersion } as UpdateChildLaborerInput);
        showToast.success('Child laborer record updated');
      } else {
        await childLaborerApi.create(input);
        showToast.success('Child laborer record added');
      }
      navigate('/child-laborers');
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'The record could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  if (fetching) {
    return (
      <DashboardLayout>
        <VStack py={16} gap={3} role="status"><Spinner color="primary.600" /><Text>Loading record...</Text></VStack>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader
        title={isEditing ? 'Edit Child Laborer Record' : 'Add Child Laborer Record'}
        description="Record the annual consolidation details used for protected monitoring and reporting."
        actions={(
          <Button minH="44px" variant="outline" onClick={goBack}>
            <LuArrowLeft aria-hidden="true" /> Back to List
          </Button>
        )}
      />

      {serverError && (
        <Box role="alert" mb={5} p={4} borderRadius="lg" borderWidth="1px" borderColor="red.200" bg="red.50" color="red.800">
          <Text fontWeight="700">Could not save the record</Text>
          <Text fontSize="sm" mt={1}>{serverError}</Text>
        </Box>
      )}

      <form noValidate onSubmit={handleSubmit(submit)}>
        <Card.Root borderColor="border" borderRadius="lg" boxShadow="panel">
          <Card.Body p={{ base: 4, md: 6 }}>
          <SectionHeader mt={0}>Annual record scope</SectionHeader>
          <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', xl: 'repeat(4, 1fr)' }} gap={5}>
            <Controller
              name="filing_year"
              control={control}
              rules={{ required: 'Filing year is required.' }}
              render={({ field, fieldState }) => (
                <SelectField
                  {...field}
                  label="Filing Year"
                  required
                  placeholder="Select filing year"
                  options={categoryYears.map((year) => ({ value: String(year), label: String(year) }))}
                  error={fieldState.error?.message}
                  helpText="Only years with Child Laborer categories are available."
                  onChange={(value) => {
                    field.onChange(value);
                    const nextYear = Number(value);
                    const selectedCategory = categories.find((category) => category.id === selectedCategoryId);
                    if (!selectedCategory || selectedCategory.filing_year !== nextYear) {
                      setValue('category_id', '', { shouldDirty: true, shouldValidate: true });
                    }
                  }}
                />
              )}
            />
            <Controller
              name="category_id"
              control={control}
              rules={{ required: 'Category is required.' }}
              render={({ field, fieldState }) => (
                <SelectField
                  {...field}
                  label="Child Laborer Category"
                  required
                  placeholder={filingYear ? 'Select child laborer category' : 'Select a filing year first'}
                  options={yearCategories.map((category) => ({ value: category.id, label: category.name }))}
                  error={fieldState.error?.message}
                  disabled={!filingYear}
                  helpText={filingYear ? `Showing Child Laborer categories for ${filingYear} only.` : undefined}
                />
              )}
            />
            {isAdmin ? (
              <Controller
                name="barangay_id"
                control={control}
                rules={{ required: 'Barangay is required.' }}
                render={({ field, fieldState }) => (
                  <SelectField
                    {...field}
                    label="Barangay"
                    required
                    placeholder="Select barangay"
                    options={barangays.filter((item) => item.is_active).map((item) => ({ value: item.id, label: item.name }))}
                    error={fieldState.error?.message}
                  />
                )}
              />
            ) : (
              <TextField label="Barangay" value="Assigned barangay" onChange={() => undefined} readOnly />
            )}
            <TextField
              label="Age at Year End"
              value={age ?? ''}
              onChange={() => undefined}
              readOnly
              helpText={`Calculated as of December 31, ${filingYear || currentYear}.`}
            />
          </Grid>

          <SectionHeader>Child information</SectionHeader>
          <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={5}>
            <Controller name="last_name" control={control} rules={{ required: 'Surname is required.' }} render={({ field, fieldState }) => (
              <TextField {...field} label="Surname" required autoComplete="family-name" error={fieldState.error?.message} />
            )} />
            <Controller name="first_name" control={control} rules={{ required: 'First name is required.' }} render={({ field, fieldState }) => (
              <TextField {...field} label="First Name" required autoComplete="given-name" error={fieldState.error?.message} />
            )} />
            <Controller name="middle_name" control={control} render={({ field, fieldState }) => (
              <TextField {...field} label="Middle Name" autoComplete="additional-name" error={fieldState.error?.message} />
            )} />
            <Controller name="birth_date" control={control} rules={{ required: 'Date of birth is required.' }} render={({ field, fieldState }) => (
              <TextField {...field} label="Date of Birth" type="date" required max={`${filingYear}-12-31`} error={fieldState.error?.message} />
            )} />
            <Controller name="gender" control={control} render={({ field, fieldState }) => (
              <SelectField
                {...field}
                label="Gender"
                required
                options={[
                  { value: 'FEMALE', label: 'Female' },
                  { value: 'MALE', label: 'Male' },
                  { value: 'NOT_SPECIFIED', label: 'Not specified' },
                ]}
                error={fieldState.error?.message}
              />
            )} />
          </Grid>

          <SectionHeader>Education and work</SectionHeader>
          <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={5}>
            <Controller name="attending_school" control={control} render={({ field, fieldState }) => (
              <SelectField {...field} label="Attending School" required options={[{ value: 'YES', label: 'Yes' }, { value: 'NO', label: 'No' }]} error={fieldState.error?.message} />
            )} />
            <Controller name="highest_grade_completed" control={control} render={({ field, fieldState }) => (
              <TextField {...field} label="Highest Grade Completed" placeholder="Example: Grade 8" error={fieldState.error?.message} />
            )} />
            <GridItem colSpan={{ base: 1, md: 2 }}>
              <Controller name="nature_of_work" control={control} rules={{ required: 'Nature of work is required.' }} render={({ field, fieldState }) => (
                <TextField {...field} label="Nature of Work" required placeholder="Describe the work performed" error={fieldState.error?.message} />
              )} />
            </GridItem>
          </Grid>

          <SectionHeader>Parent or guardian</SectionHeader>
          <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={5}>
            <Controller name="father_name" control={control} render={({ field, fieldState }) => (
              <TextField {...field} label="Father's Name" error={fieldState.error?.message} />
            )} />
            <Controller name="mother_name" control={control} render={({ field, fieldState }) => (
              <TextField {...field} label="Mother's Name" error={fieldState.error?.message} />
            )} />
            <Controller name="guardian_name" control={control} render={({ field, fieldState }) => (
              <TextField {...field} label="Guardian's Name" helpText="At least one parent or guardian name is required." error={fieldState.error?.message} />
            )} />
            <GridItem colSpan={{ base: 1, md: 3 }}>
              <Controller name="parent_guardian_occupation" control={control} render={({ field, fieldState }) => (
                <TextField {...field} label="Parent/Guardian Occupation" error={fieldState.error?.message} />
              )} />
            </GridItem>
          </Grid>

          <CategoryCustomFields
            fields={categoryFields}
            control={control as unknown as Control<FieldValues>}
          />

          <SectionHeader>Status and remarks</SectionHeader>
          <Grid templateColumns={{ base: '1fr', md: 'minmax(260px, 1fr) 2fr' }} gap={5}>
            <Controller name="record_status" control={control} render={({ field, fieldState }) => (
              <SelectField {...field} label="Record Status" required options={workflowOptions} error={fieldState.error?.message} />
            )} />
            <Controller name="remarks" control={control} rules={{
              validate: (value) => recordStatus !== 'VALIDATED'
                || Boolean(value.trim())
                || 'Add validation remarks before marking this record as validated.',
            }} render={({ field, fieldState }) => (
              <TextareaField
                {...field}
                label="Remarks"
                rows={4}
                required={recordStatus === 'VALIDATED'}
                placeholder={recordStatus === 'VALIDATED'
                  ? 'Describe what was confirmed during validation'
                  : 'Add follow-up context or referral notes'}
                helpText={recordStatus === 'VALIDATED'
                  ? 'Required evidence for validated status.'
                  : 'A record without remarks remains identified and not yet validated.'}
                error={fieldState.error?.message}
              />
            )} />
          </Grid>

          <HStack mt={5} p={4} align="flex-start" gap={3} bg="primary.50" borderRadius="lg" borderWidth="1px" borderColor="primary.100">
            <Box color="primary.700" pt={1}><LuShieldCheck aria-hidden="true" /></Box>
            <Box>
              <Text fontWeight="700" color="primary.800">Protected record</Text>
              <Text fontSize="sm" color="primary.800" mt={1}>
                This information is restricted to administrators and the assigned barangay account, with verified two-factor authentication and audited changes.
              </Text>
            </Box>
          </HStack>
          </Card.Body>
          <Card.Footer p={{ base: 4, md: 6 }} pt={0} justifyContent="flex-end" gap={3} flexDirection={{ base: 'column-reverse', sm: 'row' }}>
            <Button width={{ base: 'full', sm: 'auto' }} minH="44px" type="button" variant="outline" onClick={goBack} disabled={saving}>Cancel</Button>
            <Button width={{ base: 'full', sm: 'auto' }} minH="44px" type="submit" colorPalette="green" loading={saving}>
              <LuSave aria-hidden="true" /> {isEditing ? 'Save Changes' : 'Add Record'}
            </Button>
          </Card.Footer>
        </Card.Root>
      </form>

      <ConfirmDialog
        open={discardOpen}
        onOpenChange={({ open }) => setDiscardOpen(open)}
        title="Discard unsaved changes?"
        description="The information entered on this page will be lost."
        confirmLabel="Discard Changes"
        onConfirm={() => navigate('/child-laborers')}
      />
    </DashboardLayout>
  );
};

export default ChildLaborerFormPage;
