import { Box, Text, Button, HStack, IconButton, Image } from '@chakra-ui/react';
import { useSelector, useDispatch } from 'react-redux';
import { type RootState } from '../../../../redux/store';
import { clearProfile } from '../../../auth/application/auth-store';
import { authApi } from '../../../auth/infrastructure/auth-api';
import { useNavigate } from 'react-router';
import { LuMenu } from 'react-icons/lu';

type TopBarProps = {
  onOpenNavigation?: () => void;
};

export const TopBar = ({ onOpenNavigation }: TopBarProps) => {
  const profile = useSelector((state: RootState) => state.auth.profile);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await authApi.signOut();
    dispatch(clearProfile());
    navigate('/login');
  };

  return (
    <Box
      as="header"
      h="64px"
      bg="white"
      borderBottom="1px solid"
      borderColor="border"
      px={6}
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
        <HStack display={{ base: 'none', sm: 'flex', lg: 'none' }} gap={2}>
          <Image src="/brand/lydo-logo.png" alt="LYDO logo" w="38px" h="28px" objectFit="contain" />
          <Text fontWeight="700" color="primary.700" fontFamily="heading">
            SK Youth IMS
          </Text>
        </HStack>
      </HStack>
      <HStack gap={4}>
        <Box textAlign="right">
          <Text fontSize="sm" fontWeight="500">{profile?.role}</Text>
        </Box>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          Sign Out
        </Button>
      </HStack>
    </Box>
  );
};

export default TopBar;
