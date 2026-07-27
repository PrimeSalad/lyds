import { beforeEach, describe, expect, it, vi } from 'vitest';
import { approveDraftYouthRecords } from './approve-draft-youth-records';

const repository = vi.hoisted(() => ({
  approveDraftRecords: vi.fn(),
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

describe('approveDraftYouthRecords', () => {
  beforeEach(() => {
    repository.approveDraftRecords.mockReset();
    audit.log.mockReset();
  });

  it('approves every draft record and writes an audit log', async () => {
    repository.approveDraftRecords.mockResolvedValue(7);

    await expect(approveDraftYouthRecords('profile-1', 'ADMIN')).resolves.toEqual({ approved_count: 7 });
    expect(repository.approveDraftRecords).toHaveBeenCalledWith('profile-1');
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({
      action: 'BULK_APPROVE_DRAFTS',
      metadata: { approved_count: 7 },
    }));
  });
});
