import { useState } from 'react';
import { Table, Text, HStack, Button, Input, VStack, Spinner, Box, Card } from '@chakra-ui/react';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
}

export interface Action<T> {
  label: string;
  onClick: (row: T) => void;
  variant?: string;
  show?: (row: T) => boolean;
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
}: DataTableProps<T>) => {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);

  let filtered = data;
  if (search && searchKey) {
    const lower = search.toLowerCase();
    filtered = data.filter((row) => {
      const val = (row as Record<string, unknown>)[searchKey];
      return val && String(val).toLowerCase().includes(lower);
    });
  }

  if (sortKey) {
    filtered = [...filtered].sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sortKey] ?? '';
      const bVal = (b as Record<string, unknown>)[sortKey] ?? '';
      const cmp = String(aVal).localeCompare(String(bVal));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  if (loading) {
    return (
      <Box py={8} textAlign="center">
        <Spinner size="lg" color="primary.600" />
      </Box>
    );
  }

  return (
    <VStack align="stretch" gap={4}>
      {(searchPlaceholder || filters) && (
        <HStack gap={3} align="stretch" wrap="wrap">
          {searchPlaceholder && searchKey && (
            <Input
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              maxW={{ base: 'full', md: '300px' }}
              size="sm"
            />
          )}
          {filters}
        </HStack>
      )}

      <Card.Root borderColor="border" borderRadius="lg" overflow="hidden">
      <Box overflowX="auto">
        <Table.Root size="sm" variant="outline" striped>
          <Table.Header>
            <Table.Row>
              {columns.map((col) => (
                <Table.ColumnHeader
                  key={col.key}
                  width={col.width}
                  cursor={col.sortable ? 'pointer' : undefined}
                  userSelect={col.sortable ? 'none' : undefined}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                  aria-sort={
                    col.sortable && sortKey === col.key
                      ? sortDir === 'asc' ? 'ascending' : 'descending'
                      : undefined
                  }
                >
                  <HStack gap={1}>
                    <Text>{col.header}</Text>
                    {sortKey === col.key && (
                      <Text fontSize="xs">{sortDir === 'asc' ? '\u2191' : '\u2193'}</Text>
                    )}
                  </HStack>
                </Table.ColumnHeader>
              ))}
              {actions && actions.length > 0 && <Table.ColumnHeader width="100px">Actions</Table.ColumnHeader>}
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
                <Table.Row key={idx}>
                  {columns.map((col) => (
                    <Table.Cell key={col.key}>
                      {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '')}
                    </Table.Cell>
                  ))}
                  {actions && actions.length > 0 && (
                    <Table.Cell>
                      <HStack gap={1}>
                        {actions
                          .filter((a) => !a.show || a.show(row))
                          .map((action) => (
                            <Button
                              key={action.label}
                              size="xs"
                              variant={action.variant === 'danger' ? 'outline' : 'ghost'}
                              colorPalette={action.variant === 'danger' ? 'red' : undefined}
                              onClick={() => action.onClick(row)}
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

      {totalPages > 1 && (
        <HStack justify="center" gap={2}>
          <Button
            size="sm"
            variant="outline"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <Text fontSize="sm" color="text.secondary">
            Page {page} of {totalPages}
          </Text>
          <Button
            size="sm"
            variant="outline"
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </HStack>
      )}
    </VStack>
  );
};
