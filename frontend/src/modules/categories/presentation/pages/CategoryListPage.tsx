import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Button, HStack, Badge, SimpleGrid, Card, Text, VStack, Heading } from '@chakra-ui/react';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { showToast } from '../../../../shared/toast';
import { categoryApi, type Category } from '../../infrastructure/category-api';
import { DashboardLayout } from '../../../dashboard/presentation/pages/DashboardPage';
import { ConfirmDialog } from '../../../../shared/components/ConfirmDialog';

const StatusBadge = ({ status }: { status: string }) => {
  const colorMap: Record<string, string> = {
    DRAFT: 'gray',
    PUBLISHED: 'green',
    ARCHIVED: 'red',
  };
  return <Badge colorPalette={colorMap[status] || 'gray'}>{status}</Badge>;
};

const CategoryListPage = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<{ category: Category; action: 'publish' | 'archive' } | null>(null);

  const loadCategories = async () => {
    try {
      const res = await categoryApi.list();
      setCategories(res.data);
    } catch {
      showToast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handlePublish = async (id: string) => {
    try {
      await categoryApi.publish(id);
      showToast.success('Category published');
      loadCategories();
    } catch {
      showToast.error('Failed to publish category');
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await categoryApi.archive(id);
      showToast.success('Category archived');
      loadCategories();
    } catch {
      showToast.error('Failed to archive category');
    }
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Categories"
        description="Configure datasets, permissions, and published form fields."
        actions={(
          <Button colorPalette="green" onClick={() => navigate('/categories/new')}>
            Add Category
          </Button>
        )}
      />

      <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
        {categories.map((cat) => (
          <Card.Root key={cat.id} borderColor="border" borderRadius="lg">
            <Card.Header>
              <HStack justify="space-between">
                <Text fontFamily="mono" fontSize="sm" color="gray.500">{cat.code}</Text>
                <StatusBadge status={cat.status || 'DRAFT'} />
              </HStack>
              <Heading size="md" mt={2}>{cat.name}</Heading>
            </Card.Header>
            <Card.Body>
              <VStack align="start" gap={1}>
                <Text fontSize="sm">Permission: {cat.permission_mode}</Text>
                <Text fontSize="sm">Records: {cat.record_count || 0}</Text>
                <Text fontSize="sm">Fields: {cat.field_count || 0}</Text>
              </VStack>
            </Card.Body>
            <Card.Footer>
              <HStack gap={2} wrap="wrap">
                <Button size="sm" variant="outline" onClick={() => navigate(`/categories/${cat.id}/edit`)}>Edit</Button>
                <Button size="sm" variant="outline" onClick={() => navigate(`/categories/${cat.id}/fields`)}>Fields</Button>
                {cat.status === 'DRAFT' && (
                  <Button size="sm" colorPalette="green" onClick={() => setPendingAction({ category: cat, action: 'publish' })}>Publish</Button>
                )}
                {cat.status !== 'ARCHIVED' && (
                  <Button size="sm" colorPalette="red" variant="outline" onClick={() => setPendingAction({ category: cat, action: 'archive' })}>Archive</Button>
                )}
              </HStack>
            </Card.Footer>
          </Card.Root>
        ))}
      </SimpleGrid>
      {!loading && categories.length === 0 && (
        <Text color="gray.500" textAlign="center" mt={8}>No categories found.</Text>
      )}
      <ConfirmDialog
        open={!!pendingAction}
        onOpenChange={({ open }) => { if (!open) setPendingAction(null); }}
        title={pendingAction?.action === 'publish' ? 'Publish this category?' : 'Archive this category?'}
        description={pendingAction?.action === 'publish'
          ? `${pendingAction.category.name} will become available for new youth records. Review its fields before continuing.`
          : `${pendingAction?.category.name ?? 'This category'} will no longer be available for new records. Existing records will remain accessible.`}
        confirmLabel={pendingAction?.action === 'publish' ? 'Publish' : 'Archive'}
        variant={pendingAction?.action === 'archive' ? 'danger' : 'default'}
        onConfirm={() => pendingAction?.action === 'publish'
          ? handlePublish(pendingAction.category.id)
          : pendingAction ? handleArchive(pendingAction.category.id) : undefined}
      />
    </DashboardLayout>
  );
};

export default CategoryListPage;
