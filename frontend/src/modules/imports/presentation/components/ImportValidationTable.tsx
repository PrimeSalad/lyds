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
  decision: string;
  background: string;
  foreground: string;
  border: string;
  icon: typeof LuCircleCheck;
}> = {
  READY: {
    label: 'Ready to import',
    decision: 'Will be created',
    background: 'green.50',
    foreground: 'green.800',
    border: 'green.200',
    icon: LuCircleCheck,
  },
  DUPLICATE: {
    label: 'Duplicate',
    decision: 'Skipped — already recorded',
    background: 'orange.50',
    foreground: 'orange.900',
    border: 'orange.200',
    icon: LuCopy,
  },
  NEEDS_CORRECTION: {
    label: 'Needs correction',
    decision: 'Excluded until corrected',
    background: 'red.50',
    foreground: 'red.900',
    border: 'red.200',
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
    <Badge
      bg={config.background}
      color={config.foreground}
      borderWidth="1px"
      borderColor={config.border}
      px={2.5}
      py={1.5}
      borderRadius="md"
    >
      <HStack as="span" gap={1.5} whiteSpace="nowrap">
        <OutcomeIcon size={14} aria-hidden="true" />
        <span>{config.label}</span>
      </HStack>
    </Badge>
  );
};

const OutcomeDecision = ({ outcome }: { outcome: ValidationOutcome }) => {
  const config = outcomeConfig[outcome];

  return (
    <VStack align="flex-start" gap={1.5}>
      <OutcomeBadge outcome={outcome} />
      <Text color="text.secondary" fontSize="xs" lineHeight="1.4">{config.decision}</Text>
    </VStack>
  );
};

const Finding = ({
  kind,
  message,
}: {
  kind: 'error' | 'warning';
  message: string;
}) => {
  const isError = kind === 'error';
  const FindingIcon = isError ? LuCircleAlert : LuInfo;

  return (
    <Flex align="flex-start" gap={2.5}>
      <Flex
        align="center"
        justify="center"
        boxSize="24px"
        flexShrink={0}
        borderRadius="sm"
        bg={isError ? 'red.50' : 'orange.50'}
        color={isError ? 'red.700' : 'orange.800'}
      >
        <FindingIcon size={14} aria-hidden="true" />
      </Flex>
      <Box minW={0} pt="1px">
        <Text
          color={isError ? 'red.800' : 'orange.900'}
          fontSize="xs"
          fontWeight="700"
          lineHeight="1.2"
          textTransform="uppercase"
          letterSpacing="0.04em"
        >
          {isError ? 'Error' : 'Warning'}
        </Text>
        <Text mt={1} color="text.primary" fontSize="sm" lineHeight="1.45" overflowWrap="anywhere">
          {message}
        </Text>
      </Box>
    </Flex>
  );
};

const ValidationFindings = ({ row }: { row: ImportRow }) => {
  const errors = row.validation_errors ?? [];
  const warnings = row.validation_warnings ?? [];
  const outcome = outcomeFor(row);

  if (errors.length === 0 && warnings.length === 0) {
    if (outcome === 'DUPLICATE') {
      return (
        <Flex align="flex-start" gap={2.5}>
          <Box color="orange.800" pt="3px" flexShrink={0}><LuCopy size={16} aria-hidden="true" /></Box>
          <Box>
            <Text fontSize="sm" fontWeight="600">Existing youth record detected</Text>
            <Text mt={0.5} color="text.secondary" fontSize="sm" lineHeight="1.45">
              This source row will not create another record.
            </Text>
          </Box>
        </Flex>
      );
    }

    if (outcome === 'NEEDS_CORRECTION') {
      return (
        <Flex align="flex-start" gap={2.5}>
          <Box color="red.700" pt="3px" flexShrink={0}><LuCircleAlert size={16} aria-hidden="true" /></Box>
          <Box>
            <Text fontSize="sm" fontWeight="600">Validation could not identify the source issue</Text>
            <Text mt={0.5} color="text.secondary" fontSize="sm" lineHeight="1.45">
              Download the correction report for the affected fields.
            </Text>
          </Box>
        </Flex>
      );
    }

    return (
      <Flex align="flex-start" gap={2.5}>
        <Box color="green.700" pt="3px" flexShrink={0}><LuCircleCheck size={16} aria-hidden="true" /></Box>
        <Box>
          <Text fontSize="sm" fontWeight="600">Passed all validation checks</Text>
          <Text mt={0.5} color="text.secondary" fontSize="sm" lineHeight="1.45">
            All required values were recognized.
          </Text>
        </Box>
      </Flex>
    );
  }

  return (
    <VStack align="stretch" gap={3}>
      {errors.map((message, index) => (
        <Finding key={`error-${index}-${message}`} kind="error" message={message} />
      ))}
      {warnings.map((message, index) => (
        <Finding key={`warning-${index}-${message}`} kind="warning" message={message} />
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
              <Table.ColumnHeader width="112px" px={4} py={3.5} fontSize="xs" fontWeight="700" letterSpacing="0.03em">Source row</Table.ColumnHeader>
              <Table.ColumnHeader width="250px" px={4} py={3.5} fontSize="xs" fontWeight="700" letterSpacing="0.03em">Recognized youth</Table.ColumnHeader>
              <Table.ColumnHeader width="210px" px={4} py={3.5} fontSize="xs" fontWeight="700" letterSpacing="0.03em">Import decision</Table.ColumnHeader>
              <Table.ColumnHeader px={4} py={3.5} fontSize="xs" fontWeight="700" letterSpacing="0.03em">Validation details</Table.ColumnHeader>
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
            ) : rows.map((row, index) => {
              const outcome = outcomeFor(row);
              const recognizedName = youthName(row);
              const nameRecognized = recognizedName !== 'Name not recognized';
              return (
                <Table.Row key={row.id} bg={index % 2 === 0 ? 'surface' : 'surface.muted'} _hover={{ bg: 'green.50' }}>
                  <Table.Cell px={4} py={5} verticalAlign="top">
                    <VStack align="flex-start" gap={0.5}>
                      <Text color="text.muted" fontSize="xs" fontWeight="700" textTransform="uppercase" letterSpacing="0.04em">Row</Text>
                      <Text fontSize="lg" fontWeight="700" lineHeight="1.2" fontVariantNumeric="tabular-nums">{row.row_number}</Text>
                    </VStack>
                  </Table.Cell>
                  <Table.Cell px={4} py={5} verticalAlign="top">
                    <Text fontSize="md" fontWeight="700" lineHeight="1.4" overflowWrap="anywhere">{recognizedName}</Text>
                    <Text mt={1} color={nameRecognized ? 'text.muted' : 'red.700'} fontSize="xs">
                      {nameRecognized ? 'Recognized from the source name field' : 'Review the spreadsheet name columns'}
                    </Text>
                  </Table.Cell>
                  <Table.Cell px={4} py={5} verticalAlign="top">
                    <OutcomeDecision outcome={outcome} />
                  </Table.Cell>
                  <Table.Cell px={4} py={5} verticalAlign="top">
                    <ValidationFindings row={row} />
                  </Table.Cell>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table.Root>
      </Card.Root>

      <Box
        display={{ base: 'block', lg: 'none' }}
        borderWidth="1px"
        borderColor="border"
        borderRadius="lg"
        bg="surface"
        boxShadow="panel"
        overflow="hidden"
        role="list"
        aria-label="Spreadsheet validation results"
      >
        {rows.length === 0 ? (
          <Box p={6} textAlign="center">
            <Text fontWeight="600">No spreadsheet rows were found.</Text>
            <Text mt={1} color="text.muted" fontSize="sm">Check the selected worksheet and try again.</Text>
          </Box>
        ) : rows.map((row, index) => {
          const outcome = outcomeFor(row);
          const recognizedName = youthName(row);
          return (
            <Box
              key={row.id}
              role="listitem"
              p={{ base: 4, sm: 5 }}
              borderBottomWidth={index === rows.length - 1 ? 0 : '1px'}
              borderColor="border"
            >
              <Flex align="center" justify="space-between" gap={3} wrap="wrap">
                <HStack gap={2}>
                  <Text color="text.muted" fontSize="xs" fontWeight="700" textTransform="uppercase" letterSpacing="0.04em">Source row</Text>
                  <Text fontWeight="700" fontVariantNumeric="tabular-nums">{row.row_number}</Text>
                </HStack>
                <OutcomeBadge outcome={outcome} />
              </Flex>

              <Box mt={4}>
                <Text color="text.muted" fontSize="xs" fontWeight="700" textTransform="uppercase" letterSpacing="0.04em">
                  Recognized youth
                </Text>
                <Text mt={1} fontSize="md" fontWeight="700" lineHeight="1.4" overflowWrap="anywhere">{recognizedName}</Text>
                <Text mt={1} color="text.secondary" fontSize="sm">{outcomeConfig[outcome].decision}</Text>
              </Box>

              <Box mt={4} pt={4} borderTopWidth="1px" borderColor="border">
                <Text mb={3} color="text.muted" fontSize="xs" fontWeight="700" textTransform="uppercase" letterSpacing="0.04em">
                  Validation details
                </Text>
                <ValidationFindings row={row} />
              </Box>
            </Box>
          );
        })}
      </Box>

      <Pagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        totalItems={pagination.totalItems}
        onPageChange={onPageChange}
      />
    </VStack>
  );
};
