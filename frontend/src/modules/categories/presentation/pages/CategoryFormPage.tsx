import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { Box, Button, HStack, Spinner, Text, VStack } from '@chakra-ui/react';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { TextField, SelectField, TextareaField, CheckboxField } from '../../../../shared/forms/FormFields';
import { showToast } from '../../../../shared/toast';
import { categoryApi, type CategoryRecordType } from '../../infrastructure/category-api';
import { DashboardLayout } from '../../../dashboard/presentation/pages/DashboardPage';

const CategoryFormPage = () => {
  const navigate = useNavigate();
  const { categoryId } = useParams();
  const [searchParams] = useSearchParams();
  const isEditing = !!categoryId;
  const initialRecordType: CategoryRecordType = searchParams.get('type') === 'child-laborer'
    ? 'CHILD_LABORER'
    : 'YOUTH_PROFILE';

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [recordType, setRecordType] = useState<CategoryRecordType>(initialRecordType);
  const [filingYear, setFilingYear] = useState(new Date().getFullYear());
  const [permissionMode, setPermissionMode] = useState('SK_FILLABLE');
  const [allowSkExport, setAllowSkExport] = useState(true);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEditing);
  const categoryListPath = recordType === 'CHILD_LABORER'
    ? '/categories?type=child-laborer'
    : '/categories';

  useEffect(() => {
    if (categoryId) {
      categoryApi
        .getById(categoryId)
        .then((res) => {
          const c = res.data;
          setCode(c.code);
          setName(c.name);
          setDescription(c.description || '');
          setRecordType(c.record_type);
          setFilingYear(c.filing_year);
          setPermissionMode(c.permission_mode);
          setAllowSkExport(c.allow_sk_export);
        })
        .catch(() => {
          showToast.error('Failed to load category');
          navigate('/categories');
        })
        .finally(() => setFetching(false));
    }
  }, [categoryId, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        code: code.trim().toUpperCase().replace(/\s+/g, '_'),
        name: name.trim(),
        description: description.trim() || null,
          record_type: recordType,
        filing_year: filingYear,
        permission_mode: permissionMode,
        allow_sk_export: allowSkExport,
      };

      if (isEditing) {
        await categoryApi.update(categoryId!, {
          name: payload.name,
          description: payload.description,
          permission_mode: payload.permission_mode,
          allow_sk_export: payload.allow_sk_export,
        });
        showToast.success('Category updated');
        navigate(categoryListPath);
      } else {
        const res = await categoryApi.create(payload);
        showToast.success('Category created. Add fields for this category.');
        navigate(`/categories/${res.data.id}/fields`);
      }
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Failed to save category');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <DashboardLayout>
        <VStack py={16} gap={3} role="status">
          <Spinner color="primary.600" />
          <Text color="text.muted">Loading category…</Text>
        </VStack>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader
        title={isEditing ? `Edit ${recordType === 'CHILD_LABORER' ? 'Child Laborer' : 'Youth Registry'} Category` : `Add ${recordType === 'CHILD_LABORER' ? 'Child Laborer' : 'Youth Registry'} Category`}
        description="Define the annual dataset, access permissions, and custom record fields."
      />

      <Box as="form" onSubmit={handleSubmit} maxW="640px" bg="white" border="1px solid" borderColor="border" borderRadius="lg" p={{ base: 4, md: 6 }}>
        <VStack gap={4} align="stretch">
          <TextField
            label="Code"
            name="code"
            value={code}
            onChange={setCode}
            required
            disabled={isEditing}
            placeholder="e.g. YOUTH_PROFILE"
          />
          <TextField
            label="Name"
            name="name"
            value={name}
            onChange={setName}
            required
            placeholder="Category Name"
          />
          <TextareaField
            label="Description"
            name="description"
            value={description}
            onChange={setDescription}
            placeholder="Description..."
          />
          <SelectField
            label="Registry"
            name="recordType"
            value={recordType}
            onChange={(value) => setRecordType(value as CategoryRecordType)}
            required
            disabled={isEditing}
            options={[
              { value: 'YOUTH_PROFILE', label: 'Youth Registry' },
              { value: 'CHILD_LABORER', label: 'Child Laborer Records' },
            ]}
          />
          <TextField
            label="Filing Year"
            name="filingYear"
            type="number"
            value={String(filingYear)}
            onChange={(val) => setFilingYear(Number(val))}
            required
            disabled={isEditing}
            placeholder="e.g. 2026"
          />
          <SelectField
            label="Permission Mode"
            name="permissionMode"
            value={permissionMode}
            onChange={setPermissionMode}
            required
            options={[
              { value: 'SK_FILLABLE', label: 'SK Fillable' },
              { value: 'SK_VIEW_ONLY', label: 'SK View Only' },
              { value: 'ADMIN_ONLY', label: 'Admin Only' },
            ]}
          />
          <CheckboxField
            label="Allow SK Export"
            name="allowSkExport"
            checked={allowSkExport}
            onChange={setAllowSkExport}
          />

          <HStack gap={3} mt={4}>
            <Button type="submit" colorPalette="green" loading={loading}>
              {isEditing ? 'Update' : 'Create'}
            </Button>
            <Button variant="outline" onClick={() => navigate(categoryListPath)}>
              Cancel
            </Button>
          </HStack>
        </VStack>
      </Box>
    </DashboardLayout>
  );
};

export default CategoryFormPage;
