import { Badge, HStack, Circle, Text } from '@chakra-ui/react';

type Status = 'DRAFT' | 'SUBMITTED' | 'RETURNED' | 'APPROVED' | 'ARCHIVED' | 'ACTIVE' | 'INACTIVE';

const statusConfig: Record<Status, { bg: string; color: string; label: string }> = {
  DRAFT:     { bg: 'surface.muted',  color: 'text.secondary',  label: 'Draft' },
  SUBMITTED: { bg: 'info.light',     color: 'info',            label: 'Submitted' },
  RETURNED:  { bg: 'warning.light',  color: 'warning',         label: 'Returned' },
  APPROVED:  { bg: 'success.light',  color: 'success',         label: 'Approved' },
  ARCHIVED:  { bg: 'surface.muted',  color: 'text.muted',      label: 'Archived' },
  ACTIVE:    { bg: 'success.light',  color: 'success',         label: 'Active' },
  INACTIVE:  { bg: 'surface.muted',  color: 'text.muted',      label: 'Inactive' },
};

export const StatusBadge = ({ status }: { status: Status }) => {
  const config = statusConfig[status];
  return (
    <Badge bg={config.bg} color={config.color} px="8px" py="2px" borderRadius="4px"
           textTransform="uppercase" letterSpacing="0" fontSize="xs" fontWeight="500"
           fontFamily="heading">
      <HStack gap="4px">
        <Circle size="6px" bg={config.color} />
        <Text>{config.label}</Text>
      </HStack>
    </Badge>
  );
};
