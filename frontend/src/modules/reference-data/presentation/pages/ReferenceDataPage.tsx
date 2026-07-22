import { useState, useEffect } from 'react';
import { Heading, Button, HStack, VStack, Text, Card, Box, Table, Spinner } from '@chakra-ui/react';
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
      <Table.Row>
        <Table.Cell>{option.code}</Table.Cell>
        <Table.Cell><TextField name="label" label="" value={label} onChange={setLabel} /></Table.Cell>
        <Table.Cell><TextField name="sortOrder" label="" type="number" value={sortOrder} onChange={setSortOrder} /></Table.Cell>
        <Table.Cell><CheckboxField name="active" label="" checked={isActive} onChange={setIsActive} /></Table.Cell>
        <Table.Cell>
          <HStack gap={2}>
            <Button size="sm" colorPalette="green" onClick={handleSave}>Save</Button>
            <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
          </HStack>
        </Table.Cell>
      </Table.Row>
    );
  }

  return (
    <Table.Row>
      <Table.Cell>{option.code}</Table.Cell>
      <Table.Cell>{option.label}</Table.Cell>
      <Table.Cell>{option.sort_order}</Table.Cell>
      <Table.Cell>{option.is_active ? 'Yes' : 'No'}</Table.Cell>
      <Table.Cell>
        <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>Edit</Button>
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
    <Card.Root mb={6} borderColor="border" borderRadius="lg">
      <Card.Header>
        <Heading size="md">{group.name}</Heading>
        <Text fontFamily="mono" fontSize="sm" color="gray.500">{group.code}</Text>
      </Card.Header>
      <Card.Body>
        <Box overflowX="auto">
          <Table.Root size="sm" variant="outline" striped>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Code</Table.ColumnHeader>
                <Table.ColumnHeader>Label</Table.ColumnHeader>
                <Table.ColumnHeader>Sort Order</Table.ColumnHeader>
                <Table.ColumnHeader>Active</Table.ColumnHeader>
                <Table.ColumnHeader>Actions</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {options.map(opt => (
                <OptionRow key={opt.id} option={opt} onSave={loadOptions} />
              ))}
              {showAdd && (
                <Table.Row>
                  <Table.Cell><TextField name="code" label="" value={formCode} onChange={setFormCode} placeholder="CODE" /></Table.Cell>
                  <Table.Cell><TextField name="label" label="" value={formLabel} onChange={setFormLabel} placeholder="Label" /></Table.Cell>
                  <Table.Cell><TextField name="sortOrder" label="" type="number" value={formSortOrder} onChange={setFormSortOrder} /></Table.Cell>
                  <Table.Cell><CheckboxField name="active" label="" checked={formActive} onChange={setFormActive} /></Table.Cell>
                  <Table.Cell>
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
        {!showAdd && (
          <Button mt={4} size="sm" variant="outline" onClick={() => setShowAdd(true)}>
            Add Option
          </Button>
        )}
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
