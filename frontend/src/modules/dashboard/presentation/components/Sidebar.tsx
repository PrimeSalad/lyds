import { useState } from 'react';
import { Box, Button, HStack, IconButton, Image, VStack, Text, Badge } from '@chakra-ui/react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import { type RootState } from '../../../../redux/store';
import { clearProfile } from '../../../auth/application/auth-store';
import { authApi } from '../../../auth/infrastructure/auth-api';
import { ConfirmDialog } from '../../../../shared/components/ConfirmDialog';
import { showToast } from '../../../../shared/toast';
import {
  LuChartNoAxesCombined,
  LuClipboardList,
  LuDatabase,
  LuFilePlus2,
  LuLayoutDashboard,
  LuListTree,
  LuLogOut,
  LuMapPin,
  LuMegaphone,
  LuUpload,
  LuUserCog,
  LuUsersRound,
  LuX,
} from 'react-icons/lu';

const adminLinks = [
  { label: 'Dashboard', path: '/', icon: LuLayoutDashboard },
  { label: 'Youth Records', path: '/youth-records', icon: LuUsersRound },
  { label: 'Imports', path: '/imports', icon: LuUpload },
  { label: 'Reports', path: '/reports', icon: LuChartNoAxesCombined },
  { label: 'Announcements', path: '/announcements', icon: LuMegaphone },
  { label: 'Barangays', path: '/barangays', icon: LuMapPin },
  { label: 'SK Accounts', path: '/accounts', icon: LuUserCog },
  { label: 'Categories', path: '/categories', icon: LuListTree },
  { label: 'Reference Data', path: '/reference-data', icon: LuDatabase },
  { label: 'Audit Logs', path: '/audit-logs', icon: LuClipboardList },
];

const skLinks = [
  { label: 'Dashboard', path: '/', icon: LuLayoutDashboard },
  { label: 'Youth Records', path: '/youth-records', icon: LuUsersRound },
  { label: 'Add Record', path: '/youth-records/new', icon: LuFilePlus2, exact: true },
  { label: 'Bulk Import', path: '/imports/new', icon: LuUpload, exact: true },
  { label: 'Reports', path: '/reports', icon: LuChartNoAxesCombined },
  { label: 'Announcements', path: '/announcements', icon: LuMegaphone },
];

type SidebarProps = {
  isOpen?: boolean;
  onClose?: () => void;
};

export const Sidebar = ({ isOpen = false, onClose }: SidebarProps) => {
  const profile = useSelector((state: RootState) => state.auth.profile);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const links = profile?.role === 'ADMIN' ? adminLinks : skLinks;
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await authApi.signOut();
      dispatch(clearProfile());
      onClose?.();
      navigate('/login');
    } catch (error) {
      showToast.error({
        title: 'Could not sign out',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
      throw error;
    }
  };

  return (
    <>
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
      px={3}
      py={4}
      display="flex"
      flexDirection="column"
      zIndex={30}
      transform={{ base: isOpen ? 'translateX(0)' : 'translateX(-100%)', lg: 'translateX(0)' }}
      transition="transform 200ms ease-out"
      boxShadow={{ base: 'xl', lg: 'none' }}
    >
      <HStack justify="space-between" mb={5} px={2}>
        <Box>
          <HStack gap={3} align="center">
            <Image src="/brand/lydo-logo.png" alt="Boac LYDS logo" w="48px" h="38px" objectFit="contain" />
            <Box>
              <Text fontWeight="750" color="primary.800" fontSize="md" fontFamily="heading" lineHeight="1.1">Boac Youth IMS</Text>
              <Badge colorPalette="green" variant="subtle" mt={1} fontSize="2xs">
                {profile?.role === 'SK_OFFICIAL' ? 'SK Official' : 'Administrator'}
              </Badge>
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

      <Text px={3} mb={2} fontSize="xs" fontWeight="700" color="text.muted" textTransform="uppercase">Workspace</Text>
      <VStack gap={1} align="stretch" flex={1} overflowY="auto">
        {links.map((link) => {
          const isExact = 'exact' in link && link.exact;
          const isActive = link.path === '/'
            ? location.pathname === '/'
            : isExact
              ? location.pathname === link.path
              : location.pathname.startsWith(link.path) && !links.some((candidate) => (
                  'exact' in candidate && candidate.exact && candidate.path === location.pathname
                ));
          const LinkIcon = link.icon;
          return (
            <Button
              asChild
              key={link.path}
              justifyContent="flex-start"
              variant="ghost"
              bg={isActive ? 'primary.50' : 'transparent'}
              color={isActive ? 'primary.800' : 'text.secondary'}
              borderLeft="3px solid"
              borderLeftColor={isActive ? 'primary.600' : 'transparent'}
              fontWeight={isActive ? '700' : '500'}
              minH="44px"
              px={3}
              _hover={{ bg: isActive ? 'primary.100' : 'surface.muted', color: 'text.primary' }}
              onClick={onClose}
            >
              <RouterLink to={link.path} aria-current={isActive ? 'page' : undefined}>
                <LinkIcon size={18} aria-hidden="true" />
                {link.label}
              </RouterLink>
            </Button>
          );
        })}
      </VStack>

      {profile?.role === 'SK_OFFICIAL' && profile.barangayId && (
        <Box mt={3} p={3} bg="surface.muted" borderRadius="md" borderWidth="1px" borderColor="border">
          <Text fontSize="xs" color="text.muted">Data access</Text>
          <Text fontSize="sm" fontWeight="600">Assigned barangay only</Text>
        </Box>
      )}
      <Box mt={3} pt={3} borderTop="1px solid" borderColor="border">
        <Button
          width="full"
          minH="44px"
          variant="ghost"
          justifyContent="flex-start"
          color="danger"
          _hover={{ bg: 'danger.light', color: 'danger' }}
          onClick={() => setLogoutDialogOpen(true)}
        >
          <LuLogOut />
          Sign Out
        </Button>
      </Box>
      </Box>
      <ConfirmDialog
        open={logoutDialogOpen}
        onOpenChange={({ open }) => setLogoutDialogOpen(open)}
        title="Sign out of this account?"
        description="Any unsaved changes on the current page will be lost."
        confirmLabel="Sign Out"
        onConfirm={handleLogout}
      />
    </>
  );
};

export default Sidebar;
