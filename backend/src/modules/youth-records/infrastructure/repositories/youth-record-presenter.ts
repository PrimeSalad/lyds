const relationField = (relation: any, field: string) => Array.isArray(relation)
  ? relation[0]?.[field] ?? null
  : relation?.[field] ?? null;

export const toYouthRecordPresentation = (record: any, rowNumber?: number) => ({
  ...record,
  ...(rowNumber === undefined ? {} : { row_number: rowNumber }),
  barangay_name: relationField(record.barangay, 'name'),
  municipality_name: relationField(record.barangay, 'municipality'),
  province_name: relationField(record.barangay, 'province'),
  category_name: relationField(record.category, 'name'),
  category_filing_year: relationField(record.category, 'filing_year'),
  category_record_type: relationField(record.category, 'record_type'),
  sex_label: relationField(record.sex, 'label'),
  civil_status_label: relationField(record.civil, 'label'),
  youth_classification_label: relationField(record.classification, 'label'),
  youth_age_group_label: relationField(record.age_group, 'label'),
  educational_attainment_label: relationField(record.education, 'label'),
  work_status_label: relationField(record.work, 'label'),
});
