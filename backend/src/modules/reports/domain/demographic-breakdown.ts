export const NO_RESPONSE_LABEL = 'No response';

export type DemographicBreakdown = {
  label: string;
  count: number;
  percentage: number;
};

export type DemographicReportRow = {
  sex: string | null;
  civilStatus: string | null;
  youthClassification: string | null;
  youthAgeGroup: string | null;
  educationalAttainment: string | null;
  workStatus: string | null;
  registeredVoter: boolean | null;
  votedLastElection: boolean | null;
  attendedAssembly: boolean | null;
};

const normalizedLabel = (value: string | null | undefined) => value?.trim() || NO_RESPONSE_LABEL;

export const buildCategoricalBreakdown = (values: Array<string | null | undefined>): DemographicBreakdown[] => {
  const counts = new Map<string, number>();
  values.forEach((value) => {
    const label = normalizedLabel(value);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([label, count]) => ({
      label,
      count,
      percentage: values.length === 0 ? 0 : Number(((count / values.length) * 100).toFixed(1)),
    }))
    .sort((left, right) => (
      left.label === NO_RESPONSE_LABEL ? 1
        : right.label === NO_RESPONSE_LABEL ? -1
          : right.count - left.count || left.label.localeCompare(right.label, 'en-PH')
    ));
};

const booleanLabel = (value: boolean | null) => (
  value === true ? 'Yes' : value === false ? 'No' : NO_RESPONSE_LABEL
);

export const buildDemographicReport = (rows: DemographicReportRow[]) => ({
  totalRecords: rows.length,
  sex: buildCategoricalBreakdown(rows.map((row) => row.sex)),
  civilStatus: buildCategoricalBreakdown(rows.map((row) => row.civilStatus)),
  youthClassification: buildCategoricalBreakdown(rows.map((row) => row.youthClassification)),
  youthAgeGroup: buildCategoricalBreakdown(rows.map((row) => row.youthAgeGroup)),
  educationalAttainment: buildCategoricalBreakdown(rows.map((row) => row.educationalAttainment)),
  workStatus: buildCategoricalBreakdown(rows.map((row) => row.workStatus)),
  registeredVoter: buildCategoricalBreakdown(rows.map((row) => booleanLabel(row.registeredVoter))),
  votedLastElection: buildCategoricalBreakdown(rows.map((row) => booleanLabel(row.votedLastElection))),
  attendedAssembly: buildCategoricalBreakdown(rows.map((row) => booleanLabel(row.attendedAssembly))),
});
