import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
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
  Text,
} from '@chakra-ui/react';
import {
  LuArchive,
  LuBaby,
  LuFilePlus2,
  LuListChecks,
  LuPencil,
  LuTrash2,
  LuUsersRound,
} from 'react-icons/lu';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { showToast } from '../../../../shared/toast';
import {
  categoryApi,
  type Category,
  type CategoryRecordType,
} from '../../infrastructure/category-api';
import { categoriesForRegistry } from '../../domain/category-scope';
import { DashboardLayout } from '../../../dashboard/presentation/pages/DashboardPage';
import { ConfirmDialog } from '../../../../shared/components/ConfirmDialog';

const categoryViews: Record<CategoryRecordType, {
  label: string;
  description: string;
  icon: typeof LuUsersRound;
  query: string;
}> = {
  YOUTH_PROFILE: {
    label: 'Youth Registry',
    description: 'Annual youth profile datasets and their custom registration fields.',
    icon: LuUsersRound,
    query: 'youth',
  },
  CHILD_LABORER: {
    label: 'Child Laborer',
    description: 'Protected child labor monitoring datasets and case-specific custom fields.',
    icon: LuBaby,
    query: 'child-laborer',
  },
};

const StatusBadge = ({ status }: { status: string }) => {
  const colorMap: Record<string, string> = {
    DRAFT: 'gray',
    PUBLISHED: 'green',
    ARCHIVED: 'red',
  };
  return <Badge colorPalette={colorMap[status] || 'gray'} variant="subtle">{status}</Badge>;
};

const CategoryListPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const recordType: CategoryRecordType = searchParams.get('type') === 'child-laborer'
    ? 'CHILD_LABORER'
    : 'YOUTH_PROFILE';
  const view = categoryViews[recordType];
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<{
    category: Category;
    action: 'publish' | 'archive' | 'delete';
  } | null>(null);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      const response = await categoryApi.list(recordType);
      setCategories(categoriesForRegistry(response.data, recordType));
    } catch (error) {
      showToast.error({
        title: 'Could not load categories',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setLoading(false);
    }
  }, [recordType]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  const changeRecordType = (nextType: CategoryRecordType) => {
    const nextParams = new URLSearchParams(searchParams);
    if (nextType === 'CHILD_LABORER') nextParams.set('type', 'child-laborer');
    else nextParams.delete('type');
    setSearchParams(nextParams, { replace: true });
  };

  const handleAction = async (category: Category, action: 'publish' | 'archive' | 'delete') => {
    try {
      if (action === 'publish') await categoryApi.publish(category.id);
      else if (action === 'archive') await categoryApi.archive(category.id);
      else await categoryApi.delete(category.id);
      showToast.success(action === 'publish'
        ? 'Category published'
        : action === 'archive' ? 'Category archived' : 'Category deleted');
      await loadCategories();
    } catch (error) {
      showToast.error({
        title: `Could not ${action} category`,
        description: error instanceof Error ? error.message : 'Please try again.',
      });
      throw error;
    }
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Categories"
        description="Create annual datasets and define the fields available to each registry."
        actions={(
          <Button
            colorPalette="green"
            minH="44px"
            onClick={() => navigate(`/categories/new?type=${view.query}`)}
          >
            <LuFilePlus2 aria-hidden="true" /> Add {view.label} Category
          </Button>
        )}
      />

      <Card.Root mb={5} borderColor="border" borderRadius="lg" boxShadow="panel">
        <Card.Body p={{ base: 3, md: 4 }}>
          <Flex align={{ base: 'stretch', md: 'center' }} justify="space-between" direction={{ base: 'column', md: 'row' }} gap={4}>
            <HStack role="group" aria-label="Category registry" gap={2} wrap="wrap">
              {(Object.keys(categoryViews) as CategoryRecordType[]).map((type) => {
                const option = categoryViews[type];
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
            <Box minW={0} maxW="620px">
              <Text fontWeight="700" color="text.primary">{view.label} categories</Text>
              <Text mt={1} fontSize="sm" color="text.muted">{view.description}</Text>
            </Box>
          </Flex>
        </Card.Body>
      </Card.Root>

      {loading ? (
        <SimpleGrid columns={{ base: 1, lg: 2 }} gap={4} aria-label="Loading categories">
          {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} height="260px" borderRadius="lg" />)}
        </SimpleGrid>
      ) : categories.length === 0 ? (
        <Card.Root borderColor="border" borderRadius="lg" boxShadow="panel">
          <Card.Body py={12} textAlign="center">
            <Flex mx="auto" boxSize="48px" align="center" justify="center" borderRadius="lg" bg="primary.50" color="primary.700">
              <Icon as={view.icon} boxSize="24px" aria-hidden="true" />
            </Flex>
            <Heading as="h2" size="md" mt={4}>No {view.label.toLowerCase()} categories yet</Heading>
            <Text mt={2} color="text.muted">Create the first annual dataset for this registry.</Text>
            <Button mt={5} minH="44px" colorPalette="green" onClick={() => navigate(`/categories/new?type=${view.query}`)}>
              <LuFilePlus2 aria-hidden="true" /> Add Category
            </Button>
          </Card.Body>
        </Card.Root>
      ) : (
        <SimpleGrid columns={{ base: 1, lg: 2 }} gap={4}>
          {categories.map((category) => (
            <Card.Root key={category.id} borderColor="border" borderRadius="lg" boxShadow="panel">
              <Card.Header p={{ base: 4, md: 5 }} pb={3}>
                <Flex justify="space-between" align="flex-start" gap={4}>
                  <Box minW={0}>
                    <Text fontSize="xs" color="text.muted" fontWeight="700" letterSpacing="0.06em">{category.code}</Text>
                    <Heading as="h2" size="md" mt={2}>{category.name}</Heading>
                    {category.description && <Text mt={2} fontSize="sm" color="text.muted" lineClamp={2}>{category.description}</Text>}
                  </Box>
                  <StatusBadge status={category.status || 'DRAFT'} />
                </Flex>
              </Card.Header>
              <Card.Body px={{ base: 4, md: 5 }} py={3}>
                <SimpleGrid columns={2} gap={3}>
                  {[
                    { label: 'Filing year', value: category.filing_year },
                    { label: 'Records', value: (category.record_count ?? 0).toLocaleString() },
                    { label: 'Custom fields', value: (category.field_count ?? 0).toLocaleString() },
                    { label: 'Access', value: category.permission_mode.replace(/_/g, ' ') },
                  ].map((item) => (
                    <Box key={item.label} p={3} bg="surface.muted" borderRadius="md">
                      <Text fontSize="xs" color="text.muted">{item.label}</Text>
                      <Text mt={1} fontWeight="700" fontSize="sm" textTransform={item.label === 'Access' ? 'capitalize' : undefined}>{item.value}</Text>
                    </Box>
                  ))}
                </SimpleGrid>
              </Card.Body>
              <Card.Footer px={{ base: 4, md: 5 }} py={4} gap={2} flexWrap="wrap" borderTopWidth="1px" borderColor="border">
                <Button minH="44px" variant="outline" onClick={() => navigate(`/categories/${category.id}/edit`)}>
                  <LuPencil aria-hidden="true" /> Edit
                </Button>
                <Button minH="44px" variant="outline" onClick={() => navigate(`/categories/${category.id}/fields`)}>
                  <LuListChecks aria-hidden="true" /> Fields
                </Button>
                {category.status === 'DRAFT' && (
                  <Button minH="44px" colorPalette="green" onClick={() => setPendingAction({ category, action: 'publish' })}>Publish</Button>
                )}
                {category.status !== 'ARCHIVED' ? (
                  <Button minH="44px" ml={{ sm: 'auto' }} colorPalette="red" variant="outline" onClick={() => setPendingAction({ category, action: 'archive' })}>
                    <LuArchive aria-hidden="true" /> Archive
                  </Button>
                ) : (
                  <Button minH="44px" ml={{ sm: 'auto' }} colorPalette="red" onClick={() => setPendingAction({ category, action: 'delete' })}>
                    <LuTrash2 aria-hidden="true" /> Delete
                  </Button>
                )}
              </Card.Footer>
            </Card.Root>
          ))}
        </SimpleGrid>
      )}

      <ConfirmDialog
        open={!!pendingAction}
        onOpenChange={({ open }) => { if (!open) setPendingAction(null); }}
        title={pendingAction?.action === 'publish'
          ? 'Publish this category?'
          : pendingAction?.action === 'archive'
            ? 'Archive this category?'
            : 'Delete this archived category?'}
        description={pendingAction?.action === 'publish'
          ? `${pendingAction.category.name} will become available for new ${view.label.toLowerCase()} records.`
          : pendingAction?.action === 'archive'
            ? `${pendingAction?.category.name ?? 'This category'} will no longer accept new records. Existing records remain accessible.`
            : `${pendingAction?.category.name ?? 'This category'} will be hidden. Existing records retain their historical category.`}
        confirmLabel={pendingAction?.action === 'publish' ? 'Publish' : pendingAction?.action === 'archive' ? 'Archive' : 'Delete'}
        variant={pendingAction?.action === 'publish' ? 'default' : 'danger'}
        onConfirm={() => pendingAction
          ? handleAction(pendingAction.category, pendingAction.action)
          : undefined}
      />
    </DashboardLayout>
  );
};

export default CategoryListPage;
