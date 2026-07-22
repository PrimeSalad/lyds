import { useEffect, useMemo, useState } from 'react';
import { Badge, Box, Button, Card, HStack, NativeSelect, SimpleGrid, Spinner, Text, Textarea, VStack } from '@chakra-ui/react';
import { useSelector } from 'react-redux';
import { type RootState } from '../../../../redux/store';
import { barangayApi, type Barangay } from '../../../barangays/infrastructure/barangay-api';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { SelectField, TextField } from '../../../../shared/forms/FormFields';
import { showToast } from '../../../../shared/toast';
import {
  announcementApi,
  type Announcement,
  type AnnouncementAudience,
} from '../../infrastructure/announcement-api';
import { DashboardLayout } from '../../../dashboard/presentation/pages/DashboardPage';

const audienceOptions = [
  { value: 'ALL', label: 'Everyone' },
  { value: 'SK_OFFICIAL', label: 'SK officials' },
  { value: 'ADMIN', label: 'Administrators' },
];

const formatDate = (value: string | null) => {
  if (!value) return 'No expiry';
  return new Date(value).toLocaleDateString();
};

const AnnouncementListPage = () => {
  const profile = useSelector((state: RootState) => state.auth.profile);
  const isAdmin = profile?.role === 'ADMIN';

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [barangays, setBarangays] = useState<Barangay[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<AnnouncementAudience>('ALL');
  const [barangayId, setBarangayId] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  const barangayNameById = useMemo(
    () => new Map(barangays.map((barangay) => [barangay.id, barangay.name])),
    [barangays],
  );

  const loadAnnouncements = async () => {
    setLoading(true);
    try {
      const [announcementData, barangayData] = await Promise.all([
        announcementApi.list(),
        isAdmin ? barangayApi.list() : Promise.resolve([]),
      ]);
      setAnnouncements(announcementData);
      setBarangays(barangayData);
    } catch {
      showToast.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnnouncements();
  }, [isAdmin]);

  const resetForm = () => {
    setTitle('');
    setBody('');
    setAudience('ALL');
    setBarangayId('');
    setExpiresAt('');
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await announcementApi.create({
        title,
        body,
        audience,
        barangay_id: barangayId || null,
        expires_at: expiresAt ? new Date(`${expiresAt}T23:59:59`).toISOString() : null,
      });
      showToast.success('Announcement published');
      resetForm();
      loadAnnouncements();
    } catch {
      showToast.error('Failed to publish announcement');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await announcementApi.archive(id);
      showToast.success('Announcement archived');
      loadAnnouncements();
    } catch {
      showToast.error('Failed to archive announcement');
    }
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Announcements"
        description={isAdmin ? 'Publish operational updates for all users or one barangay.' : 'Read official updates from administrators.'}
      />

      <SimpleGrid columns={{ base: 1, xl: isAdmin ? 2 : 1 }} gap={6} alignItems="start">
        {isAdmin && (
          <Card.Root borderColor="border" borderRadius="lg">
            <Card.Header>
              <Text fontFamily="heading" fontWeight="600">New Announcement</Text>
            </Card.Header>
            <Card.Body>
              <VStack as="form" align="stretch" gap={4} onSubmit={handleCreate}>
                <TextField label="Title" name="title" value={title} onChange={setTitle} required />
                <Box>
                  <Text mb={2} fontWeight="500">Message</Text>
                  <Textarea
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    rows={7}
                    required
                  />
                </Box>
                <SelectField
                  label="Audience"
                  name="audience"
                  value={audience}
                  onChange={(value) => setAudience(value as AnnouncementAudience)}
                  options={audienceOptions}
                  required
                />
                <Box>
                  <Text mb={2} fontWeight="500">Barangay Scope</Text>
                  <NativeSelect.Root>
                    <NativeSelect.Field value={barangayId} onChange={(event) => setBarangayId(event.target.value)}>
                      <option value="">All barangays</option>
                      {barangays.map((barangay) => (
                        <option key={barangay.id} value={barangay.id}>
                          {barangay.name}
                        </option>
                      ))}
                    </NativeSelect.Field>
                    <NativeSelect.Indicator />
                  </NativeSelect.Root>
                </Box>
                <TextField label="Expiry Date" name="expiresAt" type="date" value={expiresAt} onChange={setExpiresAt} />
                <Button type="submit" colorPalette="green" loading={saving} disabled={!title.trim() || !body.trim()}>
                  Publish Announcement
                </Button>
              </VStack>
            </Card.Body>
          </Card.Root>
        )}

        <VStack align="stretch" gap={4}>
          {loading ? (
            <Box py={10} textAlign="center">
              <Spinner size="lg" color="primary.600" />
            </Box>
          ) : announcements.length === 0 ? (
            <Card.Root borderColor="border" borderRadius="lg">
              <Card.Body py={10} textAlign="center">
                <Text color="text.muted">No announcements yet.</Text>
              </Card.Body>
            </Card.Root>
          ) : (
            announcements.map((announcement) => (
              <Card.Root key={announcement.id} borderColor="border" borderRadius="lg">
                <Card.Body>
                  <VStack align="stretch" gap={3}>
                    <HStack justify="space-between" align="flex-start" wrap="wrap" gap={3}>
                      <Box>
                        <Text fontFamily="heading" fontWeight="600" fontSize="lg">
                          {announcement.title}
                        </Text>
                        <HStack gap={2} wrap="wrap" mt={2}>
                          <Badge colorPalette={announcement.status === 'PUBLISHED' ? 'green' : 'gray'}>
                            {announcement.status}
                          </Badge>
                          <Badge colorPalette="blue">{announcement.audience.replace('_', ' ')}</Badge>
                          <Badge colorPalette="gray">
                            {announcement.barangay_id ? barangayNameById.get(announcement.barangay_id) ?? 'Selected barangay' : 'All barangays'}
                          </Badge>
                        </HStack>
                      </Box>
                      {isAdmin && announcement.status === 'PUBLISHED' && (
                        <Button size="sm" variant="outline" colorPalette="red" onClick={() => handleArchive(announcement.id)}>
                          Archive
                        </Button>
                      )}
                    </HStack>
                    <Text whiteSpace="pre-wrap" color="text.secondary">{announcement.body}</Text>
                    <Text color="text.muted" fontSize="sm">
                      Posted {new Date(announcement.created_at).toLocaleString()} · {formatDate(announcement.expires_at)}
                    </Text>
                  </VStack>
                </Card.Body>
              </Card.Root>
            ))
          )}
        </VStack>
      </SimpleGrid>
    </DashboardLayout>
  );
};

export default AnnouncementListPage;
