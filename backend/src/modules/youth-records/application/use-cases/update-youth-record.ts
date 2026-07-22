import { youthRecordRepository } from '../../infrastructure/repositories/youth-record-repository';
import { YouthRecordErrors } from '../../domain/errors/youth-record-errors';
import { computeAge, computeAgeGroup } from '../../domain/rules/age-computation';
import { validateAssemblyRules } from '../../domain/rules/assembly-rules';
import { auditService } from '../../../audit-logs/infrastructure/audit-service';
import { API_ERRORS } from '../../../../config/api-error';

export const updateYouthRecord = async (id: string, input: any, authContext: any) => {
  const existingRecord = await youthRecordRepository.getRecordById(id);
  if (!existingRecord) throw YouthRecordErrors.NOT_FOUND;

  if (authContext.role === 'SK_OFFICIAL' && existingRecord.barangay_id !== authContext.barangayId) {
    throw YouthRecordErrors.BARANGAY_MISMATCH;
  }

  if (authContext.role === 'SK_OFFICIAL' && !['DRAFT', 'RETURNED'].includes(existingRecord.status)) {
    throw API_ERRORS.forbidden('Can only edit records in DRAFT or RETURNED status.');
  }

  const { version, ...updateData } = input;

  if (updateData.attended_kk_assembly !== undefined || updateData.kk_assembly_count !== undefined) {
    const attended = updateData.attended_kk_assembly !== undefined ? updateData.attended_kk_assembly : existingRecord.attended_kk_assembly;
    const count = updateData.kk_assembly_count !== undefined ? updateData.kk_assembly_count : existingRecord.kk_assembly_count;
    const assemblyError = validateAssemblyRules(attended, count);
    if (assemblyError) {
      throw API_ERRORS.validation(assemblyError);
    }
  }

  if (updateData.birth_date) {
    updateData.age_at_submission = computeAge(updateData.birth_date);
    updateData.youth_age_group_id = computeAgeGroup(updateData.age_at_submission);
  }

  updateData.updated_by = authContext.profileId;

  const record = await youthRecordRepository.updateRecord(id, updateData, version);

  await auditService.log({
    action: 'UPDATE',
    entity_type: 'YOUTH_RECORD',
    entity_id: record.id,
    actor_id: authContext.profileId,
    old_data: existingRecord,
    new_data: record,
  });

  return record;
};
