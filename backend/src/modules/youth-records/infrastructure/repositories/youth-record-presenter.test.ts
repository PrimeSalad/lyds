import { describe, expect, it } from 'vitest';
import { toYouthRecordPresentation } from './youth-record-presenter';

describe('toYouthRecordPresentation', () => {
  it('flattens profile context and reference labels for the client', () => {
    const result = toYouthRecordPresentation({
      id: 'record-1',
      barangay: { name: 'Ihatub', municipality: 'Boac', province: 'Marinduque' },
      category: [{ name: 'KK Youth Profile 2026', filing_year: 2026 }],
      sex: { label: 'Female' },
      civil: [{ label: 'Single' }],
      classification: { label: 'In-school Youth' },
      age_group: { label: 'Core Youth' },
      education: { label: 'College Level' },
      work: { label: 'Employed' },
    }, 7);

    expect(result).toMatchObject({
      row_number: 7,
      barangay_name: 'Ihatub',
      municipality_name: 'Boac',
      province_name: 'Marinduque',
      category_name: 'KK Youth Profile 2026',
      category_filing_year: 2026,
      sex_label: 'Female',
      civil_status_label: 'Single',
      youth_classification_label: 'In-school Youth',
      youth_age_group_label: 'Core Youth',
      educational_attainment_label: 'College Level',
      work_status_label: 'Employed',
    });
  });

  it('uses null for missing relations', () => {
    const result = toYouthRecordPresentation({ id: 'record-2' });

    expect(result.category_name).toBeNull();
    expect(result.barangay_name).toBeNull();
    expect(result.sex_label).toBeNull();
  });
});
