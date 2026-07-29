import { Box, HStack, IconButton, Image, Text } from '@chakra-ui/react';
import { LuMenu } from 'react-icons/lu';

type TopBarProps = {
  onOpenNavigation?: () => void;
};

export const TopBar = ({ onOpenNavigation }: TopBarProps) => (
  <Box
      as="header"
      minH="64px"
      bg="surface"
      borderBottom="1px solid"
      borderColor="border"
      px={{ base: 3, sm: 4, md: 6, xl: 8 }}
      display="flex"
      alignItems="center"
      justifyContent="flex-start"
      position="sticky"
      top={0}
      zIndex={10}
    >
    <HStack gap={3} minW={0}>
        <IconButton
          aria-label="Open navigation"
          variant="ghost"
          minW="44px"
          minH="44px"
          display={{ base: 'inline-flex', lg: 'none' }}
          onClick={onOpenNavigation}
        >
          <LuMenu />
        </IconButton>

        <HStack display={{ base: 'flex', lg: 'none' }} gap={2} minW={0}>
          <Image src="/brand/lydo-logo.png" alt="Boac LYDS logo" w={{ base: '32px', sm: '38px' }} h={{ base: '24px', sm: '28px' }} objectFit="contain" />
          <Text fontWeight="700" color="primary.800" fontFamily="heading" fontSize={{ base: 'sm', sm: 'md' }} truncate>
            Boac Youth
          </Text>
        </HStack>

        <Box display={{ base: 'none', lg: 'block' }} minW={0}>
          <Text fontFamily="heading" fontSize="sm" fontWeight="650" color="text.primary">
            Local Youth Development Office
          </Text>
          <Text mt={0.5} fontSize="xs" color="text.muted">
            Municipality of Boac, Marinduque
          </Text>
        </Box>
    </HStack>
  </Box>
);

export default TopBar;
