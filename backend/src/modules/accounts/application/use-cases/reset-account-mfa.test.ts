import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetAccountMfa } from './reset-account-mfa';
import { AccountErrors } from '../../domain/errors/account-errors';

const repository = vi.hoisted(() => ({
  findById: vi.fn(),
  deleteMfaFactors: vi.fn(),
}));
const audit = vi.hoisted(() => ({ log: vi.fn() }));

vi.mock('../../infrastructure/repositories/account-repository', () => ({ accountRepository: repository }));
vi.mock('../../../audit-logs/infrastructure/audit-service', () => ({ auditService: audit }));

describe('resetAccountMfa', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repository.findById.mockResolvedValue({ id: 'account-1' });
    repository.deleteMfaFactors.mockResolvedValue(1);
    audit.log.mockResolvedValue(undefined);
  });

  it('removes factors and records the administrator action', async () => {
    await expect(resetAccountMfa('account-1', 'admin-1', 'ADMIN')).resolves.toEqual({ removed_factors: 1 });
    expect(repository.deleteMfaFactors).toHaveBeenCalledWith('account-1');
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({
      actor_profile_id: 'admin-1',
      action: 'RESET_MFA',
      entity_id: 'account-1',
      metadata: { removed_factors: 1 },
    }));
  });

  it('prevents self-service bypass through the admin endpoint', async () => {
    await expect(resetAccountMfa('admin-1', 'admin-1', 'ADMIN')).rejects.toEqual(AccountErrors.SELF_MFA_RESET);
    expect(repository.deleteMfaFactors).not.toHaveBeenCalled();
  });

  it('rejects an unknown account', async () => {
    repository.findById.mockResolvedValue(null);
    await expect(resetAccountMfa('missing', 'admin-1', 'ADMIN')).rejects.toEqual(AccountErrors.NOT_FOUND);
  });

  it('does not write a success audit when provider cleanup fails', async () => {
    repository.deleteMfaFactors.mockRejectedValue(new Error('Provider failure'));
    await expect(resetAccountMfa('account-1', 'admin-1', 'ADMIN')).rejects.toEqual(AccountErrors.MFA_RESET_FAILED);
    expect(audit.log).not.toHaveBeenCalled();
  });
});
