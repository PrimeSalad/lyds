import { beforeEach, describe, expect, it, vi } from 'vitest';
import { approveSubmittedYouthRecordsByBarangay } from './approve-submitted-youth-records-by-barangay';

const repository = vi.hoisted(() => ({
  approveSubmittedRecordsByBarangay: vi.fn(),
}));

const audit = vi.hoisted(() => ({
  log: vi.fn(),
}));

vi.mock('../../infrastructure/repositories/youth-record-repository', () => ({
  youthRecordRepository: repository,
}));

vi.mock('../../../audit-logs/infrastructure/audit-service', () => ({
  auditService: audit,
}));

describe('approveSubmittedYouthRecordsByBarangay', () => {
  beforeEach(() => {
    repository.approveSubmittedRecordsByBarangay.mockReset();
    audit.log.mockReset();
  });

  it('approves only the selected barangay and filing year and logs the bulk action', async () => {
    repository.approveSubmittedRecordsByBarangay.mockResolvedValue(12);

    await expect(approveSubmittedYouthRecordsByBarangay({
      actorId: 'admin-1',
      actorRole: 'ADMIN',
      barangayId: 'barangay-1',
      filingYear: 2026,
    })).resolves.toEqual({ approved_count: 12 });

    expect(repository.approveSubmittedRecordsByBarangay).toHaveBeenCalledWith('admin-1', 'barangay-1', 2026);
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({
      action: 'BULK_APPROVE_SUBMITTED_BY_BARANGAY',
      metadata: {
        barangay_id: 'barangay-1',
        filing_year: 2026,
        approved_count: 12,
      },
    }));
  });
});
