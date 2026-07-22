import { Box, Button, HStack, IconButton, Image, VStack, Text, Badge } from '@chakra-ui/react';
import { Link as RouterLink, useLocation } from 'react-router';
import { useSelector } from 'react-redux';
import { type RootState } from '../../../../redux/store';
import { LuX } from 'react-icons/lu';

const adminLinks = [
  { label: 'Dashboard', path: '/' },
  { label: 'Youth Records', path: '/youth-records' },
  { label: 'Imports', path: '/imports' },
  { label: 'Reports', path: '/reports' },
  { label: 'Announcements', path: '/announcements' },
  { label: 'Barangays', path: '/barangays' },
  { label: 'SK Accounts', path: '/accounts' },
  { label: 'Categories', path: '/categories' },
  { label: 'Reference Data', path: '/reference-data' },
  { label: 'Audit Logs', path: '/audit-logs' },
];

const skLinks = [
  { label: 'Dashboard', path: '/' },
  { label: 'Youth Records', path: '/youth-records' },
  { label: 'Add Record', path: '/youth-records/new' },
  { label: 'Bulk Import', path: '/imports/new' },
  { label: 'Reports', path: '/reports' },
  { label: 'Announcements', path: '/announcements' },
];

type SidebarProps = {
  isOpen?: boolean;
  onClose?: () => void;
};

export const Sidebar = ({ isOpen = false, onClose }: SidebarProps) => {
  const profile = useSelector((state: RootState) => state.auth.profile);
  const location = useLocation();
  const links = profile?.role === 'ADMIN' ? adminLinks : skLinks;

  return (
    <Box
      as="nav"
      aria-label="Primary navigation"
      w={{ base: '280px', lg: '256px' }}
      h="100dvh"
      bg="white"
      borderRight="1px solid"
      borderColor="border"
      position="fixed"
      left={0}
      top={0}
      p={4}
      display="flex"
      flexDirection="column"
      zIndex={30}
      transform={{ base: isOpen ? 'translateX(0)' : 'translateX(-100%)', lg: 'translateX(0)' }}
      transition="transform 180ms ease-out"
    >
      <HStack justify="space-between" mb={6}>
        <Box>
          <HStack gap={3} align="center">
            <Image src="/brand/lydo-logo.png" alt="LYDO logo" w="44px" h="34px" objectFit="contain" />
            <Box>
              <Text fontWeight="700" color="primary.700" fontSize="lg" fontFamily="heading" lineHeight="1">SK Youth IMS</Text>
              <Badge colorPalette="green" mt={1}>{profile?.role}</Badge>
            </Box>
          </HStack>
        </Box>
        <IconButton
          aria-label="Close navigation"
          variant="ghost"
          display={{ base: 'inline-flex', lg: 'none' }}
          onClick={onClose}
        >
          <LuX />
        </IconButton>
      </HStack>

      <VStack gap={1} align="stretch" flex={1}>
        {links.map((link) => {
          const isActive = link.path === '/' ? location.pathname === '/' : location.pathname.startsWith(link.path);
          return (
            <Button
              asChild
              key={link.path}
              justifyContent="flex-start"
              variant={isActive ? 'subtle' : 'ghost'}
              colorPalette={isActive ? 'green' : 'gray'}
              fontWeight={isActive ? '600' : '400'}
              size="sm"
              onClick={onClose}
            >
              <RouterLink to={link.path}>{link.label}</RouterLink>
            </Button>
          );
        })}
      </VStack>

      {profile?.role === 'SK_OFFICIAL' && profile.barangayId && (
        <Box mt="auto" p={3} bg="surface.muted" borderRadius="md">
          <Text fontSize="xs" color="text.muted">Assigned Barangay</Text>
          <Text fontSize="sm" fontWeight="500">{profile.barangayId}</Text>
        </Box>
      )}
    </Box>
  );
};

export default Sidebar;
