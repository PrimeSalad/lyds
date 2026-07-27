import { useState, useEffect } from 'react';
import { Badge, Box, Button, Card, HStack, SimpleGrid, Spinner, Table, Text, VStack } from '@chakra-ui/react';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { TextField, CheckboxField } from '../../../../shared/forms/FormFields';
import { showToast } from '../../../../shared/toast';
import { referenceDataApi, type ReferenceGroup, type ReferenceOption } from '../../infrastructure/reference-data-api';
import { DashboardLayout } from '../../../dashboard/presentation/pages/DashboardPage';

const OptionRow = ({ option, onSave }: { option: ReferenceOption; onSave: () => void }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(option.label);
  const [sortOrder, setSortOrder] = useState(String(option.sort_order));
  const [isActive, setIsActive] = useState(option.is_active);

  const handleSave = async () => {
    try {
      await referenceDataApi.updateOption(option.group_code, option.id, {
        label,
        sort_order: parseInt(sortOrder, 10) || 0,
        is_active: isActive,
      });
      showToast.success('Option updated');
      setIsEditing(false);
      onSave();
    } catch {
      showToast.error('Failed to update option');
    }
  };

  if (isEditing) {
    return (
      <Table.Row bg="primary.50">
        <Table.Cell px={4} py={3} fontWeight="600">{option.code}</Table.Cell>
        <Table.Cell px={4} py={3}><TextField name="label" label="" value={label} onChange={setLabel} /></Table.Cell>
        <Table.Cell px={4} py={3}><TextField name="sortOrder" label="" type="number" value={sortOrder} onChange={setSortOrder} /></Table.Cell>
        <Table.Cell px={4} py={3}><CheckboxField name="active" label="" checked={isActive} onChange={setIsActive} /></Table.Cell>
        <Table.Cell px={4} py={3}>
          <HStack gap={2}>
            <Button size="sm" colorPalette="green" onClick={handleSave}>Save</Button>
            <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
          </HStack>
        </Table.Cell>
      </Table.Row>
    );
  }

  return (
    <Table.Row _hover={{ bg: 'primary.50' }} transition="background-color 0.15s ease">
      <Table.Cell px={4} py={3} fontWeight="600">{option.code}</Table.Cell>
      <Table.Cell px={4} py={3}>{option.label}</Table.Cell>
      <Table.Cell px={4} py={3}>{option.sort_order}</Table.Cell>
      <Table.Cell px={4} py={3}>
        <Badge colorPalette={option.is_active ? 'green' : 'gray'}>{option.is_active ? 'Active' : 'Inactive'}</Badge>
      </Table.Cell>
      <Table.Cell px={4} py={3} textAlign="right">
        <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)}>Edit</Button>
      </Table.Cell>
    </Table.Row>
  );
};

const GroupCard = ({ group }: { group: ReferenceGroup }) => {
  const [options, setOptions] = useState<ReferenceOption[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  
  const [formCode, setFormCode] = useState('');
  const [formLabel, setFormLabel] = useState('');
  const [formSortOrder, setFormSortOrder] = useState('0');
  const [formActive, setFormActive] = useState(true);

  const loadOptions = async () => {
    try {
      const res = await referenceDataApi.listOptions(group.code);
      setOptions(res.data);
    } catch {
      showToast.error(`Failed to load options for ${group.name}`);
    }
  };

  useEffect(() => {
    loadOptions();
  }, [group.code]);

  const activeCount = options.filter((option) => option.is_active).length;
  const inactiveCount = options.length - activeCount;

  const handleAdd = async () => {
    try {
      await referenceDataApi.createOption(group.code, {
        code: formCode,
        label: formLabel,
        sort_order: parseInt(formSortOrder, 10) || 0,
        is_active: formActive,
      });
      showToast.success('Option added');
      setFormCode('');
      setFormLabel('');
      setFormSortOrder('0');
      setFormActive(true);
      setShowAdd(false);
      loadOptions();
    } catch {
      showToast.error('Failed to add option');
    }
  };

  return (
    <Card.Root mb={6} borderColor="border" borderRadius="lg" boxShadow="panel" overflow="hidden">
      <Card.Header px={{ base: 4, md: 5 }} py={4} borderBottomWidth="1px" borderColor="border">
        <Box width="full">
          <HStack justify="space-between" gap={3} wrap="wrap" align="start">
            <Box>
              <Text fontSize="lg" fontWeight="700">{group.name}</Text>
              <Text fontSize="sm" color="text.muted" mt={1}>{group.code}</Text>
            </Box>
            <HStack gap={2} wrap="wrap">
              <Badge colorPalette="green">{activeCount} active</Badge>
              <Badge colorPalette="gray">{inactiveCount} inactive</Badge>
              <Badge colorPalette="blue">{options.length} total</Badge>
            </HStack>
          </HStack>
        </Box>
      </Card.Header>
      <Card.Body p={0}>
        <Box overflowX="auto">
          <Table.Root size="sm" variant="line">
            <Table.Header>
              <Table.Row bg="surface.muted" borderBottomWidth="1px" borderColor="border.strong">
                <Table.ColumnHeader px={4} py={3} fontFamily="heading" fontSize="sm" fontWeight="600">Code</Table.ColumnHeader>
                <Table.ColumnHeader px={4} py={3} fontFamily="heading" fontSize="sm" fontWeight="600">Label</Table.ColumnHeader>
                <Table.ColumnHeader px={4} py={3} fontFamily="heading" fontSize="sm" fontWeight="600">Sort order</Table.ColumnHeader>
                <Table.ColumnHeader px={4} py={3} fontFamily="heading" fontSize="sm" fontWeight="600">Status</Table.ColumnHeader>
                <Table.ColumnHeader px={4} py={3} fontFamily="heading" fontSize="sm" fontWeight="600" textAlign="right">Actions</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {options.map((opt) => (
                <OptionRow key={opt.id} option={opt} onSave={loadOptions} />
              ))}
              {options.length === 0 && !showAdd && (
                <Table.Row>
                  <Table.Cell colSpan={5} textAlign="center" color="text.muted" py={8}>
                    No options defined yet.
                  </Table.Cell>
                </Table.Row>
              )}
              {showAdd && (
                <Table.Row bg="surface.muted">
                  <Table.Cell px={4} py={3}><TextField name="code" label="" value={formCode} onChange={setFormCode} placeholder="CODE" /></Table.Cell>
                  <Table.Cell px={4} py={3}><TextField name="label" label="" value={formLabel} onChange={setFormLabel} placeholder="Label" /></Table.Cell>
                  <Table.Cell px={4} py={3}><TextField name="sortOrder" label="" type="number" value={formSortOrder} onChange={setFormSortOrder} /></Table.Cell>
                  <Table.Cell px={4} py={3}><CheckboxField name="active" label="" checked={formActive} onChange={setFormActive} /></Table.Cell>
                  <Table.Cell px={4} py={3}>
                    <HStack gap={2}>
                      <Button size="sm" colorPalette="green" onClick={handleAdd}>Save</Button>
                      <Button size="sm" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
                    </HStack>
                  </Table.Cell>
                </Table.Row>
              )}
            </Table.Body>
          </Table.Root>
        </Box>
        <Box px={{ base: 4, md: 5 }} py={4} borderTopWidth="1px" borderColor="border">
          {!showAdd ? (
            <Button size="sm" variant="outline" onClick={() => setShowAdd(true)}>
              Add Option
            </Button>
          ) : (
            <Text fontSize="sm" color="text.muted">
              Fill in the new option row above, then save to add it to the controlled list.
            </Text>
          )}
        </Box>
      </Card.Body>
    </Card.Root>
  );
};

const ReferenceDataPage = () => {
  const [groups, setGroups] = useState<ReferenceGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    referenceDataApi.listGroups()
      .then(res => setGroups(res.data))
      .catch(() => showToast.error('Failed to load reference groups'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
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
        title="Reference Data"
        description="Maintain controlled options used by forms and reports."
      />
      <Card.Root borderColor="border" borderRadius="lg" boxShadow="panel" mb={6}>
        <Card.Body p={{ base: 4, md: 5 }}>
          <SimpleGrid columns={{ base: 1, md: 3 }} gap={4}>
            {[
              { label: 'Reference groups', value: groups.length },
              { label: 'Editable lists', value: groups.filter((group) => group.code !== '').length },
              { label: 'Active records', value: groups.length ? 'Ready to manage' : 'No groups loaded' },
            ].map((item) => (
              <Box key={item.label} p={4} bg="surface.muted" borderRadius="md" borderWidth="1px" borderColor="border">
                <Text fontSize="sm" color="text.muted">{item.label}</Text>
                <Text fontWeight="700" mt={1}>{item.value}</Text>
              </Box>
            ))}
          </SimpleGrid>
        </Card.Body>
      </Card.Root>
      <VStack align="stretch" gap={0}>
        {groups.map(group => (
          <GroupCard key={group.code} group={group} />
        ))}
      </VStack>
      {groups.length === 0 && (
        <Text color="gray.500" textAlign="center">No reference groups found.</Text>
      )}
    </DashboardLayout>
  );
};

export default ReferenceDataPage;
