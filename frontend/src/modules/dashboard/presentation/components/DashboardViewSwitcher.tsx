import { Badge, Box, Button, Card, Field, Flex, HStack, NativeSelect, Text } from '@chakra-ui/react';
import { LuArrowUpRight, LuLayoutDashboard } from 'react-icons/lu';

export type DashboardView = 'YOUTH' | 'CHILD_LABORERS';

type DashboardViewSwitcherProps = {
  view: DashboardView;
  childLaborerYear: number;
  childLaborerYears: number[];
  onViewChange: (view: DashboardView) => void;
  onChildLaborerYearChange: (year: number) => void;
  onOpenRecords: () => void;
};

const viewMeta: Record<DashboardView, { badge: string; description: string }> = {
  YOUTH: {
    badge: 'Youth registry',
    description: 'Registration, review workflow, barangay coverage, and profile quality.',
  },
  CHILD_LABORERS: {
    badge: 'Child labor records',
    description: 'Validation progress, education status, demographics, barangay concentration, and reported work.',
  },
};

export const DashboardViewSwitcher = ({
  view,
  childLaborerYear,
  childLaborerYears,
  onViewChange,
  onChildLaborerYearChange,
  onOpenRecords,
}: DashboardViewSwitcherProps) => {
  const activeView = viewMeta[view];

  return (
    <Card.Root
      as="section"
      aria-labelledby="dashboard-workspace-title"
      mb={5}
      borderColor="primary.200"
      borderLeftWidth="4px"
      borderLeftColor="primary.600"
      borderRadius="lg"
      boxShadow="panel"
      overflow="hidden"
    >
      <Card.Body p={{ base: 4, md: 5 }}>
        <Flex
          justify="space-between"
          align={{ base: 'stretch', lg: 'flex-end' }}
          direction={{ base: 'column', lg: 'row' }}
          gap={5}
        >
          <HStack align="flex-start" gap={3} minW={0}>
            <Flex
              boxSize="44px"
              flexShrink={0}
              align="center"
              justify="center"
              borderRadius="md"
              bg="primary.50"
              color="primary.700"
            >
              <LuLayoutDashboard size={21} aria-hidden="true" />
            </Flex>
            <Box minW={0}>
              <HStack gap={2} wrap="wrap">
                <Text id="dashboard-workspace-title" fontFamily="heading" fontWeight="700" color="text.primary">
                  Dashboard workspace
                </Text>
                <Badge colorPalette={view === 'CHILD_LABORERS' ? 'orange' : 'green'} variant="subtle">
                  {activeView.badge}
                </Badge>
              </HStack>
              <Text
                id="dashboard-workspace-description"
                mt={1}
                maxW="680px"
                fontSize="sm"
                color="text.muted"
                lineHeight="1.6"
                aria-live="polite"
              >
                {activeView.description}
              </Text>
            </Box>
          </HStack>

          <Flex
            align={{ base: 'stretch', sm: 'flex-end' }}
            direction={{ base: 'column', sm: 'row' }}
            gap={3}
            flexShrink={0}
          >
            <Field.Root width={{ base: 'full', sm: '236px' }}>
              <Field.Label htmlFor="dashboard-view" fontSize="xs" fontWeight="600" color="text.secondary">
                Dashboard view
              </Field.Label>
              <NativeSelect.Root width="full">
                <NativeSelect.Field
                  id="dashboard-view"
                  minH="44px"
                  value={view}
                  aria-describedby="dashboard-workspace-description"
                  onChange={(event) => onViewChange(event.target.value as DashboardView)}
                >
                  <option value="YOUTH">Youth Registry</option>
                  <option value="CHILD_LABORERS">Child Laborer Records</option>
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </Field.Root>

            {view === 'CHILD_LABORERS' && (
              <Field.Root width={{ base: 'full', sm: '132px' }}>
                <Field.Label htmlFor="child-laborer-dashboard-year" fontSize="xs" fontWeight="600" color="text.secondary">
                  Filing year
                </Field.Label>
                <NativeSelect.Root width="full">
                  <NativeSelect.Field
                    id="child-laborer-dashboard-year"
                    minH="44px"
                    value={childLaborerYear}
                    onChange={(event) => onChildLaborerYearChange(Number(event.target.value))}
                  >
                    {childLaborerYears.map((year) => <option key={year} value={year}>{year}</option>)}
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>
              </Field.Root>
            )}

            <Button variant="outline" minH="44px" onClick={onOpenRecords}>
              Open records <LuArrowUpRight aria-hidden="true" />
            </Button>
          </Flex>
        </Flex>
      </Card.Body>
    </Card.Root>
  );
};
