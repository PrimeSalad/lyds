import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Box, Heading, Button, HStack, VStack, Text, Badge, Card, SimpleGrid, Table } from '@chakra-ui/react';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { TextField, SelectField, CheckboxField } from '../../../../shared/forms/FormFields';
import { showToast } from '../../../../shared/toast';
import { categoryApi, type CategoryWithFields, type CategoryField } from '../../infrastructure/category-api';
import { DashboardLayout } from '../../../dashboard/presentation/pages/DashboardPage';

const fieldTypeOptions = [
  { value: 'SHORT_TEXT', label: 'Short Text' },
  { value: 'LONG_TEXT', label: 'Long Text' },
  { value: 'NUMBER', label: 'Number' },
  { value: 'DATE', label: 'Date' },
  { value: 'YES_NO', label: 'Yes/No' },
  { value: 'SINGLE_SELECT', label: 'Single Select' },
  { value: 'MULTI_SELECT', label: 'Multi Select' },
];

const CategoryFieldsPage = () => {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  
  const [category, setCategory] = useState<CategoryWithFields | null>(null);
  const [fields, setFields] = useState<CategoryField[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const [formKey, setFormKey] = useState('');
  const [formLabel, setFormLabel] = useState('');
  const [formType, setFormType] = useState('SHORT_TEXT');
  const [formRequired, setFormRequired] = useState(false);
  const [formHelpText, setFormHelpText] = useState('');
  const [formSortOrder, setFormSortOrder] = useState('0');

  const loadData = async () => {
    if (!categoryId) return;
    try {
      const res = await categoryApi.getById(categoryId);
      setCategory(res.data);
      const fieldsRes = await categoryApi.listFields(categoryId);
      setFields(fieldsRes.data);
    } catch {
      showToast.error('Failed to load category fields');
      navigate('/categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [categoryId, navigate]);

  const resetForm = () => {
    setFormKey('');
    setFormLabel('');
    setFormType('SHORT_TEXT');
    setFormRequired(false);
    setFormHelpText('');
    setFormSortOrder('0');
    setEditingId(null);
    setShowAdd(false);
  };

  const handleEditClick = (field: CategoryField) => {
    setEditingId(field.id);
    setShowAdd(false);
    setFormKey(field.field_key);
    setFormLabel(field.label);
    setFormType(field.field_type);
    setFormRequired(field.is_required);
    setFormHelpText(field.help_text || '');
    setFormSortOrder(String(field.sort_order));
  };

  const handleSave = async () => {
    if (!categoryId) return;
    const payload = {
      field_key: formKey,
      label: formLabel,
      field_type: formType,
      is_required: formRequired,
      help_text: formHelpText,
      sort_order: parseInt(formSortOrder, 10) || 0,
    };

    try {
      if (editingId) {
        await categoryApi.updateField(categoryId, editingId, payload);
        showToast.success('Field updated');
      } else {
        await categoryApi.createField(categoryId, payload);
        showToast.success('Field created');
      }
      resetForm();
      loadData();
    } catch {
      showToast.error('Failed to save field');
    }
  };

  if (loading) return null;

  const sortedFields = [...fields].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <DashboardLayout>
      <PageHeader
        title={`Fields for ${category?.name ?? 'Category'}`}
        description="Manage custom fields without changing existing record semantics."
        actions={(
          <Button variant="outline" onClick={() => navigate('/categories')}>Back to Categories</Button>
        )}
      />

      <VStack gap={4} align="stretch">
        <Card.Root borderColor="border" borderRadius="lg">
          <Card.Header>
            <HStack justify="space-between" align="flex-start" wrap="wrap" gap={3}>
              <Box>
                <Heading size="sm">Table Layout Preview</Heading>
                <Text color="text.secondary" fontSize="sm" mt={1}>
                  Columns appear in sort order. Required fields stay marked so encoders know what must be filled.
                </Text>
              </Box>
              {!showAdd && !editingId && (
                <Button onClick={() => setShowAdd(true)} colorPalette="green">
                  Add Field
                </Button>
              )}
            </HStack>
          </Card.Header>
          <Card.Body pt={0}>
            <Box overflowX="auto">
              <Table.Root size="sm" variant="outline">
                <Table.Header>
                  <Table.Row>
                    {sortedFields.length === 0 ? (
                      <Table.ColumnHeader color="text.muted">No custom columns yet</Table.ColumnHeader>
                    ) : (
                      sortedFields.map((field) => (
                        <Table.ColumnHeader key={field.id} minW="160px">
                          <HStack gap={2}>
                            <Text>{field.label}</Text>
                            {field.is_required && <Badge colorPalette="red">Required</Badge>}
                          </HStack>
                        </Table.ColumnHeader>
                      ))
                    )}
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  <Table.Row>
                    {sortedFields.length === 0 ? (
                      <Table.Cell color="text.muted">Use Add Field to define the table.</Table.Cell>
                    ) : (
                      sortedFields.map((field) => (
                        <Table.Cell key={field.id} color="text.muted">
                          {field.field_type.replace('_', ' ').toLowerCase()}
                        </Table.Cell>
                      ))
                    )}
                  </Table.Row>
                </Table.Body>
              </Table.Root>
            </Box>
          </Card.Body>
        </Card.Root>

        {sortedFields.map(field => (
          <Card.Root key={field.id} borderColor="border" borderRadius="lg">
            <Card.Body>
              {editingId === field.id ? (
                <VStack gap={3} align="stretch">
                  <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
                    <TextField label="Key" name="key" value={formKey} onChange={setFormKey} required />
                    <TextField label="Label" name="label" value={formLabel} onChange={setFormLabel} required />
                  </SimpleGrid>
                  <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
                    <SelectField label="Type" name="type" value={formType} onChange={setFormType} options={fieldTypeOptions} required />
                    <TextField label="Sort Order" name="sortOrder" type="number" value={formSortOrder} onChange={setFormSortOrder} />
                  </SimpleGrid>
                  <TextField label="Help Text" name="helpText" value={formHelpText} onChange={setFormHelpText} />
                  <CheckboxField label="Required" name="required" checked={formRequired} onChange={setFormRequired} />
                  <HStack gap={2}>
                    <Button size="sm" colorPalette="green" onClick={handleSave}>Save</Button>
                    <Button size="sm" variant="outline" onClick={resetForm}>Cancel</Button>
                  </HStack>
                </VStack>
              ) : (
                <HStack justify="space-between" align="flex-start" wrap="wrap" gap={3}>
                  <VStack align="start" gap={1}>
                    <HStack wrap="wrap">
                      <Text fontWeight="bold">{field.label}</Text>
                      <Text fontFamily="mono" fontSize="sm" color="gray.500">({field.field_key})</Text>
                      <Badge colorPalette="blue">{field.field_type}</Badge>
                      {field.is_required && <Badge colorPalette="red">Required</Badge>}
                    </HStack>
                    {field.help_text && <Text fontSize="sm" color="gray.600">{field.help_text}</Text>}
                  </VStack>
                  <Button size="sm" variant="outline" onClick={() => handleEditClick(field)}>Edit</Button>
                </HStack>
              )}
            </Card.Body>
          </Card.Root>
        ))}

        {showAdd && (
          <Card.Root mt={4} borderColor="primary.200" borderWidth={2} borderRadius="lg">
            <Card.Header>
              <Heading size="sm">New Field</Heading>
            </Card.Header>
            <Card.Body>
              <VStack gap={3} align="stretch">
                <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
                  <TextField label="Key" name="key" value={formKey} onChange={setFormKey} required placeholder="e.g. first_name" />
                  <TextField label="Label" name="label" value={formLabel} onChange={setFormLabel} required placeholder="First Name" />
                </SimpleGrid>
                <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
                  <SelectField label="Type" name="type" value={formType} onChange={setFormType} options={fieldTypeOptions} required />
                  <TextField label="Sort Order" name="sortOrder" type="number" value={formSortOrder} onChange={setFormSortOrder} />
                </SimpleGrid>
                <TextField label="Help Text" name="helpText" value={formHelpText} onChange={setFormHelpText} />
                <CheckboxField label="Required" name="required" checked={formRequired} onChange={setFormRequired} />
                <HStack gap={2}>
                  <Button size="sm" colorPalette="green" onClick={handleSave}>Save</Button>
                  <Button size="sm" variant="outline" onClick={resetForm}>Cancel</Button>
                </HStack>
              </VStack>
            </Card.Body>
          </Card.Root>
        )}
      </VStack>
    </DashboardLayout>
  );
};

export default CategoryFieldsPage;
