import type { RecordStatus } from '../../youth-records/domain/entities/youth-record';

export type AnalyticsProfile = {
  id: string;
  barangay_id: string;
  display_name: string;
  first_name: string | null;
  last_name: string | null;
  birth_date: string;
  age_at_submission: number | null;
  status: RecordStatus;
  email: string | null;
  contact_number: string | null;
  sex_assigned_at_birth_id: string | null;
  civil_status_id: string | null;
  youth_classification_id: string | null;
  youth_age_group_id: string | null;
  educational_attainment_id: string | null;
  work_status_id: string | null;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  approved_at: string | null;
  barangayName: string;
  ageGroupLabel: string | null;
  classificationLabel: string | null;
};

export type AnalyticsBarangay = {
  id: string;
  name: string;
};

const statuses: RecordStatus[] = ['DRAFT', 'SUBMITTED', 'APPROVED', 'RETURNED', 'ARCHIVED'];
const statusLabels: Record<RecordStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Pending review',
  APPROVED: 'Approved',
  RETURNED: 'Returned',
  ARCHIVED: 'Archived',
};

const monthKey = (date: Date) => `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;

const buildBreakdown = (values: Array<string | null>) => {
  const counts = new Map<string, number>();
  values.forEach((value) => {
    if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
  });
  const total = Array.from(counts.values()).reduce((sum, count) => sum + count, 0);
  return Array.from(counts.entries())
    .map(([label, count]) => ({
      label,
      count,
      percentage: total === 0 ? 0 : Number(((count / total) * 100).toFixed(1)),
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
};

export const buildDashboardAnalytics = (
  profiles: AnalyticsProfile[],
  barangays: AnalyticsBarangay[],
  totalAccounts: number,
  now = new Date(),
) => {
  const statusCounts = Object.fromEntries(statuses.map((status) => [status, 0])) as Record<RecordStatus, number>;
  profiles.forEach((profile) => {
    statusCounts[profile.status] += 1;
  });

  const sixMonths = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (5 - index), 1));
    return {
      month: monthKey(date),
      label: new Intl.DateTimeFormat('en-PH', { month: 'short', timeZone: 'UTC' }).format(date),
      created: 0,
      submitted: 0,
      approved: 0,
    };
  });
  const monthMap = new Map(sixMonths.map((month) => [month.month, month]));
  profiles.forEach((profile) => {
    const createdMonth = monthMap.get(monthKey(new Date(profile.created_at)));
    if (createdMonth) createdMonth.created += 1;
    if (profile.submitted_at) {
      const submittedMonth = monthMap.get(monthKey(new Date(profile.submitted_at)));
      if (submittedMonth) submittedMonth.submitted += 1;
    }
    if (profile.approved_at) {
      const approvedMonth = monthMap.get(monthKey(new Date(profile.approved_at)));
      if (approvedMonth) approvedMonth.approved += 1;
    }
  });

  const barangayStats = new Map(barangays.map((barangay) => [barangay.id, {
    barangayId: barangay.id,
    barangayName: barangay.name,
    totalRecords: 0,
    pendingReview: 0,
    approved: 0,
    lastActivityAt: null as string | null,
  }]));
  profiles.forEach((profile) => {
    const stat = barangayStats.get(profile.barangay_id);
    if (!stat) return;
    stat.totalRecords += 1;
    if (profile.status === 'SUBMITTED') stat.pendingReview += 1;
    if (profile.status === 'APPROVED') stat.approved += 1;
    if (!stat.lastActivityAt || profile.updated_at > stat.lastActivityAt) stat.lastActivityAt = profile.updated_at;
  });

  const requiredFields: Array<keyof AnalyticsProfile> = [
    'first_name',
    'last_name',
    'birth_date',
    'sex_assigned_at_birth_id',
    'civil_status_id',
    'youth_classification_id',
    'youth_age_group_id',
    'educational_attainment_id',
    'work_status_id',
  ];
  const completeRecords = profiles.filter((profile) => requiredFields.every((field) => Boolean(profile[field]))).length;
  const missingContact = profiles.filter((profile) => !profile.email?.trim() && !profile.contact_number?.trim()).length;
  const staleThreshold = now.getTime() - (30 * 24 * 60 * 60 * 1000);
  const staleDrafts = profiles.filter((profile) => (
    profile.status === 'DRAFT' && new Date(profile.updated_at).getTime() < staleThreshold
  )).length;
  const duplicateGroups = new Map<string, number>();
  profiles.forEach((profile) => {
    const key = `${profile.barangay_id}|${profile.display_name.trim().toLocaleLowerCase()}|${profile.birth_date}`;
    duplicateGroups.set(key, (duplicateGroups.get(key) ?? 0) + 1);
  });

  const thisMonth = monthKey(now);
  const totalRecords = profiles.length;
  const barangayCoverage = Array.from(barangayStats.values())
    .sort((a, b) => b.totalRecords - a.totalRecords || a.barangayName.localeCompare(b.barangayName));
  const barangaysWithRecords = barangayCoverage.filter((barangay) => barangay.totalRecords > 0).length;

  return {
    summary: {
      totalRecords,
      draft: statusCounts.DRAFT,
      submitted: statusCounts.SUBMITTED,
      approved: statusCounts.APPROVED,
      returned: statusCounts.RETURNED,
      archived: statusCounts.ARCHIVED,
      thisMonth: profiles.filter((profile) => monthKey(new Date(profile.created_at)) === thisMonth).length,
      totalBarangays: barangays.length,
      totalAccounts,
    },
    statusDistribution: statuses.map((status) => ({
      status,
      label: statusLabels[status],
      count: statusCounts[status],
      percentage: totalRecords === 0 ? 0 : Number(((statusCounts[status] / totalRecords) * 100).toFixed(1)),
    })),
    monthlyTrend: sixMonths,
    barangayCoverage,
    coverage: {
      barangaysWithRecords,
      totalBarangays: barangays.length,
      percentage: barangays.length === 0 ? 0 : Number(((barangaysWithRecords / barangays.length) * 100).toFixed(1)),
    },
    dataQuality: {
      completeRecords,
      completionRate: totalRecords === 0 ? 0 : Number(((completeRecords / totalRecords) * 100).toFixed(1)),
      missingContact,
      incompleteCore: totalRecords - completeRecords,
      duplicateCandidates: Array.from(duplicateGroups.values()).filter((count) => count > 1).length,
      staleDrafts,
    },
    demographics: {
      ageGroups: buildBreakdown(profiles.map((profile) => profile.ageGroupLabel)),
      youthClassifications: buildBreakdown(profiles.map((profile) => profile.classificationLabel)),
    },
    recentRecords: [...profiles]
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
      .slice(0, 6)
      .map((profile) => ({
        id: profile.id,
        displayName: profile.display_name,
        barangayName: profile.barangayName,
        status: profile.status,
        updatedAt: profile.updated_at,
      })),
    generatedAt: now.toISOString(),
  };
};
