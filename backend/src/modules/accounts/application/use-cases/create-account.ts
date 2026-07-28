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

  // Recover a previous invite whose profile save failed, or reject a complete duplicate.
  const existingAuthUser = await accountRepository.findAuthUserByEmail(input.email);
  if (existingAuthUser) {
    const existingProfile = await accountRepository.findById(existingAuthUser.id);
    if (existingProfile) {
      throw AccountErrors.ALREADY_EXISTS;
    }
  }

  let authUserId = existingAuthUser?.id;
  const authUserCreatedDuringRequest = !authUserId;
  if (!authUserId) {
    try {
      const authUser = await accountRepository.createAuthUser(input.email, input.temporary_password);
      authUserId = authUser.id;
    } catch {
      throw AccountErrors.CREDENTIALS_FAILED;
    }
  }

  let profileCreated = false;
  try {
    const profile = await accountRepository.create({
      id: authUserId,
      full_name: input.full_name,
      role: input.role,
      contact_number: input.contact_number,
      position_title: input.position_title,
      created_by: createdBy,
    });
    profileCreated = true;

    if (input.role === 'SK_OFFICIAL' && input.barangay_id) {
      await accountRepository.createAssignment({
        profile_id: profile.id,
        barangay_id: input.barangay_id,
        assigned_by: createdBy,
      });
    }

    if (existingAuthUser) {
      await accountRepository.setAuthUserPassword(authUserId, input.temporary_password);
    }

    return profile;
  } catch (error) {
    try {
      if (authUserCreatedDuringRequest) {
        await accountRepository.deleteAuthUser(authUserId);
      } else if (profileCreated) {
        await accountRepository.deleteProfile(authUserId);
      }
    } catch (cleanupError) {
      console.error('Failed to roll back incomplete account creation.', cleanupError);
    }
    throw error;
  }
};
