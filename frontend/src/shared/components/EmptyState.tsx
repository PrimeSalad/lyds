import { Box, Text, VStack } from '@chakra-ui/react';
import { LuInbox } from 'react-icons/lu';

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export const EmptyState = ({ title, description, action }: EmptyStateProps) => (
  <VStack py={12} gap={4} color="text.muted">
    <LuInbox size={40} strokeWidth={1.5} />
    <Text fontFamily="heading" fontWeight="500" fontSize="lg" color="text.secondary">
      {title}
    </Text>
    {description && <Text fontSize="sm">{description}</Text>}
    {action && <Box mt={2}>{action}</Box>}
  </VStack>
);
