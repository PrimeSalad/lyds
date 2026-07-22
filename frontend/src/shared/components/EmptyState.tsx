import { Box, Text, VStack } from '@chakra-ui/react';
import { LuInbox } from 'react-icons/lu';

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export const EmptyState = ({ title, description, action }: EmptyStateProps) => (
  <VStack py={{ base: 10, md: 14 }} px={4} gap={3} color="text.muted" textAlign="center">
    <Box p={3} bg="surface.muted" borderRadius="md" color="text.secondary">
      <LuInbox size={28} strokeWidth={1.7} />
    </Box>
    <Text fontFamily="heading" fontWeight="500" fontSize="lg" color="text.secondary">
      {title}
    </Text>
    {description && <Text fontSize="sm" maxW="48ch">{description}</Text>}
    {action && <Box mt={2}>{action}</Box>}
  </VStack>
);
