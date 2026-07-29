import { accountRepository } from '../../infrastructure/repositories/account-repository';
import { AccountErrors } from '../../domain/errors/account-errors';

const errorMessage = (error: unknown): string => (
  typeof error === 'object' && error !== null && 'message' in error
    ? String(error.message)
    : ''
);

export const deleteAccount = async (id: string, requestorId: string): Promise<void> => {
  if (id === requestorId) {
    throw AccountErrors.SELF_DELETE;
  }

  const existing = await accountRepository.findById(id);
  if (!existing) {
    throw AccountErrors.NOT_FOUND;
  }

  try {
    await accountRepository.prepareForDeletion(id);
  } catch (error) {
    if (errorMessage(error).includes('ACCOUNT_HAS_APPROVED_RECORDS')) {
      throw AccountErrors.HAS_APPROVED_RECORDS;
    }
    throw AccountErrors.DELETE_FAILED;
  }

  try {
    await accountRepository.deleteAuthUser(id);
  } catch {
    throw AccountErrors.DELETE_FAILED;
  }
};
