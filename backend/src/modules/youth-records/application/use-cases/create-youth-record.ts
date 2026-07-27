import { youthRecordRepository } from '../../infrastructure/repositories/youth-record-repository';
import {
  computeAgeForFilingYear,
  computeAgeGroup,
  isEligibleYouthAge,
} from '../../domain/rules/age-computation';
import { validateAssemblyRules } from '../../domain/rules/assembly-rules';
import { referenceDataRepository } from '../../../reference-data/infrastructure/repositories/reference-data-repository';
import { categoryRepository } from '../../../categories/infrastructure/repositories/category-repository';
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

  const category = await categoryRepository.getCategoryById(profileInput.category_id);
  if (!category) throw API_ERRORS.notFound('Category');

  const birthDate = profileInput.birth_date || null;
  const age = birthDate ? computeAgeForFilingYear(birthDate, category.filing_year) : null;
  if (age !== null && !isEligibleYouthAge(age)) {
    throw API_ERRORS.validation(
      `Birth date must make the person 15 to 30 years old on December 31, ${category.filing_year}.`,
    );
  }
  const ageGroupCode = age === null ? null : computeAgeGroup(age);
  const ageGroup = ageGroupCode
    ? await referenceDataRepository.getOptionByCode('YOUTH_AGE_GROUP', ageGroupCode)
    : null;

  let displayName = profileInput.display_name;
  if (!displayName && profileInput.first_name && profileInput.last_name) {
    displayName = `${profileInput.first_name} ${profileInput.last_name}`;
  }

  const duplicates = birthDate && displayName
    ? await youthRecordRepository.checkDuplicates(barangayId, displayName, birthDate)
    : [];
  const submittedAt = submit_on_create ? new Date().toISOString() : null;

  const recordData = {
    ...profileInput,
    barangay_id: barangayId,
    display_name: displayName,
    birth_date: birthDate,
    age_at_submission: age,
    youth_age_group_id: ageGroup?.id ?? null,
    status: submit_on_create ? 'SUBMITTED' : 'DRAFT',
    created_by: authContext.profileId,
    updated_by: authContext.profileId,
    submitted_by: submit_on_create ? authContext.profileId : null,
    submitted_at: submittedAt,
  };

  const record = await youthRecordRepository.createRecord(recordData);

  return { record, warnings: duplicates.length > 0 ? ['Potential duplicates found'] : [] };
};
