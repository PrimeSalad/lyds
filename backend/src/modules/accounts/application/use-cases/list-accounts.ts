import { accountRepository } from '../../infrastructure/repositories/account-repository';
import type { ProfileWithAssignment } from '../../domain/entities/account';

export const listAccounts = async (): Promise<ProfileWithAssignment[]> => {
  return accountRepository.findAll();
};
