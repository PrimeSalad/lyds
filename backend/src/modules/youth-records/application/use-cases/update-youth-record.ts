import { youthRecordRepository } from '../../infrastructure/repositories/youth-record-repository';
import { YouthRecordErrors } from '../../domain/errors/youth-record-errors';
import { computeAge, computeAgeGroup } from '../../domain/rules/age-computation';
import { validateAssemblyRules } from '../../domain/rules/assembly-rules';
import { referenceDataRepository } from '../../../reference-data/infrastructure/repositories/reference-data-repository';
import { API_ERRORS } from '../../../../config/api-error';
import { canTransition } from '../../domain/rules/status-transitions';

export const updateYouthRecord = async (id: string, input: any, authContext: any) => {
  const existingRecord = await youthRecordRepository.getRecordById(id);
  if (!existingRecord) throw YouthRecordErrors.NOT_FOUND;

  if (authContext.role === 'SK_OFFICIAL' && existingRecord.barangay_id !== authContext.barangayId) {
    throw YouthRecordErrors.BARANGAY_MISMATCH;
  }

  if (authContext.role === 'SK_OFFICIAL' && !['DRAFT', 'RETURNED'].includes(existingRecord.status)) {
    throw API_ERRORS.forbidden('Can only edit records in DRAFT or RETURNED status.');
  }

  const { version, submit_on_create, submit_on_update, ...updateData } = input;
  void submit_on_create;

  if (updateData.attended_kk_assembly !== undefined || updateData.kk_assembly_count !== undefined) {
    const attended = updateData.attended_kk_assembly !== undefined ? updateData.attended_kk_assembly : existingRecord.attended_kk_assembly;
    const count = updateData.kk_assembly_count !== undefined ? updateData.kk_assembly_count : existingRecord.kk_assembly_count;
    const assemblyError = validateAssemblyRules(attended, count);
    if (assemblyError) {
      throw API_ERRORS.validation(assemblyError);
    }
  }

  if ('birth_date' in updateData) {
    if (updateData.birth_date) {
      updateData.age_at_submission = computeAge(updateData.birth_date);
      const ageGroupCode = computeAgeGroup(updateData.age_at_submission);
      const ageGroup = ageGroupCode
        ? await referenceDataRepository.getOptionByCode('YOUTH_AGE_GROUP', ageGroupCode)
        : null;
      updateData.youth_age_group_id = ageGroup?.id ?? null;
    } else {
      updateData.birth_date = null;
      updateData.age_at_submission = null;
      updateData.youth_age_group_id = null;
    }
  }

  updateData.updated_by = authContext.profileId;

  if (submit_on_update) {
    if (!canTransition(existingRecord.status, 'SUBMITTED', authContext.role)) {
      throw YouthRecordErrors.INVALID_STATUS_TRANSITION(existingRecord.status, 'SUBMITTED');
    }

    updateData.status = 'SUBMITTED';
    updateData.submitted_by = authContext.profileId;
    updateData.submitted_at = new Date().toISOString();
  }

  const record = await youthRecordRepository.updateRecord(id, updateData, version);

  return record;
};
