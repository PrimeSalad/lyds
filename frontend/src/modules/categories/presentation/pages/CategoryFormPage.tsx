import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Box, Button, HStack, VStack } from '@chakra-ui/react';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { TextField, SelectField, TextareaField, CheckboxField } from '../../../../shared/forms/FormFields';
import { showToast } from '../../../../shared/toast';
import { categoryApi } from '../../infrastructure/category-api';
import { DashboardLayout } from '../../../dashboard/presentation/pages/DashboardPage';

const CategoryFormPage = () => {
  const navigate = useNavigate();
  const { categoryId } = useParams();
  const isEditing = !!categoryId;

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [recordType, setRecordType] = useState('');
  const [permissionMode, setPermissionMode] = useState('SK_FILLABLE');
  const [allowSkExport, setAllowSkExport] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEditing);

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
        code,
        name,
        description,
        record_type: recordType,
        permission_mode: permissionMode,
        allow_sk_export: allowSkExport,
      };

      if (isEditing) {
        await categoryApi.update(categoryId!, payload);
        showToast.success('Category updated');
      } else {
        await categoryApi.create(payload);
        showToast.success('Category created');
      }
      navigate('/categories');
    } catch {
      showToast.error('Failed to save category');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return null;

  return (
    <DashboardLayout>
      <PageHeader
        title={isEditing ? 'Edit Category' : 'Add Category'}
        description="Define category metadata and SK access permissions."
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
          <TextField
            label="Record Type"
            name="recordType"
            value={recordType}
            onChange={setRecordType}
            required
            placeholder="e.g. profile, transaction"
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
            <Button variant="outline" onClick={() => navigate('/categories')}>
              Cancel
            </Button>
          </HStack>
        </VStack>
      </Box>
    </DashboardLayout>
  );
};

export default CategoryFormPage;
