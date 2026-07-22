import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Box, Button, HStack, VStack, Grid, GridItem, Spinner } from '@chakra-ui/react';
import { useForm, Controller } from 'react-hook-form';
import { TextField, SelectField, CheckboxField } from '../../../../shared/forms/FormFields';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { SectionHeader } from '../../../../shared/components/SectionHeader';
import { showToast } from '../../../../shared/toast';
import { categoryApi, type Category } from '../../../categories/infrastructure/category-api';
import { referenceDataApi, type ReferenceOption } from '../../../reference-data/infrastructure/reference-data-api';
import { youthRecordApi, type CreateInput } from '../../infrastructure/youth-record-api';
import { DashboardLayout } from '../../../dashboard/presentation/pages/DashboardPage';

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
};

const toSelectOptions = (options: ReferenceOption[]) =>
  options
    .filter((option) => option.is_active)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((option) => ({ value: option.id, label: option.label }));

const YouthRecordFormPage = () => {
  const navigate = useNavigate();
  const { recordId } = useParams();
  const isEditing = !!recordId;

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEditing);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sexOptions, setSexOptions] = useState<{ value: string; label: string }[]>([]);
  const [civilStatusOptions, setCivilStatusOptions] = useState<{ value: string; label: string }[]>([]);
  const [youthClassificationOptions, setYouthClassificationOptions] = useState<{ value: string; label: string }[]>([]);
  const [educationalAttainmentOptions, setEducationalAttainmentOptions] = useState<{ value: string; label: string }[]>([]);
  const [workStatusOptions, setWorkStatusOptions] = useState<{ value: string; label: string }[]>([]);
  
  const { control, handleSubmit, watch, reset, setValue } = useForm<YouthRecordFormValues>({
    defaultValues: {
      category_id: '',
      first_name: '', middle_name: '', last_name: '', suffix: '',
      birth_date: '',
      sex_assigned_at_birth_id: '', civil_status_id: '', youth_classification_id: '',
      email: '', contact_number: '',
      educational_attainment_id: '', work_status_id: '',
      is_registered_voter: false, voted_last_election: 'NO',
      attended_kk_assembly: false, kk_assembly_count: 0
    }
  });

  const birthDate = watch('birth_date');
  const age = useMemo(() => computeAge(birthDate), [birthDate]);
  const ageGroup = useMemo(() => getYouthAgeGroup(age), [age]);

  const isRegisteredVoter = watch('is_registered_voter');
  const attendedKkAssembly = watch('attended_kk_assembly');

  useEffect(() => {
    const loadFormOptions = async () => {
      try {
        const [
          categoryRes,
          sexRes,
          civilStatusRes,
          youthClassificationRes,
          educationalAttainmentRes,
          workStatusRes,
        ] = await Promise.all([
          categoryApi.list(),
          referenceDataApi.listOptions('SEX_ASSIGNED_AT_BIRTH'),
          referenceDataApi.listOptions('CIVIL_STATUS'),
          referenceDataApi.listOptions('YOUTH_CLASSIFICATION'),
          referenceDataApi.listOptions('EDUCATIONAL_ATTAINMENT'),
          referenceDataApi.listOptions('WORK_STATUS'),
        ]);

        setCategories(categoryRes.data.filter((category) => category.status === 'PUBLISHED' && category.permission_mode !== 'ADMIN_ONLY'));
        setSexOptions(toSelectOptions(sexRes.data));
        setCivilStatusOptions(toSelectOptions(civilStatusRes.data));
        setYouthClassificationOptions(toSelectOptions(youthClassificationRes.data));
        setEducationalAttainmentOptions(toSelectOptions(educationalAttainmentRes.data));
        setWorkStatusOptions(toSelectOptions(workStatusRes.data));
      } catch {
        showToast.error('Failed to load form options');
      }
    };

    loadFormOptions();
  }, []);

  useEffect(() => {
    if (recordId) {
      youthRecordApi.getById(recordId)
        .then((res) => {
          reset({
            category_id: res.data.category_id,
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
  });

  const onSubmit = async (data: YouthRecordFormValues, isDraft = false) => {
    setLoading(true);
    try {
      const payload = toPayload(data);
      if (isEditing) {
        await youthRecordApi.update(recordId!, payload);
        if (!isDraft) await youthRecordApi.submit(recordId!);
        showToast.success('Record updated successfully');
      } else {
        const res = await youthRecordApi.create(payload);
        if (!isDraft) await youthRecordApi.submit(res.data.id);
        showToast.success('Record created successfully');
      }
      navigate('/youth-records');
    } catch {
      showToast.error('Failed to save record');
    } finally {
      setLoading(false);
    }
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
          <Button variant="outline" colorPalette="gray" onClick={handleSubmit((d) => onSubmit(d, true))} loading={loading}>
            Save Draft
          </Button>
        )}
      />

      <Box as="form" onSubmit={handleSubmit((d) => onSubmit(d, false))} maxW="880px" bg="white" p={{ base: 4, md: 6 }} borderRadius="lg" border="1px solid" borderColor="border">
        <SectionHeader>Record Category</SectionHeader>
        <Controller name="category_id" control={control} rules={{ required: 'Select a category' }} render={({ field, fieldState }) => (
          <SelectField
            label="Category*"
            placeholder="Select category"
            options={categories.map((category) => ({ value: category.id, label: category.name }))}
            error={fieldState.error?.message}
            {...field}
          />
        )} />
        
        <SectionHeader>Personal Information</SectionHeader>
        <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={4}>
          <GridItem>
            <Controller name="first_name" control={control} rules={{ required: 'Required' }} render={({ field, fieldState }) => (
              <TextField label="First Name*" error={fieldState.error?.message} {...field} />
            )} />
          </GridItem>
          <GridItem>
            <Controller name="middle_name" control={control} render={({ field }) => (
              <TextField label="Middle Name" {...field} />
            )} />
          </GridItem>
          <GridItem>
            <Controller name="last_name" control={control} rules={{ required: 'Required' }} render={({ field, fieldState }) => (
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
            <Controller name="birth_date" control={control} rules={{ required: 'Required' }} render={({ field, fieldState }) => (
              <TextField type="date" label="Birth Date*" error={fieldState.error?.message} {...field} />
            )} />
          </GridItem>
          <GridItem>
            <TextField label="Age" value={String(age)} onChange={() => {}} disabled />
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
            <TextField label="Youth Age Group" value={ageGroup} onChange={() => {}} disabled />
          </GridItem>
        </Grid>

        <SectionHeader>Contact Information</SectionHeader>
        <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={4}>
          <GridItem>
            <Controller name="email" control={control} render={({ field, fieldState }) => (
              <TextField label="Email" type="email" error={fieldState.error?.message} {...field} />
            )} />
          </GridItem>
          <GridItem>
            <Controller name="contact_number" control={control} render={({ field, fieldState }) => (
              <TextField label="Contact Number" error={fieldState.error?.message} {...field} />
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
              <TextField type="number" label="How Many Times?*" error={fieldState.error?.message} value={String(field.value)} onChange={(val) => field.onChange(Number(val))} />
            )} />
          )}
        </VStack>

        <HStack gap={3} mt={8} pt={4} borderTop="1px solid" borderColor="gray.200">
          <Button type="submit" colorPalette="green" loading={loading}>
            Save & Submit
          </Button>
          <Button variant="outline" onClick={() => navigate('/youth-records')}>
            Cancel
          </Button>
        </HStack>

      </Box>
    </DashboardLayout>
  );
};

export default YouthRecordFormPage;
