import { useMemo, useState } from 'react';
import { Table, Text, HStack, Button, Input, VStack, Spinner, Box, Card, IconButton } from '@chakra-ui/react';
import { LuArrowDown, LuArrowUp, LuChevronLeft, LuChevronRight, LuSearch, LuX } from 'react-icons/lu';
import { ConfirmDialog } from '../components/ConfirmDialog';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
}

export interface Action<T> {
  label: string;
  onClick: (row: T) => void | Promise<void>;
  variant?: string;
  show?: (row: T) => boolean;
  confirm?: {
    title: string | ((row: T) => string);
    description: string | ((row: T) => string);
    confirmLabel?: string;
    variant?: 'danger' | 'default';
  };
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  actions?: Action<T>[];
  loading?: boolean;
  searchPlaceholder?: string;
  searchKey?: string;
  filters?: React.ReactNode;
  emptyMessage?: string;
  pageSize?: number;
  pagination?: {
    page: number;
    totalPages: number;
    totalItems: number;
    onPageChange: (page: number) => void;
  };
}

export const DataTable = <T,>({
  columns,
  data,
  actions,
  loading = false,
  searchPlaceholder,
  searchKey,
  filters,
  emptyMessage = 'No data found.',
  pageSize = 25,
  pagination,
}: DataTableProps<T>) => {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [pendingAction, setPendingAction] = useState<{ action: Action<T>; row: T } | null>(null);

  const filtered = useMemo(() => {
    let result = data;
    if (search && searchKey) {
      const lower = search.toLowerCase();
      result = data.filter((row) => {
        const val = (row as Record<string, unknown>)[searchKey];
        return val && String(val).toLowerCase().includes(lower);
      });
    }

    if (sortKey) {
      result = [...result].sort((a, b) => {
        const aVal = (a as Record<string, unknown>)[sortKey] ?? '';
        const bVal = (b as Record<string, unknown>)[sortKey] ?? '';
        const cmp = String(aVal).localeCompare(String(bVal));
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return result;
  }, [data, search, searchKey, sortKey, sortDir]);

  const totalPages = pagination?.totalPages ?? Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = pagination?.page ?? page;
  const paginated = pagination
    ? filtered
    : filtered.slice((page - 1) * pageSize, page * pageSize);
  const changePage = (nextPage: number) => {
    if (pagination) pagination.onPageChange(nextPage);
    else setPage(nextPage);
  };

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const getRowKey = (row: T, index: number) => {
    const id = (row as Record<string, unknown>).id;
    return id ? String(id) : String(index);
  };

  const handleAction = (action: Action<T>, row: T) => {
    if (action.confirm) {
      setPendingAction({ action, row });
      return;
    }
    void action.onClick(row);
  };

  const availableActions = (row: T) => actions?.filter((action) => !action.show || action.show(row)) ?? [];

  if (loading) {
    return (
      <VStack py={12} gap={3} color="text.secondary" role="status">
        <Spinner size="lg" color="primary.600" />
        <Text fontSize="sm">Loading records...</Text>
      </VStack>
    );
  }

  return (
    <VStack align="stretch" gap={4}>
      {(searchPlaceholder || filters) && (
        <HStack gap={3} align="stretch" wrap="wrap" bg="surface" borderWidth="1px" borderColor="border" borderRadius="md" p={3}>
          {searchPlaceholder && searchKey && (
            <Box position="relative" w={{ base: 'full', md: '320px' }}>
              <Box position="absolute" left={3} top="50%" transform="translateY(-50%)" color="text.muted" pointerEvents="none">
                <LuSearch aria-hidden="true" />
              </Box>
              <Input
                aria-label={searchPlaceholder}
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                pl={10}
                pr={search ? 10 : 3}
                minH="44px"
                borderColor="border.strong"
              />
              {search && (
                <IconButton
                  aria-label="Clear search"
                  variant="ghost"
                  size="sm"
                  position="absolute"
                  right={1}
                  top="50%"
                  transform="translateY(-50%)"
                  onClick={() => { setSearch(''); setPage(1); }}
                >
                  <LuX />
                </IconButton>
              )}
            </Box>
          )}
          {filters}
        </HStack>
      )}

      <Card.Root borderColor="border" borderRadius="md" overflow="hidden" boxShadow="panel" display={{ base: 'none', md: 'flex' }}>
      <Box overflowX="auto" width="full" css={{ '&::-webkit-scrollbar': { height: '6px' }, '&::-webkit-scrollbar-thumb': { bg: 'border.strong', borderRadius: '3px' } }}>
        <Table.Root size="sm" variant="line" css={{ tableLayout: 'fixed', minWidth: 'max-content' }}>
          <Table.Header>
            <Table.Row bg="surface.muted">
              {columns.map((col) => (
                <Table.ColumnHeader
                  key={col.key}
                  width={col.width}
                  whiteSpace="nowrap"
                  fontSize="xs"
                  fontWeight="600"
                  color="text.secondary"
                  textTransform="uppercase"
                  letterSpacing="0.05em"
                  py={2}
                  px={2}
                  cursor={col.sortable ? 'pointer' : undefined}
                  userSelect={col.sortable ? 'none' : undefined}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                  aria-sort={
                    col.sortable && sortKey === col.key
                      ? sortDir === 'asc' ? 'ascending' : 'descending'
                      : undefined
                  }
                >
                  <HStack gap={1} py={0}>
                    <Text fontSize="xs">{col.header}</Text>
                    {sortKey === col.key && (
                      sortDir === 'asc' ? <LuArrowUp size={12} aria-hidden="true" /> : <LuArrowDown size={12} aria-hidden="true" />
                    )}
                  </HStack>
                </Table.ColumnHeader>
              ))}
              {actions && actions.length > 0 && <Table.ColumnHeader width="80px" fontSize="xs" fontWeight="600" py={2} px={2}>Actions</Table.ColumnHeader>}
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {paginated.length === 0 ? (
              <Table.Row>
                <Table.Cell colSpan={columns.length + (actions ? 1 : 0)} textAlign="center" py={8}>
                  <Text color="text.muted">{emptyMessage}</Text>
                </Table.Cell>
              </Table.Row>
            ) : (
              paginated.map((row, idx) => (
                <Table.Row key={getRowKey(row, idx)} _hover={{ bg: 'surface.muted' }} borderBottomWidth="1px" borderColor="border">
                  {columns.map((col) => (
                    <Table.Cell key={col.key} whiteSpace="nowrap" fontSize="xs" py={2} px={2} maxW={col.width} overflow="hidden" textOverflow="ellipsis">
                      {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '')}
                    </Table.Cell>
                  ))}
                  {actions && actions.length > 0 && (
                    <Table.Cell py={2} px={2}>
                      <HStack gap={1}>
                        {availableActions(row).map((action) => (
                            <Button
                              key={action.label}
                              size="2xs"
                              variant={action.variant === 'danger' ? 'outline' : 'ghost'}
                              colorPalette={action.variant === 'danger' ? 'red' : undefined}
                              onClick={() => handleAction(action, row)}
                            >
                              {action.label}
                            </Button>
                          ))}
                      </HStack>
                    </Table.Cell>
                  )}
                </Table.Row>
              ))
            )}
          </Table.Body>
        </Table.Root>
      </Box>
      </Card.Root>

      <VStack display={{ base: 'flex', md: 'none' }} align="stretch" gap={3}>
        {paginated.length === 0 ? (
          <Box borderWidth="1px" borderColor="border" borderRadius="md" bg="surface" p={6} textAlign="center">
            <Text color="text.muted">{emptyMessage}</Text>
          </Box>
        ) : paginated.map((row, idx) => (
          <Box key={getRowKey(row, idx)} borderWidth="1px" borderColor="border" borderRadius="md" bg="surface" p={4} boxShadow="panel">
            <VStack align="stretch" gap={3}>
              {columns.map((col) => (
                <HStack key={col.key} justify="space-between" align="flex-start" gap={4}>
                  <Text color="text.muted" fontSize="sm" flexShrink={0}>{col.header}</Text>
                  <Box textAlign="right" fontSize="sm" minW={0} overflowWrap="anywhere">
                    {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '')}
                  </Box>
                </HStack>
              ))}
              {availableActions(row).length > 0 && (
                <HStack gap={2} pt={3} mt={1} borderTopWidth="1px" borderColor="border" wrap="wrap" justify="flex-end">
                  {availableActions(row).map((action) => (
                    <Button
                      key={action.label}
                      size="sm"
                      minH="40px"
                      variant={action.variant === 'danger' ? 'outline' : 'subtle'}
                      colorPalette={action.variant === 'danger' ? 'red' : 'gray'}
                      onClick={() => handleAction(action, row)}
                    >
                      {action.label}
                    </Button>
                  ))}
                </HStack>
              )}
            </VStack>
          </Box>
        ))}
      </VStack>

      {totalPages > 1 && (
        <HStack justify="space-between" gap={3}>
          <Button
            size="sm"
            variant="outline"
            disabled={currentPage === 1}
            onClick={() => changePage(currentPage - 1)}
          >
            <LuChevronLeft />
            Previous
          </Button>
          <Text fontSize="sm" color="text.secondary">
            Page {currentPage} of {totalPages}
          </Text>
          <Button
            size="sm"
            variant="outline"
            disabled={currentPage === totalPages}
            onClick={() => changePage(currentPage + 1)}
          >
            Next
            <LuChevronRight />
          </Button>
        </HStack>
      )}

      {pendingAction?.action.confirm && (
        <ConfirmDialog
          open
          onOpenChange={({ open }) => { if (!open) setPendingAction(null); }}
          title={typeof pendingAction.action.confirm.title === 'function'
            ? pendingAction.action.confirm.title(pendingAction.row)
            : pendingAction.action.confirm.title}
          description={typeof pendingAction.action.confirm.description === 'function'
            ? pendingAction.action.confirm.description(pendingAction.row)
            : pendingAction.action.confirm.description}
          confirmLabel={pendingAction.action.confirm.confirmLabel}
          variant={pendingAction.action.confirm.variant}
          onConfirm={() => pendingAction.action.onClick(pendingAction.row)}
        />
      )}
    </VStack>
  );
};
