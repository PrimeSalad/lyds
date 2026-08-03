export const YOUTH_RECORD_LIST_SELECT = (
  '*, barangay:barangays!barangay_id!inner(name, municipality, province), '
  + 'category:categories!category_id(name), '
  + 'sex:reference_options!sex_assigned_at_birth_id(label), '
  + 'civil:reference_options!civil_status_id(label), '
  + 'classification:reference_options!youth_classification_id(label), '
  + 'age_group:reference_options!youth_age_group_id(label), '
  + 'education:reference_options!educational_attainment_id(label), '
  + 'work:reference_options!work_status_id(label)'
);

export type YouthRecordSort = {
  field: string;
  direction: 'asc' | 'desc';
};

export type YouthRecordOrderClause = {
  column: string;
  ascending: boolean;
};

export const normalizeYouthRecordSearch = (search: string) => {
  const compact = search.replace(/\s+/g, ' ').trim();
  if (!compact.includes(',')) return compact;

  const [surname, ...givenNameParts] = compact.split(',');
  const givenNames = givenNameParts.join(' ').replace(/\s+/g, ' ').trim();
  return [givenNames, surname.trim()].filter(Boolean).join(' ');
};

export const getYouthRecordOrderClauses = (sort?: YouthRecordSort): YouthRecordOrderClause[] => {
  if (!sort) return [{ column: 'created_at', ascending: false }];

  if (sort.field === 'barangay_name') {
    return [
      { column: 'barangay(name)', ascending: sort.direction === 'asc' },
      { column: 'display_name', ascending: true },
      { column: 'id', ascending: true },
    ];
  }

  return [
    { column: sort.field, ascending: sort.direction === 'asc' },
    { column: 'id', ascending: true },
  ];
};
