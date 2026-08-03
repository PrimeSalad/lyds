import type { CategoryRecordType } from '../../domain/entities/category';

export const getCategoryRecordCountSource = (recordType: CategoryRecordType) => (
  recordType === 'CHILD_LABORER'
    ? { table: 'child_laborer_records', supportsSoftDelete: false }
    : { table: 'youth_profiles', supportsSoftDelete: true }
);
