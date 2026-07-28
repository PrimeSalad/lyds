import { beforeEach, describe, expect, it, vi } from 'vitest';
import { updateAccount } from './update-account';

const repository = vi.hoisted(() => ({
  findById: vi.fn(),
  setAuthUserPassword: vi.fn(),
  update: vi.fn(),
}));

vi.mock('../../infrastructure/repositories/account-repository', () => ({
  accountRepository: repository,
}));

describe('updateAccount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repository.findById.mockResolvedValue({ id: 'account-1' });
    repository.setAuthUserPassword.mockResolvedValue(undefined);
    repository.update.mockResolvedValue({ id: 'account-1', full_name: 'Updated User' });
  });

  it('sets an optional temporary password and marks it for replacement', async () => {
    await updateAccount('account-1', {
      full_name: 'Updated User',
      temporary_password: 'SecurePass123',
    });

    expect(repository.setAuthUserPassword).toHaveBeenCalledWith('account-1', 'SecurePass123');
    expect(repository.update).toHaveBeenCalledWith('account-1', {
      full_name: 'Updated User',
      must_change_password: true,
    });
  });

  it('does not touch the password when no temporary password is supplied', async () => {
    await updateAccount('account-1', { full_name: 'Updated User' });

    expect(repository.setAuthUserPassword).not.toHaveBeenCalled();
    expect(repository.update).toHaveBeenCalledWith('account-1', { full_name: 'Updated User' });
  });
});
