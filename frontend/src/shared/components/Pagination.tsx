import { Box, Button, Flex, HStack, IconButton, NativeSelect, Text } from '@chakra-ui/react';
import {
  LuChevronLeft,
  LuChevronRight,
  LuChevronsLeft,
  LuChevronsRight,
} from 'react-icons/lu';

type PaginationItem = number | 'ellipsis-start' | 'ellipsis-end';

export const getPaginationItems = (currentPage: number, totalPages: number): PaginationItem[] => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  if (currentPage <= 3) {
    pages.add(2);
    pages.add(3);
    pages.add(4);
  }
  if (currentPage >= totalPages - 2) {
    pages.add(totalPages - 1);
    pages.add(totalPages - 2);
    pages.add(totalPages - 3);
  }

  const orderedPages = Array.from(pages)
    .filter((item) => item >= 1 && item <= totalPages)
    .sort((a, b) => a - b);
  const items: PaginationItem[] = [];

  orderedPages.forEach((item, index) => {
    const previousPage = orderedPages[index - 1];
    if (previousPage && item - previousPage > 1) {
      items.push(previousPage === 1 ? 'ellipsis-start' : 'ellipsis-end');
    }
    items.push(item);
  });

  return items;
};

interface PaginationProps {
  page: number;
  totalPages: number;
  totalItems?: number;
  onPageChange: (page: number) => void;
}

const PageSelect = ({
  page,
  totalPages,
  onPageChange,
  compact = false,
}: Omit<PaginationProps, 'totalItems'> & { compact?: boolean }) => (
  <NativeSelect.Root size="sm" w={compact ? '76px' : '88px'}>
    <NativeSelect.Field
      aria-label="Jump to page"
      value={page}
      onChange={(event) => onPageChange(Number(event.target.value))}
      bg="surface"
      borderColor="border.strong"
      borderRadius="md"
      fontWeight="600"
      textAlign="center"
      cursor="pointer"
    >
      {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
        <option key={pageNumber} value={pageNumber}>
          {compact ? pageNumber : `Page ${pageNumber}`}
        </option>
      ))}
    </NativeSelect.Field>
    <NativeSelect.Indicator />
  </NativeSelect.Root>
);

export const Pagination = ({
  page,
  totalPages,
  totalItems,
  onPageChange,
}: PaginationProps) => {
  if (totalPages <= 1) return null;

  return (
    <Box
      as="nav"
      aria-label="Pagination"
      borderTopWidth="1px"
      borderColor="border"
      pt={3}
    >
      <Flex
        display={{ base: 'none', md: 'flex' }}
        align="center"
        justify="space-between"
        gap={5}
        minH="40px"
      >
        <Text fontSize="sm" color="text.muted" minW="150px">
          {typeof totalItems === 'number'
            ? `${totalItems.toLocaleString()} ${totalItems === 1 ? 'record' : 'records'}`
            : `Page ${page} of ${totalPages}`}
        </Text>

        <HStack gap={1}>
          <IconButton
            aria-label="First page"
            title="First page"
            size="sm"
            variant="ghost"
            color="text.secondary"
            disabled={page === 1}
            onClick={() => onPageChange(1)}
          >
            <LuChevronsLeft />
          </IconButton>
          <IconButton
            aria-label="Previous page"
            title="Previous page"
            size="sm"
            variant="ghost"
            color="text.secondary"
            disabled={page === 1}
            onClick={() => onPageChange(page - 1)}
          >
            <LuChevronLeft />
          </IconButton>

          {getPaginationItems(page, totalPages).map((item) => (
            typeof item === 'number' ? (
              <Button
                key={item}
                aria-label={`Page ${item}`}
                aria-current={item === page ? 'page' : undefined}
                size="sm"
                minW="34px"
                h="34px"
                px={2}
                borderRadius="md"
                variant={item === page ? 'solid' : 'ghost'}
                colorPalette={item === page ? 'green' : undefined}
                color={item === page ? undefined : 'text.secondary'}
                fontWeight={item === page ? '700' : '500'}
                onClick={() => onPageChange(item)}
              >
                {item}
              </Button>
            ) : (
              <Text key={item} w="24px" textAlign="center" color="text.muted" aria-hidden="true">
                ···
              </Text>
            )
          ))}

          <IconButton
            aria-label="Next page"
            title="Next page"
            size="sm"
            variant="ghost"
            color="text.secondary"
            disabled={page === totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            <LuChevronRight />
          </IconButton>
          <IconButton
            aria-label="Last page"
            title="Last page"
            size="sm"
            variant="ghost"
            color="text.secondary"
            disabled={page === totalPages}
            onClick={() => onPageChange(totalPages)}
          >
            <LuChevronsRight />
          </IconButton>
        </HStack>

        <HStack gap={2} justify="flex-end" minW="150px">
          <Text fontSize="sm" color="text.muted" whiteSpace="nowrap">Jump to</Text>
          <PageSelect page={page} totalPages={totalPages} onPageChange={onPageChange} />
        </HStack>
      </Flex>

      <Flex
        display={{ base: 'flex', md: 'none' }}
        align="center"
        justify="space-between"
        gap={2}
      >
        <IconButton
          aria-label="Previous page"
          size="sm"
          variant="outline"
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
        >
          <LuChevronLeft />
        </IconButton>

        <HStack gap={2}>
          <Text fontSize="sm" color="text.muted">Page</Text>
          <PageSelect compact page={page} totalPages={totalPages} onPageChange={onPageChange} />
          <Text fontSize="sm" color="text.muted">of {totalPages}</Text>
        </HStack>

        <IconButton
          aria-label="Next page"
          size="sm"
          variant="outline"
          disabled={page === totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <LuChevronRight />
        </IconButton>
      </Flex>
    </Box>
  );
};
