import {
  Badge,
  Box,
  Button,
  Card,
  Flex,
  Grid,
  GridItem,
  Heading,
  HStack,
  Icon,
  SimpleGrid,
  Skeleton,
  Text,
  VStack,
} from '@chakra-ui/react';
import type { IconType } from 'react-icons';
import {
  LuChartNoAxesCombined,
  LuCircleAlert,
  LuDatabase,
  LuGraduationCap,
  LuMapPin,
  LuSchool,
  LuShieldCheck,
  LuUsersRound,
} from 'react-icons/lu';
import type {
  ChildLaborerBreakdownItem,
  ChildLaborerStatus,
  ChildLaborerSummary,
} from '../../../../generated/api/api-types';

type ChartColor = {
  token: string;
  css: string;
};

type ColoredBreakdownItem = ChildLaborerBreakdownItem & {
  color: ChartColor;
};

type ChildLaborerAnalyticsProps = {
  summary: ChildLaborerSummary | null;
  year: number;
  scopeLabel: string;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
};

const colors = {
  green: { token: 'primary.600', css: 'var(--chakra-colors-primary-600)' },
  greenDark: { token: 'primary.800', css: 'var(--chakra-colors-primary-800)' },
  blue: { token: 'blue.600', css: 'var(--chakra-colors-blue-600)' },
  amber: { token: 'orange.500', css: 'var(--chakra-colors-orange-500)' },
  red: { token: 'red.600', css: 'var(--chakra-colors-red-600)' },
  violet: { token: 'purple.600', css: 'var(--chakra-colors-purple-600)' },
  teal: { token: 'teal.600', css: 'var(--chakra-colors-teal-600)' },
  gray: { token: 'gray.500', css: 'var(--chakra-colors-gray-500)' },
} satisfies Record<string, ChartColor>;

const statusOrder: ChildLaborerStatus[] = [
  'IDENTIFIED',
  'VALIDATED',
  'REFERRED',
  'MONITORED',
  'CLOSED',
  'ARCHIVED',
];

const statusMeta: Record<ChildLaborerStatus, { label: string; color: ChartColor }> = {
  IDENTIFIED: { label: 'Identified', color: colors.amber },
  VALIDATED: { label: 'Validated', color: colors.blue },
  REFERRED: { label: 'Referred', color: colors.violet },
  MONITORED: { label: 'Monitored', color: colors.teal },
  CLOSED: { label: 'Closed', color: colors.green },
  ARCHIVED: { label: 'Archived', color: colors.gray },
};

const genderColors: ChartColor[] = [colors.blue, colors.violet, colors.gray];
const ageColors: ChartColor[] = [colors.teal, colors.green, colors.blue, colors.violet];
const workColors: ChartColor[] = [colors.greenDark, colors.green, colors.teal, colors.blue, colors.violet, colors.gray];

const formatNumber = (value: number) => value.toLocaleString();
const ratio = (count: number, total: number) => (
  total === 0 ? 0 : Math.round((count / total) * 1_000) / 10
);
const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

const withColors = (
  items: ChildLaborerBreakdownItem[],
  palette: ChartColor[],
): ColoredBreakdownItem[] => items.map((item, index) => ({
  ...item,
  color: palette[index % palette.length],
}));

const SectionHeading = ({ title, description }: { title: string; description: string }) => (
  <Box>
    <Heading as="h2" size="sm" fontFamily="heading" fontWeight="650" color="text.primary">{title}</Heading>
    <Text mt={1} fontSize="sm" color="text.muted" lineHeight="1.55">{description}</Text>
  </Box>
);

type MetricCardProps = {
  label: string;
  value: string;
  helper: string;
  icon: IconType;
  tone?: 'default' | 'info' | 'warning';
};

const MetricCard = ({ label, value, helper, icon, tone = 'default' }: MetricCardProps) => {
  const toneStyle = tone === 'warning'
    ? { background: 'warning.light', color: 'warning' }
    : tone === 'info'
      ? { background: 'info.light', color: 'info' }
      : { background: 'primary.50', color: 'primary.700' };

  return (
    <Card.Root borderColor="border" borderRadius="lg" boxShadow="panel" minH="152px">
      <Card.Body p={{ base: 4, md: 5 }}>
        <Flex justify="space-between" gap={3} align="flex-start">
          <Text fontSize="sm" color="text.secondary" fontWeight="600">{label}</Text>
          <Flex
            boxSize="42px"
            flexShrink={0}
            align="center"
            justify="center"
            borderRadius="md"
            bg={toneStyle.background}
            color={toneStyle.color}
          >
            <Icon as={icon} boxSize="21px" aria-hidden="true" />
          </Flex>
        </Flex>
        <Text
          mt={3}
          fontFamily="heading"
          fontSize={{ base: '1.6rem', md: '1.75rem' }}
          fontWeight="750"
          lineHeight="1.1"
          fontVariantNumeric="tabular-nums"
          whiteSpace="nowrap"
        >
          {value}
        </Text>
        <Text mt={3} fontSize="xs" color="text.muted" lineHeight="1.5">{helper}</Text>
      </Card.Body>
    </Card.Root>
  );
};

const DonutChart = ({
  items,
  centerValue,
  centerLabel,
  ariaLabel,
}: {
  items: ColoredBreakdownItem[];
  centerValue: string;
  centerLabel: string;
  ariaLabel: string;
}) => {
  const circumference = 2 * Math.PI * 44;
  const total = items.reduce((sum, item) => sum + item.count, 0);
  let accumulated = 0;

  return (
    <Box position="relative" boxSize={{ base: '164px', md: '180px' }} role="img" aria-label={ariaLabel}>
      <svg viewBox="0 0 120 120" width="100%" height="100%" aria-hidden="true">
        <circle cx="60" cy="60" r="44" fill="none" stroke="var(--chakra-colors-surface-muted)" strokeWidth="14" />
        {total > 0 && items.filter((item) => item.count > 0).map((item) => {
          const segment = (item.count / total) * circumference;
          const offset = accumulated;
          accumulated += segment;
          return (
            <circle
              key={item.key}
              cx="60"
              cy="60"
              r="44"
              fill="none"
              stroke={item.color.css}
              strokeWidth="14"
              strokeDasharray={`${segment} ${circumference - segment}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 60 60)"
            />
          );
        })}
      </svg>
      <Flex position="absolute" inset={0} align="center" justify="center" direction="column" pointerEvents="none">
        <Text fontFamily="heading" fontWeight="750" fontSize="xl" fontVariantNumeric="tabular-nums">{centerValue}</Text>
        <Text fontSize="xs" color="text.muted">{centerLabel}</Text>
      </Flex>
    </Box>
  );
};

const DonutPanel = ({
  title,
  description,
  items,
  centerValue,
  centerLabel,
}: {
  title: string;
  description: string;
  items: ColoredBreakdownItem[];
  centerValue: string;
  centerLabel: string;
}) => {
  const spokenSummary = `${title}. ${items.map((item) => `${item.label}: ${item.count}, ${formatPercentage(item.percentage)}`).join('. ')}`;

  return (
    <Card.Root borderColor="border" borderRadius="lg" boxShadow="panel" height="full">
      <Card.Header pb={2} p={{ base: 4, md: 5 }}>
        <SectionHeading title={title} description={description} />
      </Card.Header>
      <Card.Body pt={1} px={{ base: 4, md: 5 }} pb={{ base: 4, md: 5 }}>
        <Grid templateColumns={{ base: '1fr', sm: '160px minmax(0, 1fr)' }} gap={5} alignItems="center" justifyItems={{ base: 'center', sm: 'stretch' }}>
          <DonutChart items={items} centerValue={centerValue} centerLabel={centerLabel} ariaLabel={spokenSummary} />
          <VStack align="stretch" gap={3} width="full">
            {items.map((item) => (
              <Flex key={item.key} justify="space-between" gap={3} align="center">
                <HStack gap={2} minW={0}>
                  <Box boxSize="10px" borderRadius="full" bg={item.color.token} flexShrink={0} />
                  <Text fontSize="sm" color="text.secondary" lineClamp={2}>{item.label}</Text>
                </HStack>
                <Text fontSize="sm" fontWeight="700" whiteSpace="nowrap" fontVariantNumeric="tabular-nums">
                  {formatNumber(item.count)} <Text as="span" color="text.muted" fontWeight="400">· {formatPercentage(item.percentage)}</Text>
                </Text>
              </Flex>
            ))}
          </VStack>
        </Grid>
      </Card.Body>
    </Card.Root>
  );
};

const BreakdownPanel = ({
  title,
  description,
  items,
  emptyMessage = 'No records match the current filters.',
}: {
  title: string;
  description: string;
  items: ColoredBreakdownItem[];
  emptyMessage?: string;
}) => (
  <Card.Root borderColor="border" borderRadius="lg" boxShadow="panel" height="full">
    <Card.Header pb={2} p={{ base: 4, md: 5 }}>
      <SectionHeading title={title} description={description} />
    </Card.Header>
    <Card.Body pt={2} px={{ base: 4, md: 5 }} pb={{ base: 4, md: 5 }}>
      {items.length === 0 ? (
        <Flex minH="150px" align="center" justify="center" textAlign="center">
          <Text color="text.muted" fontSize="sm">{emptyMessage}</Text>
        </Flex>
      ) : (
        <VStack align="stretch" gap={4} aria-label={`${title} breakdown`}>
          {items.map((item) => (
            <Box key={item.key} aria-label={`${item.label}: ${item.count}, ${formatPercentage(item.percentage)}`}>
              <Flex justify="space-between" gap={4} mb={1.5} align="baseline">
                <Text fontSize="sm" color="text.secondary" overflowWrap="anywhere">{item.label}</Text>
                <Text fontSize="sm" fontWeight="700" whiteSpace="nowrap" fontVariantNumeric="tabular-nums">
                  {formatNumber(item.count)} <Text as="span" color="text.muted" fontWeight="400">({formatPercentage(item.percentage)})</Text>
                </Text>
              </Flex>
              <Box height="9px" bg="surface.muted" borderRadius="full" overflow="hidden">
                <Box
                  height="full"
                  width={`${item.count > 0 ? Math.max(item.percentage, 1.5) : 0}%`}
                  bg={item.color.token}
                  borderRadius="full"
                />
              </Box>
            </Box>
          ))}
        </VStack>
      )}
    </Card.Body>
  </Card.Root>
);

const DataQualityPanel = ({ summary }: { summary: ChildLaborerSummary }) => {
  const total = summary.total_records;
  const items = [
    { label: 'Highest grade recorded', value: summary.data_quality.records_with_grade },
    { label: 'Parent/guardian occupation recorded', value: summary.data_quality.records_with_parent_occupation },
    { label: 'Nature of work specified', value: summary.data_quality.records_with_specified_work },
  ];

  return (
    <Card.Root borderColor="border" borderRadius="lg" boxShadow="panel" height="full">
      <Card.Header pb={2} p={{ base: 4, md: 5 }}>
        <SectionHeading
          title="Reporting completeness"
          description="Completeness across education, parent or guardian occupation, and nature-of-work fields."
        />
      </Card.Header>
      <Card.Body pt={2} px={{ base: 4, md: 5 }} pb={{ base: 4, md: 5 }}>
        <Flex justify="space-between" align="baseline" gap={4} mb={2}>
          <Text fontSize="sm" color="text.secondary">Overall field completion</Text>
          <Text fontFamily="heading" fontSize="xl" fontWeight="750" fontVariantNumeric="tabular-nums">
            {formatPercentage(summary.data_quality.completeness_percentage)}
          </Text>
        </Flex>
        <Box height="10px" bg="surface.muted" borderRadius="full" overflow="hidden" mb={5}>
          <Box height="full" width={`${summary.data_quality.completeness_percentage}%`} bg="primary.600" borderRadius="full" />
        </Box>
        <VStack align="stretch" gap={0}>
          {items.map((item) => (
            <Flex key={item.label} justify="space-between" gap={4} py={3} borderTopWidth="1px" borderColor="border">
              <Text fontSize="sm" color="text.secondary">{item.label}</Text>
              <Text fontSize="sm" fontWeight="700" whiteSpace="nowrap" fontVariantNumeric="tabular-nums">
                {formatNumber(item.value)} / {formatNumber(total)}
              </Text>
            </Flex>
          ))}
        </VStack>
        <Box mt={4} p={3} bg="primary.50" borderRadius="md" borderWidth="1px" borderColor="primary.100">
          <Text fontSize="sm" color="primary.800">
            <Text as="span" fontWeight="700">{formatNumber(summary.data_quality.complete_records)}</Text> records have all three reporting fields complete.
          </Text>
        </Box>
      </Card.Body>
    </Card.Root>
  );
};

const AnalyticsSkeleton = () => (
  <VStack align="stretch" gap={5} aria-label="Loading child laborer analytics">
    <Skeleton height={{ base: '220px', md: '180px' }} borderRadius="lg" />
    <SimpleGrid columns={{ base: 1, sm: 2, xl: 5 }} gap={4}>
      {Array.from({ length: 5 }, (_, index) => <Skeleton key={index} height="152px" borderRadius="lg" />)}
    </SimpleGrid>
    <Grid templateColumns={{ base: '1fr', xl: 'repeat(2, minmax(0, 1fr))' }} gap={5}>
      {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} height="340px" borderRadius="lg" />)}
    </Grid>
  </VStack>
);

export const ChildLaborerAnalytics = ({
  summary,
  year,
  scopeLabel,
  loading,
  error,
  onRetry,
}: ChildLaborerAnalyticsProps) => {
  if (loading && !summary) return <AnalyticsSkeleton />;

  if (!summary) {
    return (
      <Card.Root borderColor="danger" borderRadius="lg" bg="danger.light">
        <Card.Body p={{ base: 4, md: 5 }}>
          <Flex justify="space-between" gap={4} align={{ base: 'stretch', sm: 'center' }} direction={{ base: 'column', sm: 'row' }}>
            <HStack gap={3} align="flex-start">
              <Flex boxSize="42px" align="center" justify="center" borderRadius="md" bg="surface" color="danger" flexShrink={0}>
                <LuCircleAlert size={21} aria-hidden="true" />
              </Flex>
              <Box>
                <Text fontFamily="heading" fontWeight="650">Analytics could not be loaded</Text>
                <Text mt={1} fontSize="sm" color="text.secondary">{error ?? 'Please try again.'}</Text>
              </Box>
            </HStack>
            <Button variant="outline" colorPalette="red" minH="44px" onClick={onRetry}>Retry analytics</Button>
          </Flex>
        </Card.Body>
      </Card.Root>
    );
  }

  const total = summary.total_records;
  const schoolRate = ratio(summary.attending_school, total);
  const validatedCount = summary.status_counts.VALIDATED ?? 0;
  const awaitingValidationCount = summary.status_counts.IDENTIFIED ?? 0;
  const validatedRate = ratio(validatedCount, total);
  const awaitingValidationRate = ratio(awaitingValidationCount, total);
  const scopeCount = summary.barangay_distribution.length;
  const schoolItems = withColors([
    { key: 'ATTENDING', label: 'Attending school', count: summary.attending_school, percentage: schoolRate },
    { key: 'NOT_ATTENDING', label: 'Not attending', count: summary.not_attending_school, percentage: ratio(summary.not_attending_school, total) },
  ], [colors.green, colors.amber]);
  const genderItems = withColors(summary.gender_distribution, genderColors);
  const statusItems = statusOrder.map((status) => ({
    key: status,
    label: statusMeta[status].label,
    count: summary.status_counts[status] ?? 0,
    percentage: ratio(summary.status_counts[status] ?? 0, total),
    color: statusMeta[status].color,
  }));
  const ageItems = withColors(summary.age_distribution, ageColors);
  const barangayItems = withColors(summary.barangay_distribution.slice(0, 10), [colors.greenDark, colors.green, colors.teal, colors.blue]);
  const workItems = withColors(summary.work_distribution, workColors);
  const filterSummary = total === 0
    ? `No child laborer records match the current ${year} filters.`
    : `${formatNumber(total)} child laborer record${total === 1 ? '' : 's'} across ${formatNumber(scopeCount)} barangay${scopeCount === 1 ? '' : 's'}. ${formatNumber(validatedCount)} validated (${formatPercentage(validatedRate)}) and ${formatNumber(awaitingValidationCount)} not yet validated (${formatPercentage(awaitingValidationRate)}), based on recorded remarks.`;

  return (
    <VStack align="stretch" gap={5}>
      {error && (
        <Flex role="alert" justify="space-between" gap={4} align="center" p={3} borderRadius="md" bg="warning.light" borderWidth="1px" borderColor="orange.200">
          <Text fontSize="sm" color="warning">The latest refresh failed. Showing the most recent loaded analytics.</Text>
          <Button size="sm" variant="ghost" colorPalette="orange" onClick={onRetry}>Retry</Button>
        </Flex>
      )}

      <Card.Root bg="primary.900" color="white" borderRadius="lg" overflow="hidden" boxShadow="panel">
        <Card.Body p={{ base: 5, md: 7 }} position="relative">
          <Box position="absolute" width="260px" height="260px" borderRadius="full" bg="whiteAlpha.100" right="-90px" top="-130px" pointerEvents="none" />
          <Grid templateColumns={{ base: '1fr', lg: 'minmax(0, 1.45fr) minmax(260px, 0.55fr)' }} gap={6} alignItems="center" position="relative">
            <Box>
              <HStack gap={2} wrap="wrap" mb={4}>
                <Badge colorPalette="green" variant="solid">{year} situation snapshot</Badge>
                <Badge variant="outline" borderColor="whiteAlpha.500" color="white">{scopeLabel}</Badge>
              </HStack>
              <Heading as="h2" fontFamily="heading" fontSize={{ base: 'xl', md: '2xl' }} fontWeight="700" lineHeight="1.25" color="white">
                Child labor intelligence for focused local action
              </Heading>
              <Text mt={3} maxW="720px" color="whiteAlpha.800" fontSize={{ base: 'sm', md: 'md' }} lineHeight="1.7">
                {filterSummary}
              </Text>
            </Box>
            <Flex justify={{ base: 'flex-start', lg: 'center' }}>
              <Flex
                boxSize={{ base: '76px', md: '92px' }}
                align="center"
                justify="center"
                borderRadius="2xl"
                bg="whiteAlpha.150"
                borderWidth="1px"
                borderColor="whiteAlpha.300"
              >
                <LuChartNoAxesCombined size={42} aria-hidden="true" />
              </Flex>
            </Flex>
          </Grid>
        </Card.Body>
      </Card.Root>

      <SimpleGrid columns={{ base: 1, sm: 2, xl: 5 }} gap={4}>
        <MetricCard label="Records represented" value={formatNumber(total)} helper={`Filtered ${year} registry`} icon={LuUsersRound} />
        <MetricCard label="Validated records" value={formatPercentage(validatedRate)} helper={`${formatNumber(validatedCount)} record${validatedCount === 1 ? '' : 's'} with validation remarks`} icon={LuShieldCheck} tone="info" />
        <MetricCard label="Not yet validated" value={formatPercentage(awaitingValidationRate)} helper={`${formatNumber(awaitingValidationCount)} identified record${awaitingValidationCount === 1 ? '' : 's'} awaiting remarks`} icon={LuCircleAlert} tone="warning" />
        <MetricCard label="School participation" value={formatPercentage(schoolRate)} helper={`${formatNumber(summary.attending_school)} attending school`} icon={LuGraduationCap} tone="info" />
        <MetricCard label="Barangays represented" value={formatNumber(scopeCount)} helper={scopeLabel} icon={LuMapPin} />
      </SimpleGrid>

      <Grid templateColumns={{ base: '1fr', xl: 'repeat(12, minmax(0, 1fr))' }} gap={5} alignItems="stretch">
        <GridItem colSpan={{ base: 1, xl: 5 }}>
          <DonutPanel
            title="School attendance"
            description="Participation and immediate education follow-up within the current filters."
            items={schoolItems}
            centerValue={formatPercentage(schoolRate)}
            centerLabel="attending"
          />
        </GridItem>
        <GridItem colSpan={{ base: 1, xl: 7 }}>
          <BreakdownPanel
            title="Case status pipeline"
            description="Current workflow percentages. A record is validated only when validation remarks are present."
            items={statusItems}
          />
        </GridItem>
      </Grid>

      <Grid templateColumns={{ base: '1fr', xl: 'repeat(12, minmax(0, 1fr))' }} gap={5} alignItems="stretch">
        <GridItem colSpan={{ base: 1, xl: 7 }}>
          <BreakdownPanel
            title="Barangay concentration"
            description={`Top barangays by reported child labor records${summary.barangay_distribution.length > 10 ? ' (top 10 shown)' : ''}.`}
            items={barangayItems}
          />
        </GridItem>
        <GridItem colSpan={{ base: 1, xl: 5 }}>
          <DonutPanel
            title="Gender distribution"
            description="Reported gender composition for the complete filtered dataset."
            items={genderItems}
            centerValue={formatNumber(total)}
            centerLabel="records"
          />
        </GridItem>
      </Grid>

      <Grid templateColumns={{ base: '1fr', xl: 'repeat(2, minmax(0, 1fr))' }} gap={5} alignItems="stretch">
        <BreakdownPanel
          title="Age profile"
          description="Age is calculated as of December 31 of the selected filing year."
          items={ageItems}
        />
        <BreakdownPanel
          title="Reported nature of work"
          description="Most common exact work descriptions; lower-frequency responses are grouped."
          items={workItems}
        />
      </Grid>

      <Grid templateColumns={{ base: '1fr', xl: 'repeat(12, minmax(0, 1fr))' }} gap={5} alignItems="stretch">
        <GridItem colSpan={{ base: 1, xl: 7 }}>
          <DataQualityPanel summary={summary} />
        </GridItem>
        <GridItem colSpan={{ base: 1, xl: 5 }}>
          <Card.Root borderColor="border" borderRadius="lg" boxShadow="panel" height="full">
            <Card.Header pb={2} p={{ base: 4, md: 5 }}>
              <SectionHeading title="Decision brief" description="A plain-language reading of the current report filters." />
            </Card.Header>
            <Card.Body pt={2} px={{ base: 4, md: 5 }} pb={{ base: 4, md: 5 }}>
              <VStack align="stretch" gap={3}>
                {[
                  {
                    icon: LuSchool,
                    title: `${formatNumber(summary.not_attending_school)} education follow-up${summary.not_attending_school === 1 ? '' : 's'}`,
                    text: 'Records currently marked as not attending school may need coordinated validation and referral.',
                    tone: 'warning.light',
                    color: 'warning',
                  },
                  {
                    icon: LuShieldCheck,
                    title: `${formatPercentage(validatedRate)} validation completion`,
                    text: `${formatNumber(validatedCount)} of ${formatNumber(total)} filtered records contain validation remarks; ${formatNumber(awaitingValidationCount)} still await validation.`,
                    tone: 'info.light',
                    color: 'info',
                  },
                  {
                    icon: LuDatabase,
                    title: `${formatPercentage(summary.data_quality.completeness_percentage)} reporting completeness`,
                    text: 'Improve missing education, occupation, and nature-of-work details before formal consolidation.',
                    tone: 'primary.50',
                    color: 'primary.700',
                  },
                ].map((item) => (
                  <HStack key={item.title} align="flex-start" gap={3} p={3} borderRadius="md" bg={item.tone}>
                    <Flex boxSize="36px" align="center" justify="center" flexShrink={0} borderRadius="md" bg="surface" color={item.color}>
                      <Icon as={item.icon} boxSize="18px" aria-hidden="true" />
                    </Flex>
                    <Box>
                      <Text fontSize="sm" fontWeight="700">{item.title}</Text>
                      <Text mt={1} fontSize="xs" color="text.secondary" lineHeight="1.55">{item.text}</Text>
                    </Box>
                  </HStack>
                ))}
              </VStack>
            </Card.Body>
          </Card.Root>
        </GridItem>
      </Grid>

      <Text srOnly>
        Report summary: {filterSummary} School participation is {formatPercentage(schoolRate)}.
      </Text>
    </VStack>
  );
};
