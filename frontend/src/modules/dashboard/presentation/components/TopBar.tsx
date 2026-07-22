import { useState } from 'react';
import { Box, Text, Button, HStack, IconButton, Image } from '@chakra-ui/react';
import { useSelector, useDispatch } from 'react-redux';
import { type RootState } from '../../../../redux/store';
import { clearProfile } from '../../../auth/application/auth-store';
import { authApi } from '../../../auth/infrastructure/auth-api';
import { useNavigate } from 'react-router';
import { LuLogOut, LuMenu, LuShieldCheck } from 'react-icons/lu';
import { ConfirmDialog } from '../../../../shared/components/ConfirmDialog';
import { showToast } from '../../../../shared/toast';

type TopBarProps = {
  onOpenNavigation?: () => void;
};

export const TopBar = ({ onOpenNavigation }: TopBarProps) => {
  const profile = useSelector((state: RootState) => state.auth.profile);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await authApi.signOut();
      dispatch(clearProfile());
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
        as="header"
        h="64px"
        bg="white"
        borderBottom="1px solid"
        borderColor="border"
        px={{ base: 3, sm: 4, md: 6 }}
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        position="sticky"
        top={0}
        zIndex={10}
      >
        <HStack gap={3}>
          <IconButton
            aria-label="Open navigation"
            variant="ghost"
            display={{ base: 'inline-flex', lg: 'none' }}
            onClick={onOpenNavigation}
          >
            <LuMenu />
          </IconButton>
          <HStack display={{ base: 'flex', lg: 'none' }} gap={2}>
            <Image src="/brand/lydo-logo.png" alt="Boac LYDS logo" w={{ base: '32px', sm: '38px' }} h={{ base: '24px', sm: '28px' }} objectFit="contain" />
            <Text fontWeight="700" color="primary.800" fontFamily="heading" fontSize={{ base: 'sm', sm: 'md' }}>
              Boac Youth
            </Text>
          </HStack>
        </HStack>
        <HStack gap={{ base: 2, sm: 4 }}>
          <HStack gap={2} display={{ base: 'none', sm: 'flex' }} color="text.secondary">
            <LuShieldCheck aria-hidden="true" />
            <Box textAlign="right">
              <Text fontSize="sm" fontWeight="600">
                {profile?.role === 'SK_OFFICIAL' ? 'SK Official' : 'Administrator'}
              </Text>
            </Box>
          </HStack>
          <Button variant="ghost" size="sm" minH="44px" onClick={() => setLogoutDialogOpen(true)}>
            <LuLogOut />
            <Text display={{ base: 'none', sm: 'inline' }}>Sign Out</Text>
          </Button>
        </HStack>
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

export default TopBar;
