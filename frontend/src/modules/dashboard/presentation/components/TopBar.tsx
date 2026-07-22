import { Box, Text, HStack, IconButton, Image } from '@chakra-ui/react';
import { LuMenu } from 'react-icons/lu';

type TopBarProps = {
  onOpenNavigation?: () => void;
};

export const TopBar = ({ onOpenNavigation }: TopBarProps) => {
  return (
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
    </Box>
  );
};

export default TopBar;
