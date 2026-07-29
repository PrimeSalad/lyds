import { Badge, Box, Card, Flex, Heading, HStack, Skeleton, Text } from '@chakra-ui/react';

export const RegistrySectionHeading = ({ title, description }: { title: string; description: string }) => (
  <Box>
    <Heading as="h2" size="sm" fontFamily="heading" fontWeight="650" color="text.primary">{title}</Heading>
    <Text mt={1} fontSize="sm" color="text.muted" lineHeight="1.55">{description}</Text>
  </Box>
);

type RegistrySummaryProps = {
  year: number;
  scopeLabel: string;
  summary: string;
};

export const RegistrySummary = ({ year, scopeLabel, summary }: RegistrySummaryProps) => (
  <Card.Root data-dashboard-summary="true" borderColor="border" borderRadius="lg" boxShadow="panel">
    <Card.Body p={{ base: 4, md: 5 }}>
      <Flex
        align={{ base: 'flex-start', md: 'center' }}
        justify="space-between"
        direction={{ base: 'column-reverse', md: 'row' }}
        gap={3}
      >
        <Text maxW="86ch" color="text.secondary" fontSize="sm" lineHeight="1.65">
          {summary}
        </Text>
        <HStack gap={2} wrap="wrap" flexShrink={0}>
          <Badge colorPalette="green" variant="subtle">Filing year {year}</Badge>
          <Badge colorPalette="gray" variant="subtle">{scopeLabel}</Badge>
        </HStack>
      </Flex>
    </Card.Body>
  </Card.Root>
);

type RegistryMetricCardProps = {
  label: string;
  value: number | string;
  helper: string;
  loading?: boolean;
  formatValue?: (value: number) => string;
};

export const RegistryMetricCard = ({
  label,
  value,
  helper,
  loading = false,
  formatValue = (numberValue) => numberValue.toLocaleString('en-PH'),
}: RegistryMetricCardProps) => (
  <Card.Root data-dashboard-metric="true" borderColor="border" borderRadius="lg" boxShadow="panel" minH="148px" height="full">
    <Card.Body p={{ base: 4, md: 5 }} display="flex" flexDirection="column">
      <Text fontSize="sm" color="text.secondary" fontWeight="600">{label}</Text>
      <Skeleton loading={loading} mt={2} width={loading ? '72px' : 'auto'} minW={loading ? '72px' : 0}>
        <Text
          fontFamily="heading"
          fontSize={{ base: '1.5rem', md: '1.75rem' }}
          fontWeight="750"
          lineHeight="1.1"
          fontVariantNumeric="tabular-nums"
          whiteSpace="nowrap"
        >
          {typeof value === 'number' ? formatValue(value) : value}
        </Text>
      </Skeleton>
      <Text mt="auto" pt={3} fontSize="xs" color="text.muted" lineHeight="1.5">{helper}</Text>
    </Card.Body>
  </Card.Root>
);

export type RegistryBriefItem = {
  title: string;
  text: string;
};

export const RegistryBriefList = ({ items }: { items: RegistryBriefItem[] }) => (
  <Box>
    {items.map((item, index) => (
      <Box
        key={item.title}
        py={3}
        borderTopWidth={index === 0 ? '0' : '1px'}
        borderColor="border"
      >
        <Text fontSize="sm" fontWeight="700">{item.title}</Text>
        <Text mt={1} fontSize="xs" color="text.secondary" lineHeight="1.6">{item.text}</Text>
      </Box>
    ))}
  </Box>
);
