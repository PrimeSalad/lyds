import { accountRepository } from '../../infrastructure/repositories/account-repository';
import { barangayRepository } from '../../../barangays/infrastructure/repositories/barangay-repository';
import { AccountErrors } from '../../domain/errors/account-errors';
import type { Profile, BarangayAssignment } from '../../domain/entities/account';

interface AssignBarangayResult {
  profile: Profile;
  assignment: BarangayAssignment;
}

export const assignBarangay = async (
  accountId: string,
  barangayId: string,
  assignedBy: string,
): Promise<AssignBarangayResult> => {
  const account = await accountRepository.findById(accountId);
  if (!account) {
    throw AccountErrors.NOT_FOUND;
  }

  if (account.role !== 'SK_OFFICIAL') {
    throw { status: 422, code: 'INVALID_ROLE', message: 'Only SK officials can be assigned to a barangay.' };
  }

  const barangay = await barangayRepository.findById(barangayId);
  if (!barangay || !barangay.is_active) {
    throw AccountErrors.INVALID_BARANGAY;
  }

  // End current active assignment
  const currentAssignment = await accountRepository.getActiveAssignment(accountId);
  if (currentAssignment) {
    await accountRepository.endAssignment(currentAssignment.id);
  }

  // Create new assignment
  const assignment = await accountRepository.createAssignment({
    profile_id: accountId,
    barangay_id: barangayId,
    assigned_by: assignedBy,
  });

  return { profile: account, assignment };
};
