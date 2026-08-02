import {
  Badge,
  Box,
  Card,
  Flex,
  HStack,
  Skeleton,
  Table,
  Text,
  VStack,
} from '@chakra-ui/react';
import {
  LuCircleAlert,
  LuCircleCheck,
  LuCopy,
  LuInfo,
} from 'react-icons/lu';
import { Pagination } from '../../../../shared/components/Pagination';
import type { ImportRow, PaginationMeta } from '../../infrastructure/import-api';

type ImportValidationTableProps = {
  rows: ImportRow[];
  loading: boolean;
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
};

type ValidationOutcome = 'READY' | 'DUPLICATE' | 'NEEDS_CORRECTION';

const outcomeFor = (row: ImportRow): ValidationOutcome => {
  if (row.is_duplicate) return 'DUPLICATE';
  return row.is_valid ? 'READY' : 'NEEDS_CORRECTION';
};

const outcomeConfig: Record<ValidationOutcome, {
  label: string;
  color: 'green' | 'orange' | 'red';
  borderColor: string;
  icon: typeof LuCircleCheck;
}> = {
  READY: {
    label: 'Ready to import',
    color: 'green',
    borderColor: 'green.400',
    icon: LuCircleCheck,
  },
  DUPLICATE: {
    label: 'Duplicate — skipped',
    color: 'orange',
    borderColor: 'orange.400',
    icon: LuCopy,
  },
  NEEDS_CORRECTION: {
    label: 'Needs correction',
    color: 'red',
    borderColor: 'red.400',
    icon: LuCircleAlert,
  },
};

const youthName = (row: ImportRow) => {
  const normalized = String(row.normalized_data?.display_name ?? '').trim();
  if (normalized) return normalized;

  const rawName = Object.entries(row.raw_data).find(([key]) => (
    ['name', 'display name', 'full name'].includes(key.trim().toLowerCase())
  ))?.[1];
  return String(rawName ?? 'Name not recognized');
};

const OutcomeBadge = ({ outcome }: { outcome: ValidationOutcome }) => {
  const config = outcomeConfig[outcome];
  const OutcomeIcon = config.icon;

  return (
    <Badge colorPalette={config.color} variant="subtle" px={2.5} py={1.5} borderRadius="md">
      <HStack as="span" gap={1.5} whiteSpace="nowrap">
        <OutcomeIcon size={14} aria-hidden="true" />
        <span>{config.label}</span>
      </HStack>
    </Badge>
  );
};

const ValidationFindings = ({ row }: { row: ImportRow }) => {
  const errors = row.validation_errors ?? [];
  const warnings = row.validation_warnings ?? [];
  const outcome = outcomeFor(row);

  if (errors.length === 0 && warnings.length === 0) {
    if (outcome === 'DUPLICATE') {
      return (
        <HStack align="flex-start" gap={2} color="orange.800">
          <LuCopy size={16} aria-hidden="true" />
          <Text fontSize="sm" lineHeight="1.5">Matches an existing youth record and will not be imported again.</Text>
        </HStack>
      );
    }

    if (outcome === 'NEEDS_CORRECTION') {
      return (
        <HStack align="flex-start" gap={2} color="red.800">
          <LuCircleAlert size={16} aria-hidden="true" />
          <Text fontSize="sm" lineHeight="1.5">The row could not be validated. Use the error report for the source-field details.</Text>
        </HStack>
      );
    }

    return (
      <HStack align="flex-start" gap={2} color="green.800">
        <LuCircleCheck size={16} aria-hidden="true" />
        <Text fontSize="sm" lineHeight="1.5">All required values were recognized.</Text>
      </HStack>
    );
  }

  return (
    <VStack align="stretch" gap={2}>
      {errors.map((message, index) => (
        <HStack key={`error-${index}-${message}`} align="flex-start" gap={2} color="red.800">
          <Box pt="3px" flexShrink={0}><LuCircleAlert size={15} aria-hidden="true" /></Box>
          <Text fontSize="sm" lineHeight="1.45" overflowWrap="anywhere">{message}</Text>
        </HStack>
      ))}
      {warnings.map((message, index) => (
        <HStack key={`warning-${index}-${message}`} align="flex-start" gap={2} color="orange.800">
          <Box pt="3px" flexShrink={0}><LuInfo size={15} aria-hidden="true" /></Box>
          <Text fontSize="sm" lineHeight="1.45" overflowWrap="anywhere">{message}</Text>
        </HStack>
      ))}
    </VStack>
  );
};

const LoadingState = () => (
  <VStack align="stretch" gap={3} role="status" aria-label="Loading spreadsheet validation results">
    <Card.Root borderColor="border" borderRadius="lg" boxShadow="panel">
      <Card.Body p={4}>
        <Skeleton height="42px" borderRadius="md" mb={3} />
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} height={{ base: '150px', lg: '64px' }} borderRadius="md" mb={index === 4 ? 0 : 2} />
        ))}
      </Card.Body>
    </Card.Root>
    <Text srOnly>Loading validation results…</Text>
  </VStack>
);

export const ImportValidationTable = ({
  rows,
  loading,
  pagination,
  onPageChange,
}: ImportValidationTableProps) => {
  if (loading) return <LoadingState />;

  return (
    <VStack align="stretch" gap={4}>
      <Card.Root
        display={{ base: 'none', lg: 'flex' }}
        borderColor="border"
        borderRadius="lg"
        boxShadow="panel"
        overflow="hidden"
      >
        <Table.Root size="sm" variant="line" css={{ tableLayout: 'fixed' }} aria-label="Spreadsheet validation results">
          <Table.Header>
            <Table.Row bg="surface.muted" borderBottomWidth="1px" borderColor="border.strong">
              <Table.ColumnHeader width="96px" px={4} py={3} textAlign="center" fontWeight="700">Sheet row</Table.ColumnHeader>
              <Table.ColumnHeader width="250px" px={4} py={3} fontWeight="700">Youth record</Table.ColumnHeader>
              <Table.ColumnHeader width="170px" px={4} py={3} fontWeight="700">Outcome</Table.ColumnHeader>
              <Table.ColumnHeader px={4} py={3} fontWeight="700">Validation findings</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {rows.length === 0 ? (
              <Table.Row>
                <Table.Cell colSpan={4} py={12} textAlign="center">
                  <Text fontWeight="600">No spreadsheet rows were found.</Text>
                  <Text mt={1} color="text.muted" fontSize="sm">Check the selected worksheet and try again.</Text>
                </Table.Cell>
              </Table.Row>
            ) : rows.map((row) => {
              const outcome = outcomeFor(row);
              const config = outcomeConfig[outcome];
              return (
                <Table.Row key={row.id} bg="surface" _hover={{ bg: 'surface.muted' }}>
                  <Table.Cell
                    px={4}
                    py={4}
                    textAlign="center"
                    verticalAlign="top"
                    borderLeftWidth="4px"
                    borderLeftColor={config.borderColor}
                  >
                    <Text fontWeight="700" fontVariantNumeric="tabular-nums">#{row.row_number}</Text>
                  </Table.Cell>
                  <Table.Cell px={4} py={4} verticalAlign="top">
                    <Text fontWeight="700" lineHeight="1.4" overflowWrap="anywhere">{youthName(row)}</Text>
                    <Text mt={1} color="text.muted" fontSize="xs">Spreadsheet row {row.row_number}</Text>
                  </Table.Cell>
                  <Table.Cell px={4} py={4} verticalAlign="top">
                    <OutcomeBadge outcome={outcome} />
                  </Table.Cell>
                  <Table.Cell px={4} py={4} verticalAlign="top">
                    <ValidationFindings row={row} />
                  </Table.Cell>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table.Root>
      </Card.Root>

      <VStack display={{ base: 'flex', lg: 'none' }} align="stretch" gap={3} aria-label="Spreadsheet validation results">
        {rows.length === 0 ? (
          <Card.Root borderColor="border" borderRadius="lg" boxShadow="panel">
            <Card.Body p={6} textAlign="center">
              <Text fontWeight="600">No spreadsheet rows were found.</Text>
              <Text mt={1} color="text.muted" fontSize="sm">Check the selected worksheet and try again.</Text>
            </Card.Body>
          </Card.Root>
        ) : rows.map((row) => {
          const outcome = outcomeFor(row);
          const config = outcomeConfig[outcome];
          return (
            <Card.Root
              key={row.id}
              borderColor="border"
              borderLeftWidth="4px"
              borderLeftColor={config.borderColor}
              borderRadius="lg"
              boxShadow="panel"
            >
              <Card.Body p={4}>
                <Flex align="flex-start" justify="space-between" gap={3} wrap="wrap">
                  <Box minW={0}>
                    <Text color="text.muted" fontSize="xs" fontWeight="700" textTransform="uppercase" letterSpacing="wide">
                      Sheet row {row.row_number}
                    </Text>
                    <Text mt={1} fontWeight="700" lineHeight="1.4" overflowWrap="anywhere">{youthName(row)}</Text>
                  </Box>
                  <OutcomeBadge outcome={outcome} />
                </Flex>
                <Box mt={4} pt={4} borderTopWidth="1px" borderColor="border">
                  <Text mb={2} color="text.muted" fontSize="xs" fontWeight="700" textTransform="uppercase" letterSpacing="wide">
                    Validation findings
                  </Text>
                  <ValidationFindings row={row} />
                </Box>
              </Card.Body>
            </Card.Root>
          );
        })}
      </VStack>

      <Pagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        totalItems={pagination.totalItems}
        onPageChange={onPageChange}
      />
    </VStack>
  );
};
