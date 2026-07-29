import { accountRepository } from '../../infrastructure/repositories/account-repository';
import { auditService } from '../../../audit-logs/infrastructure/audit-service';
import { AccountErrors } from '../../domain/errors/account-errors';

export const resetAccountMfa = async (
  id: string,
  requestorId: string,
  requestorRole: 'ADMIN' | 'SK_OFFICIAL',
): Promise<{ removed_factors: number }> => {
  if (id === requestorId) {
    throw AccountErrors.SELF_MFA_RESET;
  }

  const existing = await accountRepository.findById(id);
  if (!existing) {
    throw AccountErrors.NOT_FOUND;
  }

  let removedFactors: number;
  try {
    removedFactors = await accountRepository.deleteMfaFactors(id);
  } catch {
    throw AccountErrors.MFA_RESET_FAILED;
  }

  await auditService.log({
    actor_profile_id: requestorId,
    actor_role: requestorRole,
    action: 'RESET_MFA',
    entity_type: 'ACCOUNT',
    entity_id: id,
    metadata: { removed_factors: removedFactors },
  });

  return { removed_factors: removedFactors };
};
