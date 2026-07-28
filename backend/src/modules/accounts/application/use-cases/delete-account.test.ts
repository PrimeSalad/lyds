import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteAccount } from './delete-account';
import { AccountErrors } from '../../domain/errors/account-errors';

const repository = vi.hoisted(() => ({
  findById: vi.fn(),
  deleteAuthUser: vi.fn(),
}));

vi.mock('../../infrastructure/repositories/account-repository', () => ({
  accountRepository: repository,
}));

describe('deleteAccount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repository.findById.mockResolvedValue({ id: 'account-1' });
    repository.deleteAuthUser.mockResolvedValue(undefined);
  });

  it('deletes the authentication user and its cascading profile', async () => {
    await expect(deleteAccount('account-1', 'admin-1')).resolves.toBeUndefined();
    expect(repository.deleteAuthUser).toHaveBeenCalledWith('account-1');
  });

  it('prevents an administrator from deleting their own account', async () => {
    await expect(deleteAccount('admin-1', 'admin-1')).rejects.toEqual(AccountErrors.SELF_DELETE);
    expect(repository.findById).not.toHaveBeenCalled();
    expect(repository.deleteAuthUser).not.toHaveBeenCalled();
  });

  it('rejects an unknown account', async () => {
    repository.findById.mockResolvedValue(null);
    await expect(deleteAccount('missing', 'admin-1')).rejects.toEqual(AccountErrors.NOT_FOUND);
    expect(repository.deleteAuthUser).not.toHaveBeenCalled();
  });

  it('preserves accounts that have linked activity', async () => {
    repository.deleteAuthUser.mockRejectedValue(new Error('Foreign key violation'));
    await expect(deleteAccount('account-1', 'admin-1')).rejects.toEqual(AccountErrors.DELETE_FAILED);
  });
});
