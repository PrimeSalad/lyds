import { describe, expect, it } from 'vitest';
import { getYouthRecordActions } from './youth-record-actions';

describe('getYouthRecordActions', () => {
  it('lets an administrator edit and archive an approved profile', () => {
    expect(getYouthRecordActions('APPROVED', true)).toEqual({
      canEdit: true,
      canSubmit: false,
      canReview: false,
      canArchive: true,
      canRestore: false,
    });
  });

  it('shows administrator review actions for a submitted profile', () => {
    expect(getYouthRecordActions('SUBMITTED', true)).toEqual({
      canEdit: true,
      canSubmit: false,
      canReview: true,
      canArchive: true,
      canRestore: false,
    });
  });

  it('lets an SK user edit and submit a returned profile without archive access', () => {
    expect(getYouthRecordActions('RETURNED', false)).toEqual({
      canEdit: true,
      canSubmit: true,
      canReview: false,
      canArchive: false,
      canRestore: false,
    });
  });

  it('offers only restore for an archived profile', () => {
    expect(getYouthRecordActions('ARCHIVED', true)).toEqual({
      canEdit: false,
      canSubmit: false,
      canReview: false,
      canArchive: false,
      canRestore: true,
    });
  });
});
