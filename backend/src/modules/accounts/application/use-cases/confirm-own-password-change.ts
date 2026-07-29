import { auditService } from '../../../audit-logs/infrastructure/audit-service';
import { accountRepository } from '../../infrastructure/repositories/account-repository';

export const confirmOwnPasswordChange = async (
  profileId: string,
  role: 'ADMIN' | 'SK_OFFICIAL',
): Promise<void> => {
  await accountRepository.update(profileId, { must_change_password: false });
  await auditService.log({
    actor_profile_id: profileId,
    actor_role: role,
    action: 'CHANGE_PASSWORD',
    entity_type: 'ACCOUNT',
    entity_id: profileId,
  });
};
