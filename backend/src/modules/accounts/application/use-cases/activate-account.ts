import { accountRepository } from '../../infrastructure/repositories/account-repository';
import { AccountErrors } from '../../domain/errors/account-errors';
import type { Profile } from '../../domain/entities/account';

export const activateAccount = async (id: string, requestorId: string): Promise<Profile> => {
  if (id === requestorId) {
    throw AccountErrors.SELF_DEACTIVATE;
  }

  const existing = await accountRepository.findById(id);
  if (!existing) {
    throw AccountErrors.NOT_FOUND;
  }

  return accountRepository.setActive(id, 'ACTIVE');
};
