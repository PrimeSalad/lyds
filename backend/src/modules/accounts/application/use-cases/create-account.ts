import { accountRepository } from '../../infrastructure/repositories/account-repository';
import { barangayRepository } from '../../../barangays/infrastructure/repositories/barangay-repository';
import { AccountErrors } from '../../domain/errors/account-errors';
import type { CreateAccountInput, Profile } from '../../domain/entities/account';

export const createAccount = async (input: CreateAccountInput, createdBy: string): Promise<Profile> => {
  // Validate barangay exists if SK_OFFICIAL
  if (input.role === 'SK_OFFICIAL') {
    if (!input.barangay_id) {
      throw AccountErrors.BARANGAY_REQUIRED;
    }
    const barangay = await barangayRepository.findById(input.barangay_id);
    if (!barangay || !barangay.is_active) {
      throw AccountErrors.INVALID_BARANGAY;
    }
  }

  // Invite user via Supabase Auth
  let authUserId: string;
  try {
    const { id } = await accountRepository.inviteUser(input.email);
    authUserId = id;
  } catch {
    throw AccountErrors.INVITE_FAILED;
  }

  // Create profile
  const profile = await accountRepository.create({
    id: authUserId,
    full_name: input.full_name,
    role: input.role,
    created_by: createdBy,
  });

  // Create barangay assignment for SK officials
  if (input.role === 'SK_OFFICIAL' && input.barangay_id) {
    await accountRepository.createAssignment({
      profile_id: profile.id,
      barangay_id: input.barangay_id,
      assigned_by: createdBy,
    });
  }

  return profile;
};
