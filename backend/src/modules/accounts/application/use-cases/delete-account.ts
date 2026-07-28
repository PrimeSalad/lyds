import { accountRepository } from '../../infrastructure/repositories/account-repository';
import { AccountErrors } from '../../domain/errors/account-errors';

export const deleteAccount = async (id: string, requestorId: string): Promise<void> => {
  if (id === requestorId) {
    throw AccountErrors.SELF_DELETE;
  }

  const existing = await accountRepository.findById(id);
  if (!existing) {
    throw AccountErrors.NOT_FOUND;
  }

  try {
    await accountRepository.deleteAuthUser(id);
  } catch {
    throw AccountErrors.DELETE_FAILED;
  }
};
