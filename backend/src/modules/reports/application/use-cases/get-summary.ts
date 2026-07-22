import { reportRepository } from '../../infrastructure/repositories/report-repository';

export const getSummary = async (filters: {
  barangayId?: string | null;
  categoryId?: string | null;
  status?: string | null;
}) => {
  const summary = await reportRepository.getSummary(filters);

  return {
    totalRecords: summary.total,
    draft: summary.byStatus.DRAFT,
    submitted: summary.byStatus.SUBMITTED,
    approved: summary.byStatus.APPROVED,
    returned: summary.byStatus.RETURNED,
    archived: summary.byStatus.ARCHIVED,
    thisMonth: summary.thisMonth,
    totalBarangays: summary.totalBarangays,
    totalAccounts: summary.totalSKAccounts,
  };
};
