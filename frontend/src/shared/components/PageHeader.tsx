import { Box, Flex, Heading, Text } from '@chakra-ui/react';

type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
};

export const PageHeader = ({ title, description, actions }: PageHeaderProps) => (
  <Flex justify="space-between" align={{ base: 'stretch', md: 'flex-start' }} direction={{ base: 'column', md: 'row' }} gap={4} mb={{ base: 5, md: 7 }}>
    <Box minW={0}>
      <Heading as="h1" fontSize={{ base: '1.5rem', md: '1.75rem' }} lineHeight="1.2" fontFamily="heading" fontWeight="700" color="text.primary">
        {title}
      </Heading>
      {description && (
        <Text mt={2} color="text.secondary" fontFamily="body" maxW="68ch" lineHeight="1.6">
          {description}
        </Text>
      )}
    </Box>
    {actions && <Flex gap={3} wrap="wrap" flexShrink={0} css={{ '& > *': { minHeight: '44px' } }}>{actions}</Flex>}
  </Flex>
);
