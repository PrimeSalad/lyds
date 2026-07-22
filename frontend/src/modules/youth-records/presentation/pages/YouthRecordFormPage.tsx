import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Alert, Box, Button, Flex, VStack, Grid, GridItem, Spinner, Text } from '@chakra-ui/react';
import { useForm, Controller, type FieldErrors } from 'react-hook-form';
import { LuSave, LuSend, LuX } from 'react-icons/lu';
import { useSelector } from 'react-redux';
import { type RootState } from '../../../../redux/store';
import { TextField, SelectField, CheckboxField, TextareaField } from '../../../../shared/forms/FormFields';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { SectionHeader } from '../../../../shared/components/SectionHeader';
import { showToast } from '../../../../shared/toast';
import { barangayApi, type Barangay } from '../../../barangays/infrastructure/barangay-api';
import { categoryApi, type Category, type CategoryField } from '../../../categories/infrastructure/category-api';
import { referenceDataApi, type ReferenceOption } from '../../../reference-data/infrastructure/reference-data-api';
import { youthRecordApi, type CreateInput } from '../../infrastructure/youth-record-api';
import { DashboardLayout } from '../../../dashboard/presentation/pages/DashboardPage';
import { ConfirmDialog } from '../../../../shared/components/ConfirmDialog';

const computeAge = (birthDate: string): number => {
  if (!birthDate) return 0;
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

const getYouthAgeGroup = (age: number) => {
  if (age >= 15 && age <= 17) return 'Child Youth';
  if (age >= 18 && age <= 24) return 'Core Youth';
  if (age >= 25 && age <= 30) return 'Young Adult';
  return 'Not in youth age range (15-30)';
};

type YouthRecordFormValues = {
  category_id: string;
  barangay_id: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  suffix: string;
  birth_date: string;
  sex_assigned_at_birth_id: string;
  civil_status_id: string;
  youth_classification_id: string;
  email: string;
  contact_number: string;
  educational_attainment_id: string;
  work_status_id: string;
  is_registered_voter: boolean;
  voted_last_election: 'YES' | 'NO' | '';
  attended_kk_assembly: boolean;
  kk_assembly_count: number;
  custom_values: Record<string, unknown>;
};

const toSelectOptions = (options: ReferenceOption[]) =>
  options
    .filter((option) => option.is_active)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((option) => ({ value: option.id, label: option.label }));

const fieldOptionsToSelectOptions = (options: unknown) => {
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
    .filter((option): option is { value: string; label: string } => !!option);
};

const cleanCustomValues = (values: Record<string, unknown> = {}) =>
  Object.fromEntries(
    Object.entries(values).filter(([key, value]) => (
      !isCoreProfileField(key) &&
      value !== '' &&
      value !== null &&
      value !== undefined
    )),
  );

const normalizeFieldIdentity = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

const coreFieldKeys = new Set([
  'category_id',
  'barangay_id',
  'display_name',
  'first_name',
  'middle_name',
  'last_name',
  'suffix',
  'ext_name',
  'birth_date',
  'age_at_submission',
  'sex_assigned_at_birth_id',
  'sex_id',
  'civil_status_id',
  'youth_classification_id',
  'youth_age_group_id',
  'educational_attainment_id',
  'work_status_id',
  'email',
  'contact_number',
  'purok',
  'is_registered_voter',
  'is_registered_sk_voter',
  'is_registered_national_voter',
  'voted_last_election',
  'attended_kk_assembly',
  'kk_assembly_count',
].map(normalizeFieldIdentity));

const coreFieldLabels = new Set([
  'Category',
  'Barangay',
  'Display Name',
  'First Name',
  'Middle Name',
  'Last Name',
  'Suffix',
  'Ext Name',
  'Extension Name',
  'Birth Date',
  'Birthday',
  'Age',
  'Age at Submission',
  'Sex',
  'Sex Assigned at Birth',
  'Civil Status',
  'Youth Classification',
  'Youth Age Group',
  'Highest Educational Attainment',
  'Educational Attainment',
  'Work Status',
  'Email',
  'Email Address',
  'Contact Number',
  'Contact',
  'Mobile Number',
  'Purok',
  'Registered Voter',
  'Registered SK Voter',
  'Registered National Voter',
  'Voted Last Election',
  'Attended KK Assembly',
  'KK Assembly Count',
].map(normalizeFieldIdentity));

const isCoreProfileField = (value: string) => coreFieldKeys.has(normalizeFieldIdentity(value));

const isCoreCategoryField = (field: CategoryField) =>
  field.is_active === false ||
  isCoreProfileField(field.field_key) ||
  coreFieldLabels.has(normalizeFieldIdentity(field.label));

const YouthRecordFormPage = () => {
  const navigate = useNavigate();
  const { recordId } = useParams();
  const isEditing = !!recordId;
  const profile = useSelector((state: RootState) => state.auth.profile);
  const isAdmin = profile?.role === 'ADMIN';

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEditing);
  const [formOptionsLoading, setFormOptionsLoading] = useState(true);
  const [formOptionsError, setFormOptionsError] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [pendingSubmitData, setPendingSubmitData] = useState<YouthRecordFormValues | null>(null);
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [barangays, setBarangays] = useState<Barangay[]>([]);
  const [sexOptions, setSexOptions] = useState<{ value: string; label: string }[]>([]);
  const [civilStatusOptions, setCivilStatusOptions] = useState<{ value: string; label: string }[]>([]);
  const [youthClassificationOptions, setYouthClassificationOptions] = useState<{ value: string; label: string }[]>([]);
  const [educationalAttainmentOptions, setEducationalAttainmentOptions] = useState<{ value: string; label: string }[]>([]);
  const [workStatusOptions, setWorkStatusOptions] = useState<{ value: string; label: string }[]>([]);
  const [categoryFields, setCategoryFields] = useState<CategoryField[]>([]);
  const [recordVersion, setRecordVersion] = useState<number | null>(null);
  const submissionAlertRef = useRef<HTMLDivElement | null>(null);
  
  const { control, handleSubmit, watch, reset, setValue, formState: { isDirty } } = useForm<YouthRecordFormValues>({
    defaultValues: {
      category_id: '',
      barangay_id: '',
      first_name: '', middle_name: '', last_name: '', suffix: '',
      birth_date: '',
      sex_assigned_at_birth_id: '', civil_status_id: '', youth_classification_id: '',
      email: '', contact_number: '',
      educational_attainment_id: '', work_status_id: '',
      is_registered_voter: false, voted_last_election: 'NO',
      attended_kk_assembly: false, kk_assembly_count: 0,
      custom_values: {},
    }
  });

  const selectedCategoryId = watch('category_id');
  const birthDate = watch('birth_date');
  const age = useMemo(() => computeAge(birthDate), [birthDate]);
  const ageGroup = useMemo(() => getYouthAgeGroup(age), [age]);

  const isRegisteredVoter = watch('is_registered_voter');
  const attendedKkAssembly = watch('attended_kk_assembly');
  const customCategoryFields = useMemo(
    () => categoryFields.filter((customField) => !isCoreCategoryField(customField)),
    [categoryFields],
  );

  useEffect(() => {
    if (!submissionError || pendingSubmitData) return;
    window.requestAnimationFrame(() => {
      submissionAlertRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      submissionAlertRef.current?.focus({ preventScroll: true });
    });
  }, [submissionError, pendingSubmitData]);

  useEffect(() => {
    const loadCategoryFields = async () => {
      if (!selectedCategoryId) {
        setCategoryFields([]);
        return;
      }

      try {
        const res = await categoryApi.getById(selectedCategoryId);
        setCategoryFields([...res.data.fields].sort((a, b) => a.sort_order - b.sort_order));
      } catch {
        setCategoryFields([]);
        showToast.error('Failed to load category fields');
      }
    };

    loadCategoryFields();
  }, [selectedCategoryId]);

  useEffect(() => {
    const loadFormOptions = async () => {
      setFormOptionsLoading(true);
      setFormOptionsError(null);
      try {
        const [
          categoryRes,
          barangayRes,
          sexRes,
          civilStatusRes,
          youthClassificationRes,
          educationalAttainmentRes,
          workStatusRes,
        ] = await Promise.all([
          categoryApi.list(),
          isAdmin ? barangayApi.list() : Promise.resolve([]),
          referenceDataApi.listOptions('SEX_ASSIGNED_AT_BIRTH'),
          referenceDataApi.listOptions('CIVIL_STATUS'),
          referenceDataApi.listOptions('YOUTH_CLASSIFICATION'),
          referenceDataApi.listOptions('EDUCATIONAL_ATTAINMENT'),
          referenceDataApi.listOptions('WORK_STATUS'),
        ]);

        setCategories(categoryRes.data.filter((category) => category.status === 'PUBLISHED' && category.permission_mode !== 'ADMIN_ONLY'));
        setBarangays(barangayRes.filter((barangay) => barangay.is_active));
        setSexOptions(toSelectOptions(sexRes.data));
        setCivilStatusOptions(toSelectOptions(civilStatusRes.data));
        setYouthClassificationOptions(toSelectOptions(youthClassificationRes.data));
        setEducationalAttainmentOptions(toSelectOptions(educationalAttainmentRes.data));
        setWorkStatusOptions(toSelectOptions(workStatusRes.data));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load form options';
        setFormOptionsError(message);
        showToast.error({ title: 'Could not load form options', description: message });
      } finally {
        setFormOptionsLoading(false);
      }
    };

    loadFormOptions();
  }, [isAdmin]);

  useEffect(() => {
    if (recordId) {
      youthRecordApi.getById(recordId)
        .then((res) => {
          setRecordVersion(res.data.version);
          reset({
            category_id: res.data.category_id,
            barangay_id: res.data.barangay_id,
            first_name: res.data.first_name ?? '',
            middle_name: res.data.middle_name ?? '',
            last_name: res.data.last_name ?? '',
            suffix: res.data.suffix ?? '',
            birth_date: res.data.birth_date,
            sex_assigned_at_birth_id: res.data.sex_assigned_at_birth_id ?? '',
            civil_status_id: res.data.civil_status_id ?? '',
            youth_classification_id: res.data.youth_classification_id ?? '',
            email: res.data.email ?? '',
            contact_number: res.data.contact_number ?? '',
            educational_attainment_id: res.data.educational_attainment_id ?? '',
            work_status_id: res.data.work_status_id ?? '',
            is_registered_voter: !!res.data.is_registered_voter,
            voted_last_election: res.data.voted_last_election ? 'YES' : 'NO',
            attended_kk_assembly: !!res.data.attended_kk_assembly,
            kk_assembly_count: res.data.kk_assembly_count ?? 0,
            custom_values: res.data.custom_values ?? {},
          });
        })
        .catch(() => {
          showToast.error('Failed to load record');
          navigate('/youth-records');
        })
        .finally(() => setFetching(false));
    }
  }, [recordId, reset, navigate]);

  const toPayload = (data: YouthRecordFormValues): CreateInput => ({
    category_id: data.category_id,
    barangay_id: isAdmin ? data.barangay_id : undefined,
    first_name: data.first_name.trim(),
    middle_name: data.middle_name.trim() || undefined,
    last_name: data.last_name.trim(),
    suffix: data.suffix.trim() || undefined,
    birth_date: data.birth_date,
    sex_assigned_at_birth_id: data.sex_assigned_at_birth_id,
    civil_status_id: data.civil_status_id,
    youth_classification_id: data.youth_classification_id,
    email: data.email.trim() || undefined,
    contact_number: data.contact_number.trim() || undefined,
    educational_attainment_id: data.educational_attainment_id,
    work_status_id: data.work_status_id,
    is_registered_voter: data.is_registered_voter,
    voted_last_election: data.voted_last_election === 'YES',
    attended_kk_assembly: data.attended_kk_assembly,
    kk_assembly_count: data.attended_kk_assembly ? Number(data.kk_assembly_count) || 0 : 0,
    custom_values: cleanCustomValues(data.custom_values),
  });

  const renderCustomField = (customField: CategoryField) => {
    const fieldName = `custom_values.${customField.field_key}`;
    const label = `${customField.label}${customField.is_required ? '*' : ''}`;
    const rules = customField.is_required ? { required: `${customField.label} is required` } : undefined;
    const options = fieldOptionsToSelectOptions(customField.options);

    if (customField.field_type === 'YES_NO' || customField.field_type === 'BOOLEAN') {
      return (
        <Controller
          key={customField.id}
          name={fieldName as any}
          control={control as any}
          render={({ field, fieldState }) => (
            <CheckboxField
              label={label}
              checked={!!field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
      );
    }

    if ((customField.field_type === 'SINGLE_SELECT' || customField.field_type === 'SELECT') && options.length > 0) {
      return (
        <Controller
          key={customField.id}
          name={fieldName as any}
          control={control as any}
          rules={rules}
          render={({ field, fieldState }) => (
            <SelectField
              label={label}
              placeholder="Select option"
              options={options}
              error={fieldState.error?.message}
              {...field}
            />
          )}
        />
      );
    }

    if (customField.field_type === 'LONG_TEXT') {
      return (
        <Controller
          key={customField.id}
          name={fieldName as any}
          control={control as any}
          rules={rules}
          render={({ field, fieldState }) => (
            <TextareaField
              label={label}
              value={String(field.value ?? '')}
              onChange={field.onChange}
              error={fieldState.error?.message}
              placeholder={customField.help_text || undefined}
            />
          )}
        />
      );
    }

    return (
      <Controller
        key={customField.id}
        name={fieldName as any}
        control={control as any}
        rules={rules}
        render={({ field, fieldState }) => (
          <TextField
            label={label}
            type={customField.field_type === 'DATE' ? 'date' : customField.field_type === 'NUMBER' ? 'number' : 'text'}
            value={String(field.value ?? '')}
            onChange={field.onChange}
            error={fieldState.error?.message}
            placeholder={customField.help_text || undefined}
          />
        )}
      />
    );
  };

  const onSubmit = async (data: YouthRecordFormValues, isDraft = false) => {
    setLoading(true);
    setSubmissionError(null);
    try {
      const payload = toPayload(data);
      if (isEditing) {
        if (recordVersion === null) throw new Error('Record version is missing. Refresh and try again.');
        await youthRecordApi.update(recordId!, {
          ...payload,
          version: recordVersion,
          submit_on_update: !isDraft,
        });
        showToast.success(isDraft ? 'Draft updated' : 'Record updated and submitted');
      } else {
        await youthRecordApi.create({ ...payload, submit_on_create: !isDraft });
        showToast.success(isDraft ? 'Draft saved' : 'Record saved and submitted');
      }
      navigate('/youth-records');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save record';
      setSubmissionError(message);
      showToast.error({ title: isDraft ? 'Draft was not saved' : 'Record was not submitted', description: message });
      if (!isDraft) throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleInvalid = (errors: FieldErrors<YouthRecordFormValues>) => {
    const errorCount = Object.keys(errors).length;
    const message = errorCount === 1
      ? 'Review the highlighted field before continuing.'
      : `Review the ${errorCount} highlighted fields before continuing.`;
    setSubmissionError(message);
    showToast.warning({ title: 'Some information is missing', description: message });
  };

  const requestSubmit = handleSubmit(
    (data) => {
      setSubmissionError(null);
      setPendingSubmitData(data);
    },
    handleInvalid,
  );

  const handleCancel = () => {
    if (isDirty) {
      setDiscardDialogOpen(true);
      return;
    }
    navigate('/youth-records');
  };

  if (fetching) {
    return (
      <DashboardLayout>
        <Box py={10} textAlign="center">
          <Spinner size="lg" color="primary.600" />
        </Box>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader
        title={isEditing ? 'Edit Youth Record' : 'Add Youth Record'}
        description="Capture required KK profile details before submission."
        actions={(
          <Button type="button" variant="outline" colorPalette="gray" onClick={handleSubmit((d) => onSubmit(d, true), handleInvalid)} loading={loading} disabled={formOptionsLoading}>
            <LuSave />
            Save Draft
          </Button>
        )}
      />

      <Box
        as="form"
        onSubmit={requestSubmit}
        maxW="960px"
        bg="white"
        p={{ base: 4, md: 6, lg: 8 }}
        borderRadius="md"
        border="1px solid"
        borderColor="border"
        boxShadow="panel"
      >
        {formOptionsError && (
          <Alert.Root status="error" mb={6} borderRadius="md">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Form options could not be loaded</Alert.Title>
              <Alert.Description>{formOptionsError}. Refresh the page before submitting.</Alert.Description>
            </Alert.Content>
          </Alert.Root>
        )}
        {submissionError && (
          <Alert.Root ref={submissionAlertRef} status="error" mb={6} borderRadius="md" role="alert" tabIndex={-1} scrollMarginTop="96px" bg="danger.light" borderWidth="1px" borderColor="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Check the record details</Alert.Title>
              <Alert.Description>{submissionError}</Alert.Description>
            </Alert.Content>
          </Alert.Root>
        )}

        <SectionHeader mt={0}>Record Setup</SectionHeader>
        <Grid templateColumns={{ base: '1fr', md: isAdmin ? 'repeat(2, 1fr)' : '1fr' }} gap={4}>
          {isAdmin && (
            <GridItem>
              <Controller name="barangay_id" control={control} rules={{ required: 'Select a barangay' }} render={({ field, fieldState }) => (
                <SelectField
                  label="Barangay*"
                  placeholder="Select barangay"
                  options={barangays.map((barangay) => ({ value: barangay.id, label: barangay.name }))}
                  error={fieldState.error?.message}
                  disabled={formOptionsLoading}
                  helpText={formOptionsLoading ? 'Loading barangays...' : undefined}
                  {...field}
                />
              )} />
            </GridItem>
          )}
          <GridItem>
            <Controller name="category_id" control={control} rules={{ required: 'Select a category' }} render={({ field, fieldState }) => (
              <SelectField
                label="Category*"
                placeholder="Select category"
                options={categories.map((category) => ({ value: category.id, label: category.name }))}
                error={fieldState.error?.message}
                disabled={formOptionsLoading}
                helpText={formOptionsLoading ? 'Loading record categories...' : undefined}
                {...field}
              />
            )} />
          </GridItem>
        </Grid>
        
        <SectionHeader>Personal Information</SectionHeader>
        <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={4}>
          <GridItem>
            <Controller name="first_name" control={control} rules={{ required: 'First name is required' }} render={({ field, fieldState }) => (
              <TextField label="First Name*" error={fieldState.error?.message} {...field} />
            )} />
          </GridItem>
          <GridItem>
            <Controller name="middle_name" control={control} render={({ field }) => (
              <TextField label="Middle Name" {...field} />
            )} />
          </GridItem>
          <GridItem>
            <Controller name="last_name" control={control} rules={{ required: 'Last name is required' }} render={({ field, fieldState }) => (
              <TextField label="Last Name*" error={fieldState.error?.message} {...field} />
            )} />
          </GridItem>
          <GridItem>
            <Controller name="suffix" control={control} render={({ field }) => (
              <TextField label="Suffix" placeholder="e.g. Jr., III" {...field} />
            )} />
          </GridItem>
        </Grid>

        <SectionHeader>Birthday & Age</SectionHeader>
        <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={4}>
          <GridItem>
            <Controller name="birth_date" control={control} rules={{
              required: 'Birth date is required',
              validate: (value) => {
                const recordAge = computeAge(value);
                return (recordAge >= 15 && recordAge <= 30) || 'Youth records must be for ages 15 to 30';
              },
            }} render={({ field, fieldState }) => (
              <TextField type="date" label="Birth Date*" error={fieldState.error?.message} {...field} />
            )} />
          </GridItem>
          <GridItem>
            <TextField label="Age" value={birthDate ? String(age) : ''} onChange={() => {}} readOnly helpText="Calculated from the birth date" />
          </GridItem>
        </Grid>

        <SectionHeader>Youth Classification</SectionHeader>
        <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={4}>
          <GridItem>
            <Controller name="sex_assigned_at_birth_id" control={control} rules={{ required: 'Select sex assigned at birth' }} render={({ field, fieldState }) => (
              <SelectField label="Sex Assigned at Birth*" placeholder="Select sex assigned at birth" options={sexOptions} error={fieldState.error?.message} {...field} />
            )} />
          </GridItem>
          <GridItem>
            <Controller name="civil_status_id" control={control} rules={{ required: 'Select civil status' }} render={({ field, fieldState }) => (
              <SelectField label="Civil Status*" placeholder="Select civil status" options={civilStatusOptions} error={fieldState.error?.message} {...field} />
            )} />
          </GridItem>
          <GridItem>
            <Controller name="youth_classification_id" control={control} rules={{ required: 'Select youth classification' }} render={({ field, fieldState }) => (
              <SelectField label="Youth Classification*" placeholder="Select youth classification" options={youthClassificationOptions} error={fieldState.error?.message} {...field} />
            )} />
          </GridItem>
          <GridItem>
            <TextField label="Youth Age Group" value={birthDate ? ageGroup : ''} onChange={() => {}} readOnly />
          </GridItem>
        </Grid>

        <SectionHeader>Contact Information</SectionHeader>
        <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={4}>
          <GridItem>
            <Controller name="email" control={control} rules={{
              pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email address' },
            }} render={({ field, fieldState }) => (
              <TextField label="Email" type="email" autoComplete="email" error={fieldState.error?.message} {...field} />
            )} />
          </GridItem>
          <GridItem>
            <Controller name="contact_number" control={control} rules={{
              pattern: { value: /^(09|\+639)\d{9}$/, message: 'Use a valid Philippine mobile number' },
            }} render={({ field, fieldState }) => (
              <TextField label="Contact Number" type="tel" autoComplete="tel" placeholder="09XXXXXXXXX" error={fieldState.error?.message} {...field} />
            )} />
          </GridItem>
        </Grid>

        <SectionHeader>Education & Employment</SectionHeader>
        <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={4}>
          <GridItem>
            <Controller name="educational_attainment_id" control={control} rules={{ required: 'Select educational attainment' }} render={({ field, fieldState }) => (
              <SelectField label="Highest Educational Attainment*" placeholder="Select educational attainment" options={educationalAttainmentOptions} error={fieldState.error?.message} {...field} />
            )} />
          </GridItem>
          <GridItem>
            <Controller name="work_status_id" control={control} rules={{ required: 'Select work status' }} render={({ field, fieldState }) => (
              <SelectField label="Work Status*" placeholder="Select work status" options={workStatusOptions} error={fieldState.error?.message} {...field} />
            )} />
          </GridItem>
        </Grid>

        {customCategoryFields.length > 0 && (
          <>
            <SectionHeader>Category Fields</SectionHeader>
            <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={4}>
              {customCategoryFields.map((customField) => (
                <GridItem key={customField.id}>
                  {renderCustomField(customField)}
                </GridItem>
              ))}
            </Grid>
          </>
        )}

        <SectionHeader>Voter Participation</SectionHeader>
        <VStack align="start" gap={4}>
          <Controller name="is_registered_voter" control={control} render={({ field }) => (
            <CheckboxField label="Registered Voter?" checked={!!field.value} onChange={(checked) => { field.onChange(checked); if (!checked) setValue('voted_last_election', 'NO'); }} />
          )} />
          
          <Controller name="voted_last_election" control={control} rules={{ required: 'Required' }} render={({ field, fieldState }) => (
            <SelectField 
              label="Voted Last Election?*" 
              placeholder="Select answer"
              options={[
                { value: 'YES', label: 'Yes' },
                { value: 'NO', label: 'No' },
              ]} 
              error={fieldState.error?.message} 
              disabled={!isRegisteredVoter}
              {...field} 
            />
          )} />
        </VStack>

        <SectionHeader>KK Assembly Attendance</SectionHeader>
        <VStack align="start" gap={4}>
          <Controller name="attended_kk_assembly" control={control} render={({ field }) => (
            <CheckboxField label="Attended KK Assembly?" checked={!!field.value} onChange={(checked) => { field.onChange(checked); if (!checked) setValue('kk_assembly_count', 0); }} />
          )} />
          {attendedKkAssembly && (
            <Controller name="kk_assembly_count" control={control} rules={{ min: 1 }} render={({ field, fieldState }) => (
              <TextField type="number" min={1} label="How Many Times?*" error={fieldState.error?.message} value={String(field.value)} onChange={(val) => field.onChange(Number(val))} />
            )} />
          )}
        </VStack>

        <Flex
          gap={3}
          mt={8}
          pt={4}
          borderTop="1px solid"
          borderColor="border"
          direction={{ base: 'column', sm: 'row' }}
          align={{ base: 'stretch', sm: 'center' }}
        >
          <Button type="submit" colorPalette="green" loading={loading} disabled={formOptionsLoading || !!formOptionsError} minH="48px">
            <LuSend />
            Save & Submit
          </Button>
          <Button type="button" variant="outline" onClick={handleCancel} disabled={loading} minH="48px">
            <LuX />
            Cancel
          </Button>
          <Text fontSize="sm" color="text.muted" ml={{ sm: 'auto' }}>
            Required fields are marked with *
          </Text>
        </Flex>

      </Box>

      <ConfirmDialog
        open={!!pendingSubmitData}
        onOpenChange={({ open }) => { if (!open) setPendingSubmitData(null); }}
        title="Submit this youth record?"
        description={`This will send ${pendingSubmitData?.first_name || 'the record'} ${pendingSubmitData?.last_name || ''} for review. Confirm that the details are complete and accurate.`}
        confirmLabel="Save & Submit"
        onConfirm={() => pendingSubmitData ? onSubmit(pendingSubmitData, false) : undefined}
      />
      <ConfirmDialog
        open={discardDialogOpen}
        onOpenChange={({ open }) => setDiscardDialogOpen(open)}
        title="Discard unsaved changes?"
        description="Changes made on this page have not been saved and cannot be recovered."
        confirmLabel="Discard Changes"
        variant="danger"
        onConfirm={() => navigate('/youth-records')}
      />
    </DashboardLayout>
  );
};

export default YouthRecordFormPage;
