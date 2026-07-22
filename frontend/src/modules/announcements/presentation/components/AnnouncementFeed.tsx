import { useEffect, useState } from 'react';
import { Badge, Button, Card, HStack, Spinner, Text, VStack } from '@chakra-ui/react';
import { useNavigate } from 'react-router';
import { announcementApi, type Announcement } from '../../infrastructure/announcement-api';

export const AnnouncementFeed = () => {
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    announcementApi
      .list()
      .then((data) => setAnnouncements(data.slice(0, 3)))
      .catch(() => setAnnouncements([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Card.Root borderColor="border" borderRadius="lg">
      <Card.Header>
        <HStack justify="space-between" align="center">
          <Text fontFamily="heading" fontWeight="600">Announcements</Text>
          <Button size="sm" variant="ghost" onClick={() => navigate('/announcements')}>
            View All
          </Button>
        </HStack>
      </Card.Header>
      <Card.Body pt={0}>
        {loading ? (
          <HStack py={4}>
            <Spinner size="sm" color="primary.600" />
            <Text color="text.muted" fontSize="sm">Loading announcements</Text>
          </HStack>
        ) : announcements.length === 0 ? (
          <Text color="text.muted" fontSize="sm">No active announcements.</Text>
        ) : (
          <VStack align="stretch" gap={3}>
            {announcements.map((announcement) => (
              <VStack key={announcement.id} align="stretch" gap={1} borderTop="1px solid" borderColor="border" pt={3}>
                <HStack gap={2} wrap="wrap">
                  <Text fontWeight="600">{announcement.title}</Text>
                  <Badge colorPalette={announcement.audience === 'ALL' ? 'green' : 'blue'}>{announcement.audience.replace('_', ' ')}</Badge>
                </HStack>
                <Text color="text.secondary" fontSize="sm" lineClamp={2}>
                  {announcement.body}
                </Text>
              </VStack>
            ))}
          </VStack>
        )}
      </Card.Body>
    </Card.Root>
  );
};
