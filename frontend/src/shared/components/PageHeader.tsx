import { Box, Flex, Heading, Text } from '@chakra-ui/react';

type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
};

export const PageHeader = ({ title, description, actions }: PageHeaderProps) => (
  <Flex justify="space-between" align={{ base: 'stretch', sm: 'flex-start' }} direction={{ base: 'column', sm: 'row' }} gap={4} mb={6}>
    <Box>
      <Heading as="h1" size="lg" fontFamily="heading" fontWeight="600" color="text.primary">
        {title}
      </Heading>
      {description && (
        <Text mt={1} color="text.secondary" fontFamily="body">
          {description}
        </Text>
      )}
    </Box>
    {actions && <Flex gap={3} wrap="wrap">{actions}</Flex>}
  </Flex>
);
