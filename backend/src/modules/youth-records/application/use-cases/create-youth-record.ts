import { youthRecordRepository } from '../../infrastructure/repositories/youth-record-repository';
import { computeAge, computeAgeGroup } from '../../domain/rules/age-computation';
import { validateAssemblyRules } from '../../domain/rules/assembly-rules';
import { auditService } from '../../../audit-logs/infrastructure/audit-service';
import { referenceDataRepository } from '../../../reference-data/infrastructure/repositories/reference-data-repository';
import { API_ERRORS } from '../../../../config/api-error';

export const createYouthRecord = async (input: any, authContext: any) => {
  const { submit_on_create, ...profileInput } = input;

  // Validate assembly rules
  const assemblyError = validateAssemblyRules(profileInput.attended_kk_assembly, profileInput.kk_assembly_count);
  if (assemblyError) {
    throw API_ERRORS.validation(assemblyError);
  }

  // Force barangay_id for SK_OFFICIAL
  const barangayId = authContext.role === 'SK_OFFICIAL' ? authContext.barangayId : profileInput.barangay_id;
  if (!barangayId) {
    throw API_ERRORS.validation('Barangay ID is required.');
  }

  const age = computeAge(profileInput.birth_date);
  const ageGroupCode = computeAgeGroup(age);
  const ageGroup = ageGroupCode
    ? await referenceDataRepository.getOptionByCode('YOUTH_AGE_GROUP', ageGroupCode)
    : null;

  let displayName = profileInput.display_name;
  if (!displayName && profileInput.first_name && profileInput.last_name) {
    displayName = `${profileInput.first_name} ${profileInput.last_name}`;
  }

  const duplicates = await youthRecordRepository.checkDuplicates(barangayId, displayName, profileInput.birth_date);
  const submittedAt = submit_on_create ? new Date().toISOString() : null;

  const recordData = {
    ...profileInput,
    barangay_id: barangayId,
    display_name: displayName,
    age_at_submission: age,
    youth_age_group_id: ageGroup?.id ?? null,
    status: submit_on_create ? 'SUBMITTED' : 'DRAFT',
    created_by: authContext.profileId,
    updated_by: authContext.profileId,
    submitted_by: submit_on_create ? authContext.profileId : null,
    submitted_at: submittedAt,
  };

  const record = await youthRecordRepository.createRecord(recordData);

  await auditService.log({
    action: 'CREATE',
    entity_type: 'YOUTH_RECORD',
    entity_id: record.id,
    actor_profile_id: authContext.profileId,
    actor_role: authContext.role,
    barangay_id: barangayId,
    after_data: { ...record },
  });

  return { record, warnings: duplicates.length > 0 ? ['Potential duplicates found'] : [] };
};
