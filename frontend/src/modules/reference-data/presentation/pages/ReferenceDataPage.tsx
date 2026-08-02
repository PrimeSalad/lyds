import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import {
  Badge,
  Box,
  Button,
  Card,
  Flex,
  Heading,
  HStack,
  Icon,
  SimpleGrid,
  Skeleton,
  Table,
  Text,
  VStack,
} from '@chakra-ui/react';
import { LuBaby, LuDatabase, LuRefreshCw, LuUsersRound } from 'react-icons/lu';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { CheckboxField, TextField } from '../../../../shared/forms/FormFields';
import { showToast } from '../../../../shared/toast';
import {
  referenceDataApi,
  type ReferenceGroup,
  type ReferenceOption,
  type ReferenceRecordType,
} from '../../infrastructure/reference-data-api';
import { DashboardLayout } from '../../../dashboard/presentation/pages/DashboardPage';

const referenceViews: Record<ReferenceRecordType, {
  label: string;
  heading: string;
  description: string;
  query: string;
  icon: typeof LuUsersRound;
}> = {
  YOUTH_PROFILE: {
    label: 'Youth Registry',
    heading: 'Youth Registry reference data',
    description: 'Controlled demographic, education, and work options used by KK Youth forms, imports, and reports.',
    query: 'youth',
    icon: LuUsersRound,
  },
  CHILD_LABORER: {
    label: 'Child Laborer',
    heading: 'Child Laborer reference data',
    description: 'Maintained grade, nature-of-work, and parent or guardian occupation suggestions for protected records.',
    query: 'child-laborer',
    icon: LuBaby,
  },
};

const OptionRow = ({ option, onSave }: { option: ReferenceOption; onSave: () => Promise<void> }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(option.label);
  const [sortOrder, setSortOrder] = useState(String(option.sort_order));
  const [isActive, setIsActive] = useState(option.is_active);
  const [saving, setSaving] = useState(false);

  const cancelEditing = () => {
    setLabel(option.label);
    setSortOrder(String(option.sort_order));
    setIsActive(option.is_active);
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!label.trim()) {
      showToast.error('Enter a label before saving');
      return;
    }

    setSaving(true);
    try {
      await referenceDataApi.updateOption(option.group_code, option.id, {
        label: label.trim(),
        sort_order: Number.parseInt(sortOrder, 10) || 0,
        is_active: isActive,
      });
      showToast.success('Option updated');
      setIsEditing(false);
      await onSave();
    } catch (error) {
      showToast.error({
        title: 'Could not update option',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  if (isEditing) {
    return (
      <Table.Row bg="primary.50">
        <Table.Cell px={4} py={3} fontWeight="600">{option.code}</Table.Cell>
        <Table.Cell px={4} py={3} minW="240px">
          <TextField
            name={`label-${option.id}`}
            label=""
            ariaLabel={`Label for ${option.code}`}
            value={label}
            onChange={setLabel}
          />
        </Table.Cell>
        <Table.Cell px={4} py={3} minW="120px">
          <TextField
            name={`sort-order-${option.id}`}
            label=""
            ariaLabel={`Sort order for ${option.code}`}
            type="number"
            min={0}
            max={10_000}
            value={sortOrder}
            onChange={setSortOrder}
          />
        </Table.Cell>
        <Table.Cell px={4} py={3}>
          <CheckboxField
            name={`active-${option.id}`}
            label="Active"
            checked={isActive}
            onChange={setIsActive}
          />
        </Table.Cell>
        <Table.Cell px={4} py={3}>
          <HStack gap={2} justify="flex-end">
            <Button minH="44px" size="sm" colorPalette="green" loading={saving} onClick={handleSave}>Save</Button>
            <Button minH="44px" size="sm" variant="outline" disabled={saving} onClick={cancelEditing}>Cancel</Button>
          </HStack>
        </Table.Cell>
      </Table.Row>
    );
  }

  return (
    <Table.Row _hover={{ bg: 'primary.50' }} transition="background-color 0.15s ease">
      <Table.Cell px={4} py={3} fontWeight="600">{option.code}</Table.Cell>
      <Table.Cell px={4} py={3}>{option.label}</Table.Cell>
      <Table.Cell px={4} py={3} fontVariantNumeric="tabular-nums">{option.sort_order}</Table.Cell>
      <Table.Cell px={4} py={3}>
        <Badge colorPalette={option.is_active ? 'green' : 'gray'}>{option.is_active ? 'Active' : 'Inactive'}</Badge>
      </Table.Cell>
      <Table.Cell px={4} py={3} textAlign="right">
        <Button minH="44px" size="sm" variant="ghost" onClick={() => setIsEditing(true)}>Edit</Button>
      </Table.Cell>
    </Table.Row>
  );
};

const GroupCard = ({ group }: { group: ReferenceGroup }) => {
  const [options, setOptions] = useState<ReferenceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState(false);
  const [formCode, setFormCode] = useState('');
  const [formLabel, setFormLabel] = useState('');
  const [formSortOrder, setFormSortOrder] = useState('0');
  const [formActive, setFormActive] = useState(true);

  const loadOptions = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const response = await referenceDataApi.listOptions(group.code);
      setOptions(response.data);
    } catch (error) {
      setLoadError(true);
      showToast.error({
        title: `Could not load ${group.name}`,
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setLoading(false);
    }
  }, [group.code, group.name]);

  useEffect(() => {
    void loadOptions();
  }, [loadOptions]);

  const activeCount = options.filter((option) => option.is_active).length;
  const inactiveCount = options.length - activeCount;

  const handleAdd = async () => {
    if (!formCode.trim() || !formLabel.trim()) {
      showToast.error('Enter both a code and label before saving');
      return;
    }

    setAdding(true);
    try {
      await referenceDataApi.createOption(group.code, {
        code: formCode,
        label: formLabel.trim(),
        sort_order: Number.parseInt(formSortOrder, 10) || 0,
        is_active: formActive,
      });
      showToast.success('Option added');
      setFormCode('');
      setFormLabel('');
      setFormSortOrder('0');
      setFormActive(true);
      setShowAdd(false);
      await loadOptions();
    } catch (error) {
      showToast.error({
        title: 'Could not add option',
        description: error instanceof Error ? error.message : 'Check the code and try again.',
      });
    } finally {
      setAdding(false);
    }
  };

  return (
    <Card.Root mb={6} borderColor="border" borderRadius="lg" boxShadow="panel" overflow="hidden">
      <Card.Header px={{ base: 4, md: 5 }} py={4} borderBottomWidth="1px" borderColor="border">
        <HStack justify="space-between" gap={3} wrap="wrap" align="start">
          <Box minW={0}>
            <Heading as="h2" size="md">{group.name}</Heading>
            <Text fontSize="sm" color="text.muted" mt={1}>{group.description ?? 'Maintained options for this registry.'}</Text>
            <Text fontSize="xs" color="text.muted" mt={2} fontFamily="mono">{group.code}</Text>
          </Box>
          <HStack gap={2} wrap="wrap">
            <Badge colorPalette="green">{activeCount} active</Badge>
            <Badge colorPalette="gray">{inactiveCount} inactive</Badge>
            <Badge colorPalette="blue">{options.length} total</Badge>
          </HStack>
        </HStack>
      </Card.Header>
      <Card.Body p={0}>
        {loading ? (
          <VStack align="stretch" gap={3} p={5} aria-label={`Loading ${group.name} options`}>
            {Array.from({ length: 3 }, (_, index) => <Skeleton key={index} height="44px" borderRadius="md" />)}
          </VStack>
        ) : loadError ? (
          <Box p={6} textAlign="center" role="alert">
            <Text fontWeight="700">Options could not be loaded</Text>
            <Text mt={1} fontSize="sm" color="text.muted">Check the connection, then try this list again.</Text>
            <Button mt={4} minH="44px" variant="outline" onClick={() => void loadOptions()}>
              <LuRefreshCw aria-hidden="true" /> Retry
            </Button>
          </Box>
        ) : (
          <Box overflowX="auto">
            <Table.Root size="sm" variant="line" minW="760px">
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
                {options.map((option) => (
                  <OptionRow key={option.id} option={option} onSave={loadOptions} />
                ))}
                {options.length === 0 && !showAdd && (
                  <Table.Row>
                    <Table.Cell colSpan={5} textAlign="center" color="text.muted" py={8}>
                      No options defined yet. Add the first maintained value below.
                    </Table.Cell>
                  </Table.Row>
                )}
                {showAdd && (
                  <Table.Row bg="surface.muted">
                    <Table.Cell px={4} py={3}>
                      <TextField
                        name={`code-${group.code}`}
                        label=""
                        ariaLabel={`New code for ${group.name}`}
                        value={formCode}
                        onChange={setFormCode}
                        placeholder="OPTION_CODE"
                      />
                    </Table.Cell>
                    <Table.Cell px={4} py={3}>
                      <TextField
                        name={`label-${group.code}`}
                        label=""
                        ariaLabel={`New label for ${group.name}`}
                        value={formLabel}
                        onChange={setFormLabel}
                        placeholder="Readable label"
                      />
                    </Table.Cell>
                    <Table.Cell px={4} py={3}>
                      <TextField
                        name={`sort-order-${group.code}`}
                        label=""
                        ariaLabel={`New sort order for ${group.name}`}
                        type="number"
                        min={0}
                        max={10_000}
                        value={formSortOrder}
                        onChange={setFormSortOrder}
                      />
                    </Table.Cell>
                    <Table.Cell px={4} py={3}>
                      <CheckboxField name={`active-${group.code}`} label="Active" checked={formActive} onChange={setFormActive} />
                    </Table.Cell>
                    <Table.Cell px={4} py={3}>
                      <HStack gap={2} justify="flex-end">
                        <Button minH="44px" size="sm" colorPalette="green" loading={adding} onClick={handleAdd}>Save</Button>
                        <Button minH="44px" size="sm" variant="outline" disabled={adding} onClick={() => setShowAdd(false)}>Cancel</Button>
                      </HStack>
                    </Table.Cell>
                  </Table.Row>
                )}
              </Table.Body>
            </Table.Root>
          </Box>
        )}
        {!loading && !loadError && (
          <Box px={{ base: 4, md: 5 }} py={4} borderTopWidth="1px" borderColor="border">
            {!showAdd ? (
              <Button minH="44px" size="sm" variant="outline" onClick={() => setShowAdd(true)}>
                Add Option
              </Button>
            ) : (
              <Text fontSize="sm" color="text.muted">
                Codes are normalized to uppercase with underscores when saved.
              </Text>
            )}
          </Box>
        )}
      </Card.Body>
    </Card.Root>
  );
};

const ReferenceDataPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const recordType: ReferenceRecordType = searchParams.get('type') === 'child-laborer'
    ? 'CHILD_LABORER'
    : 'YOUTH_PROFILE';
  const view = referenceViews[recordType];
  const [groups, setGroups] = useState<ReferenceGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const loadGroups = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const response = await referenceDataApi.listGroups(recordType);
      setGroups(response.data.filter((group) => group.record_type === recordType));
    } catch (error) {
      setGroups([]);
      setLoadError(true);
      showToast.error({
        title: 'Could not load reference groups',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setLoading(false);
    }
  }, [recordType]);

  useEffect(() => {
    void loadGroups();
  }, [loadGroups]);

  const changeRecordType = (nextType: ReferenceRecordType) => {
    const nextParams = new URLSearchParams(searchParams);
    if (nextType === 'CHILD_LABORER') nextParams.set('type', referenceViews[nextType].query);
    else nextParams.delete('type');
    setSearchParams(nextParams, { replace: true });
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Reference Data"
        description="Maintain registry-specific options used by forms, imports, and reports."
      />

      <Card.Root mb={5} borderColor="border" borderRadius="lg" boxShadow="panel">
        <Card.Body p={{ base: 3, md: 4 }}>
          <Flex align={{ base: 'stretch', md: 'center' }} justify="space-between" direction={{ base: 'column', md: 'row' }} gap={4}>
            <HStack role="group" aria-label="Reference data registry" gap={2} wrap="wrap">
              {(Object.keys(referenceViews) as ReferenceRecordType[]).map((type) => {
                const option = referenceViews[type];
                const selected = type === recordType;
                return (
                  <Button
                    key={type}
                    minH="44px"
                    variant={selected ? 'solid' : 'ghost'}
                    colorPalette={selected ? 'green' : 'gray'}
                    aria-pressed={selected}
                    onClick={() => changeRecordType(type)}
                  >
                    <Icon as={option.icon} aria-hidden="true" /> {option.label}
                  </Button>
                );
              })}
            </HStack>
            <Box minW={0} maxW="640px">
              <Text fontWeight="700" color="text.primary">{view.heading}</Text>
              <Text mt={1} fontSize="sm" color="text.muted">{view.description}</Text>
            </Box>
          </Flex>
        </Card.Body>
      </Card.Root>

      {!loading && !loadError && groups.length > 0 && (
        <SimpleGrid columns={{ base: 1, md: 3 }} gap={4} mb={6}>
          {[
            { label: 'Registry', value: view.label },
            { label: 'Reference groups', value: groups.length },
            { label: 'Management access', value: 'Administrator' },
          ].map((item) => (
            <Box key={item.label} p={4} bg="surface.muted" borderRadius="md" borderWidth="1px" borderColor="border">
              <Text fontSize="sm" color="text.muted">{item.label}</Text>
              <Text fontWeight="700" mt={1}>{item.value}</Text>
            </Box>
          ))}
        </SimpleGrid>
      )}

      {loading ? (
        <VStack align="stretch" gap={5} aria-label={`Loading ${view.label} reference data`}>
          {Array.from({ length: 3 }, (_, index) => <Skeleton key={index} height="260px" borderRadius="lg" />)}
        </VStack>
      ) : loadError ? (
        <Card.Root borderColor="border" borderRadius="lg" boxShadow="panel">
          <Card.Body py={12} textAlign="center" role="alert">
            <Icon as={LuDatabase} boxSize="28px" color="text.muted" aria-hidden="true" />
            <Heading as="h2" size="md" mt={4}>Reference data could not be loaded</Heading>
            <Text mt={2} color="text.muted">Check the connection, then retry this registry.</Text>
            <Button mt={5} minH="44px" variant="outline" onClick={() => void loadGroups()}>
              <LuRefreshCw aria-hidden="true" /> Retry
            </Button>
          </Card.Body>
        </Card.Root>
      ) : groups.length === 0 ? (
        <Card.Root borderColor="border" borderRadius="lg" boxShadow="panel">
          <Card.Body py={12} textAlign="center">
            <Icon as={view.icon} boxSize="28px" color="text.muted" aria-hidden="true" />
            <Heading as="h2" size="md" mt={4}>No {view.label.toLowerCase()} reference groups</Heading>
            <Text mt={2} color="text.muted">Reference groups for this registry have not been configured yet.</Text>
          </Card.Body>
        </Card.Root>
      ) : (
        <VStack align="stretch" gap={0}>
          {groups.map((group) => <GroupCard key={group.code} group={group} />)}
        </VStack>
      )}
    </DashboardLayout>
  );
};

export default ReferenceDataPage;
