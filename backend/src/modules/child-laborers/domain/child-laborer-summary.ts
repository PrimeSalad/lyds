import { computeChildAgeForFilingYear } from './child-laborer-age';
import {
  childLaborerGenders,
  childLaborerStatuses,
  type ChildLaborerGender,
  type ChildLaborerStatus,
} from './child-laborer';

export type ChildLaborerSummarySource = {
  filing_year: number;
  barangay_id: string;
  birth_date: string;
  gender: ChildLaborerGender;
  attending_school: boolean;
  highest_grade_completed: string | null;
  nature_of_work: string;
  parent_guardian_occupation: string | null;
  record_status: ChildLaborerStatus;
  barangay: unknown;
};

export type ChildLaborerBreakdownItem = {
  key: string;
  label: string;
  count: number;
  percentage: number;
};

const activeStatuses = new Set<ChildLaborerStatus>([
  'IDENTIFIED',
  'VALIDATED',
  'REFERRED',
  'MONITORED',
]);

const genderLabels: Record<ChildLaborerGender, string> = {
  MALE: 'Male',
  FEMALE: 'Female',
  NOT_SPECIFIED: 'Not specified',
};
const unreportedWorkLabels = new Set([
  'not reported',
  'not specified in source workbook',
]);

const ageGroups = [
  { key: 'UNDER_10', label: 'Under 10', includes: (age: number) => age < 10 },
  { key: 'AGE_10_14', label: '10–14', includes: (age: number) => age >= 10 && age <= 14 },
  { key: 'AGE_15_17', label: '15–17', includes: (age: number) => age >= 15 && age <= 17 },
  { key: 'AGE_18_PLUS', label: '18 and above', includes: (age: number) => age >= 18 },
] as const;

const percentage = (count: number, total: number) => (
  total === 0 ? 0 : Math.round((count / total) * 1_000) / 10
);

const relationName = (relation: unknown) => {
  if (Array.isArray(relation)) return String(relation[0]?.name ?? 'Unknown barangay');
  if (relation && typeof relation === 'object' && 'name' in relation) {
    return String((relation as { name?: unknown }).name ?? 'Unknown barangay');
  }
  return 'Unknown barangay';
};

const normalizedLabel = (value: string) => value
  .normalize('NFKC')
  .replace(/\s+/g, ' ')
  .trim()
  .toLocaleLowerCase('en');

const countedBreakdown = (
  counts: Map<string, { label: string; count: number }>,
  total: number,
) => [...counts.entries()]
  .map(([key, item]) => ({
    key,
    label: item.label,
    count: item.count,
    percentage: percentage(item.count, total),
  }))
  .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));

const workBreakdown = (records: ChildLaborerSummarySource[], total: number) => {
  const counts = new Map<string, { label: string; count: number }>();
  for (const record of records) {
    const label = record.nature_of_work.trim() || 'Not specified';
    const key = normalizedLabel(label);
    const current = counts.get(key);
    counts.set(key, { label: current?.label ?? label, count: (current?.count ?? 0) + 1 });
  }

  const ranked = countedBreakdown(counts, total);
  if (ranked.length <= 6) return ranked;

  const leading = ranked.slice(0, 5);
  const remainingCount = ranked.slice(5).reduce((sum, item) => sum + item.count, 0);
  return [
    ...leading,
    {
      key: 'OTHER',
      label: 'Other reported work',
      count: remainingCount,
      percentage: percentage(remainingCount, total),
    },
  ];
};

export const buildChildLaborerSummary = (records: ChildLaborerSummarySource[]) => {
  const totalRecords = records.length;
  const statusCounts = Object.fromEntries(
    childLaborerStatuses.map((status) => [status, 0]),
  ) as Record<ChildLaborerStatus, number>;
  const genderCounts = Object.fromEntries(
    childLaborerGenders.map((gender) => [gender, 0]),
  ) as Record<ChildLaborerGender, number>;
  const ageCounts = Object.fromEntries(ageGroups.map((group) => [group.key, 0])) as Record<string, number>;
  const barangayCounts = new Map<string, { label: string; count: number }>();
  let attendingSchool = 0;
  let recordsWithGrade = 0;
  let recordsWithParentOccupation = 0;
  let recordsWithSpecifiedWork = 0;
  let completeRecords = 0;

  for (const record of records) {
    statusCounts[record.record_status] += 1;
    genderCounts[record.gender] += 1;
    if (record.attending_school) attendingSchool += 1;

    const age = computeChildAgeForFilingYear(record.birth_date, record.filing_year);
    const ageGroup = ageGroups.find((group) => group.includes(age));
    if (ageGroup) ageCounts[ageGroup.key] += 1;

    const barangay = barangayCounts.get(record.barangay_id);
    barangayCounts.set(record.barangay_id, {
      label: barangay?.label ?? relationName(record.barangay),
      count: (barangay?.count ?? 0) + 1,
    });

    const hasGrade = Boolean(record.highest_grade_completed?.trim());
    const hasParentOccupation = Boolean(record.parent_guardian_occupation?.trim());
    const work = normalizedLabel(record.nature_of_work);
    const hasSpecifiedWork = Boolean(work) && !unreportedWorkLabels.has(work);
    if (hasGrade) recordsWithGrade += 1;
    if (hasParentOccupation) recordsWithParentOccupation += 1;
    if (hasSpecifiedWork) recordsWithSpecifiedWork += 1;
    if (hasGrade && hasParentOccupation && hasSpecifiedWork) completeRecords += 1;
  }

  const completedQualityFields = recordsWithGrade + recordsWithParentOccupation + recordsWithSpecifiedWork;
  const possibleQualityFields = totalRecords * 3;

  return {
    total_records: totalRecords,
    attending_school: attendingSchool,
    not_attending_school: totalRecords - attendingSchool,
    active_cases: records.filter((record) => activeStatuses.has(record.record_status)).length,
    closed_cases: statusCounts.CLOSED,
    status_counts: statusCounts,
    gender_distribution: childLaborerGenders.map((gender) => ({
      key: gender,
      label: genderLabels[gender],
      count: genderCounts[gender],
      percentage: percentage(genderCounts[gender], totalRecords),
    })),
    age_distribution: ageGroups.map((group) => ({
      key: group.key,
      label: group.label,
      count: ageCounts[group.key],
      percentage: percentage(ageCounts[group.key], totalRecords),
    })),
    barangay_distribution: countedBreakdown(barangayCounts, totalRecords),
    work_distribution: workBreakdown(records, totalRecords),
    data_quality: {
      completeness_percentage: possibleQualityFields === 0
        ? 0
        : Math.round((completedQualityFields / possibleQualityFields) * 1_000) / 10,
      complete_records: completeRecords,
      records_with_grade: recordsWithGrade,
      records_with_parent_occupation: recordsWithParentOccupation,
      records_with_specified_work: recordsWithSpecifiedWork,
    },
  };
};
