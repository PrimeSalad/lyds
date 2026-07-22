import { accountRepository } from '../../infrastructure/repositories/account-repository';
import { AccountErrors } from '../../domain/errors/account-errors';
import type { Profile } from '../../domain/entities/account';

export const getAccount = async (id: string): Promise<Profile> => {
  const account = await accountRepository.findById(id);
  if (!account) {
    throw AccountErrors.NOT_FOUND;
  }
  return account;
};
