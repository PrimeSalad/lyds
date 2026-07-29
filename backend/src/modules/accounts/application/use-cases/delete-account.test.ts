import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteAccount } from './delete-account';
import { AccountErrors } from '../../domain/errors/account-errors';

const repository = vi.hoisted(() => ({
  findById: vi.fn(),
  prepareForDeletion: vi.fn(),
  deleteAuthUser: vi.fn(),
}));

vi.mock('../../infrastructure/repositories/account-repository', () => ({
  accountRepository: repository,
}));

describe('deleteAccount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repository.findById.mockResolvedValue({ id: 'account-1' });
    repository.prepareForDeletion.mockResolvedValue(undefined);
    repository.deleteAuthUser.mockResolvedValue(undefined);
  });

  it('removes unapproved account data before deleting the authentication user', async () => {
    await expect(deleteAccount('account-1', 'admin-1')).resolves.toBeUndefined();
    expect(repository.prepareForDeletion).toHaveBeenCalledWith('account-1');
    expect(repository.deleteAuthUser).toHaveBeenCalledWith('account-1');
    expect(repository.prepareForDeletion.mock.invocationCallOrder[0]).toBeLessThan(
      repository.deleteAuthUser.mock.invocationCallOrder[0],
    );
  });

  it('prevents an administrator from deleting their own account', async () => {
    await expect(deleteAccount('admin-1', 'admin-1')).rejects.toEqual(AccountErrors.SELF_DELETE);
    expect(repository.findById).not.toHaveBeenCalled();
    expect(repository.prepareForDeletion).not.toHaveBeenCalled();
    expect(repository.deleteAuthUser).not.toHaveBeenCalled();
  });

  it('rejects an unknown account', async () => {
    repository.findById.mockResolvedValue(null);
    await expect(deleteAccount('missing', 'admin-1')).rejects.toEqual(AccountErrors.NOT_FOUND);
    expect(repository.prepareForDeletion).not.toHaveBeenCalled();
    expect(repository.deleteAuthUser).not.toHaveBeenCalled();
  });

  it('preserves accounts that created approved youth records', async () => {
    repository.prepareForDeletion.mockRejectedValue(new Error('ACCOUNT_HAS_APPROVED_RECORDS'));
    await expect(deleteAccount('account-1', 'admin-1')).rejects.toEqual(AccountErrors.HAS_APPROVED_RECORDS);
    expect(repository.deleteAuthUser).not.toHaveBeenCalled();
  });

  it('returns a recoverable error when account-data cleanup fails', async () => {
    repository.prepareForDeletion.mockRejectedValue(new Error('Database unavailable'));
    await expect(deleteAccount('account-1', 'admin-1')).rejects.toEqual(AccountErrors.DELETE_FAILED);
    expect(repository.deleteAuthUser).not.toHaveBeenCalled();
  });

  it('returns a recoverable error when authentication deletion fails', async () => {
    repository.deleteAuthUser.mockRejectedValue(new Error('Foreign key violation'));
    await expect(deleteAccount('account-1', 'admin-1')).rejects.toEqual(AccountErrors.DELETE_FAILED);
  });
});
