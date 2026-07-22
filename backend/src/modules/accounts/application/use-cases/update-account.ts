import { accountRepository } from '../../infrastructure/repositories/account-repository';
import { AccountErrors } from '../../domain/errors/account-errors';
import type { Profile, UpdateAccountInput } from '../../domain/entities/account';

export const updateAccount = async (id: string, input: UpdateAccountInput): Promise<Profile> => {
  const existing = await accountRepository.findById(id);
  if (!existing) {
    throw AccountErrors.NOT_FOUND;
  }
  return accountRepository.update(id, input);
};
