import { describe, expect, it } from 'vitest';
import {
  createReferenceOptionSchema,
  listReferenceGroupsQuerySchema,
} from './schema';

describe('reference data request schemas', () => {
  it('accepts either registry when listing reference groups', () => {
    expect(listReferenceGroupsQuerySchema.parse({ recordType: 'YOUTH_PROFILE' })).toEqual({
      recordType: 'YOUTH_PROFILE',
    });
    expect(listReferenceGroupsQuerySchema.parse({ recordType: 'CHILD_LABORER' })).toEqual({
      recordType: 'CHILD_LABORER',
    });
    expect(() => listReferenceGroupsQuerySchema.parse({ recordType: 'OTHER' })).toThrow();
  });

  it('normalizes new option codes and preserves the requested active state', () => {
    expect(createReferenceOptionSchema.parse({
      code: '  farm work / seasonal ',
      label: ' Seasonal Farm Work ',
      sort_order: 12,
      is_active: false,
    })).toEqual({
      code: 'FARM_WORK_SEASONAL',
      label: 'Seasonal Farm Work',
      sort_order: 12,
      is_active: false,
    });
  });
});
