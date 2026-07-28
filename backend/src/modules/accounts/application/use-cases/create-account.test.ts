import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAccount } from './create-account';
import { AccountErrors } from '../../domain/errors/account-errors';

const accountRepositoryMock = vi.hoisted(() => ({
  findAuthUserByEmail: vi.fn(),
  findById: vi.fn(),
  createAuthUser: vi.fn(),
  setAuthUserPassword: vi.fn(),
  create: vi.fn(),
  createAssignment: vi.fn(),
  deleteAuthUser: vi.fn(),
  deleteProfile: vi.fn(),
}));

const barangayRepositoryMock = vi.hoisted(() => ({
  findById: vi.fn(),
}));

vi.mock('../../infrastructure/repositories/account-repository', () => ({
  accountRepository: accountRepositoryMock,
}));

vi.mock('../../../barangays/infrastructure/repositories/barangay-repository', () => ({
  barangayRepository: barangayRepositoryMock,
}));

const adminInput = {
  email: 'admin@example.com',
  temporary_password: 'SecurePass123',
  full_name: 'New Admin',
  role: 'ADMIN' as const,
  contact_number: '09123456789',
  position_title: 'Administrator',
};

const profile = {
  id: 'auth-user-1',
  full_name: 'New Admin',
  role: 'ADMIN' as const,
  account_status: 'ACTIVE' as const,
};

describe('createAccount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    accountRepositoryMock.findAuthUserByEmail.mockResolvedValue(null);
    accountRepositoryMock.createAuthUser.mockResolvedValue({ id: 'auth-user-1' });
    accountRepositoryMock.setAuthUserPassword.mockResolvedValue(undefined);
    accountRepositoryMock.create.mockResolvedValue(profile);
    accountRepositoryMock.deleteAuthUser.mockResolvedValue(undefined);
    accountRepositoryMock.deleteProfile.mockResolvedValue(undefined);
  });

  it('creates a new account with a temporary password and all profile fields', async () => {
    await expect(createAccount(adminInput, 'creator-1')).resolves.toBe(profile);

    expect(accountRepositoryMock.createAuthUser).toHaveBeenCalledWith('admin@example.com', 'SecurePass123');
    expect(accountRepositoryMock.create).toHaveBeenCalledWith({
      id: 'auth-user-1',
      full_name: 'New Admin',
      role: 'ADMIN',
      contact_number: '09123456789',
      position_title: 'Administrator',
      created_by: 'creator-1',
    });
    expect(accountRepositoryMock.setAuthUserPassword).not.toHaveBeenCalled();
    expect(accountRepositoryMock.deleteAuthUser).not.toHaveBeenCalled();
  });

  it('recovers an auth user left by a previous incomplete save', async () => {
    accountRepositoryMock.findAuthUserByEmail.mockResolvedValue({ id: 'orphan-auth-user' });
    accountRepositoryMock.findById.mockResolvedValue(null);
    accountRepositoryMock.create.mockResolvedValue({ ...profile, id: 'orphan-auth-user' });

    await expect(createAccount(adminInput, 'creator-1')).resolves.toMatchObject({ id: 'orphan-auth-user' });

    expect(accountRepositoryMock.createAuthUser).not.toHaveBeenCalled();
    expect(accountRepositoryMock.create).toHaveBeenCalledWith(expect.objectContaining({ id: 'orphan-auth-user' }));
    expect(accountRepositoryMock.setAuthUserPassword).toHaveBeenCalledWith('orphan-auth-user', 'SecurePass123');
  });

  it('rejects an email that already has a complete account', async () => {
    accountRepositoryMock.findAuthUserByEmail.mockResolvedValue({ id: 'existing-user' });
    accountRepositoryMock.findById.mockResolvedValue({ ...profile, id: 'existing-user' });

    await expect(createAccount(adminInput, 'creator-1')).rejects.toEqual(AccountErrors.ALREADY_EXISTS);
    expect(accountRepositoryMock.createAuthUser).not.toHaveBeenCalled();
    expect(accountRepositoryMock.create).not.toHaveBeenCalled();
  });

  it('removes a newly created auth user when the profile save fails', async () => {
    accountRepositoryMock.create.mockRejectedValue(new Error('Profile insert failed'));

    await expect(createAccount(adminInput, 'creator-1')).rejects.toThrow('Profile insert failed');
    expect(accountRepositoryMock.deleteAuthUser).toHaveBeenCalledWith('auth-user-1');
    expect(accountRepositoryMock.deleteProfile).not.toHaveBeenCalled();
  });

  it('rolls back a recovered profile if its barangay assignment fails', async () => {
    accountRepositoryMock.findAuthUserByEmail.mockResolvedValue({ id: 'orphan-auth-user' });
    accountRepositoryMock.findById.mockResolvedValue(null);
    accountRepositoryMock.create.mockResolvedValue({ ...profile, id: 'orphan-auth-user', role: 'SK_OFFICIAL' });
    accountRepositoryMock.createAssignment.mockRejectedValue(new Error('Assignment insert failed'));
    barangayRepositoryMock.findById.mockResolvedValue({ id: 'barangay-1', is_active: true });

    await expect(createAccount({
      email: 'official@example.com',
      temporary_password: 'SecurePass123',
      full_name: 'SK Official',
      role: 'SK_OFFICIAL',
      barangay_id: 'barangay-1',
    }, 'creator-1')).rejects.toThrow('Assignment insert failed');

    expect(accountRepositoryMock.deleteProfile).toHaveBeenCalledWith('orphan-auth-user');
    expect(accountRepositoryMock.deleteAuthUser).not.toHaveBeenCalled();
  });
});
