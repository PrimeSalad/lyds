import { describe, expect, it } from 'vitest';
import { getCategoryRecordCountSource } from './category-record-count-source';

describe('category record count source', () => {
  it('does not apply youth soft-delete filtering to child laborer records', () => {
    expect(getCategoryRecordCountSource('CHILD_LABORER')).toEqual({
      table: 'child_laborer_records',
      supportsSoftDelete: false,
    });
  });

  it.each(['YOUTH_PROFILE', 'OUT_OF_SCHOOL_YOUTH'] as const)(
    'counts %s records from the soft-deletable youth table',
    (recordType) => {
      expect(getCategoryRecordCountSource(recordType)).toEqual({
        table: 'youth_profiles',
        supportsSoftDelete: true,
      });
    },
  );
});
