import { Box, Button, Field, Flex, NativeSelect } from '@chakra-ui/react';
import { LuArrowUpRight } from 'react-icons/lu';

export type DashboardView = 'YOUTH' | 'CHILD_LABORERS';

type DashboardViewSwitcherProps = {
  view: DashboardView;
  filingYear: number;
  filingYears: number[];
  onViewChange: (view: DashboardView) => void;
  onFilingYearChange: (year: number) => void;
  onOpenRecords: () => void;
};

export const DashboardViewSwitcher = ({
  view,
  filingYear,
  filingYears,
  onViewChange,
  onFilingYearChange,
  onOpenRecords,
}: DashboardViewSwitcherProps) => (
  <Box
    as="section"
    aria-label="Dashboard filters"
    mb={5}
    p={{ base: 3, md: 4 }}
    bg="surface"
    borderWidth="1px"
    borderColor="border"
    borderRadius="lg"
    boxShadow="panel"
  >
    <Flex
      align={{ base: 'stretch', md: 'flex-end' }}
      direction={{ base: 'column', md: 'row' }}
      gap={3}
    >
      <Field.Root width={{ base: 'full', md: '260px' }}>
        <Field.Label htmlFor="dashboard-view" fontSize="xs" fontWeight="600" color="text.secondary">
          Registry
        </Field.Label>
        <NativeSelect.Root width="full">
          <NativeSelect.Field
            id="dashboard-view"
            minH="44px"
            value={view}
            onChange={(event) => onViewChange(event.target.value as DashboardView)}
          >
            <option value="YOUTH">Youth Registry</option>
            <option value="CHILD_LABORERS">Child Laborer Records</option>
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
      </Field.Root>

      <Field.Root width={{ base: 'full', md: '148px' }}>
        <Field.Label htmlFor="dashboard-filing-year" fontSize="xs" fontWeight="600" color="text.secondary">
          Filing year
        </Field.Label>
        <NativeSelect.Root width="full">
          <NativeSelect.Field
            id="dashboard-filing-year"
            minH="44px"
            value={filingYear}
            onChange={(event) => onFilingYearChange(Number(event.target.value))}
          >
            {filingYears.map((year) => <option key={year} value={year}>{year}</option>)}
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
      </Field.Root>

      <Button variant="outline" minH="44px" ml={{ md: 'auto' }} onClick={onOpenRecords}>
        Open records <LuArrowUpRight aria-hidden="true" />
      </Button>
    </Flex>
  </Box>
);
