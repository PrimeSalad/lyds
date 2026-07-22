import { youthRecordRepository } from '../../infrastructure/repositories/youth-record-repository';
import { computeAge, computeAgeGroup } from '../../domain/rules/age-computation';
import { validateAssemblyRules } from '../../domain/rules/assembly-rules';
import { auditService } from '../../../audit-logs/infrastructure/audit-service';
import { referenceDataRepository } from '../../../reference-data/infrastructure/repositories/reference-data-repository';
import { API_ERRORS } from '../../../../config/api-error';

export const createYouthRecord = async (input: any, authContext: any) => {
  // Validate assembly rules
  const assemblyError = validateAssemblyRules(input.attended_kk_assembly, input.kk_assembly_count);
  if (assemblyError) {
    throw API_ERRORS.validation(assemblyError);
  }

  // Force barangay_id for SK_OFFICIAL
  const barangayId = authContext.role === 'SK_OFFICIAL' ? authContext.barangayId : input.barangay_id;
  if (!barangayId) {
    throw API_ERRORS.validation('Barangay ID is required.');
  }

  const age = computeAge(input.birth_date);
  const ageGroupCode = computeAgeGroup(age);
  const ageGroup = ageGroupCode
    ? await referenceDataRepository.getOptionByCode('YOUTH_AGE_GROUP', ageGroupCode)
    : null;

  let displayName = input.display_name;
  if (!displayName && input.first_name && input.last_name) {
    displayName = `${input.first_name} ${input.last_name}`;
  }

  const duplicates = await youthRecordRepository.checkDuplicates(barangayId, displayName, input.birth_date);

  const recordData = {
    ...input,
    barangay_id: barangayId,
    display_name: displayName,
    age_at_submission: age,
    youth_age_group_id: ageGroup?.id ?? null,
    status: 'DRAFT',
    created_by: authContext.profileId,
    updated_by: authContext.profileId,
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
