export const CHILD_LABORER_SELECT = '*, barangay:barangays!barangay_id!inner(name)';

export type ChildLaborerSort = {
  field: 'child_name' | 'barangay_name' | 'birth_date' | 'gender' | 'record_status' | 'created_at';
  direction: 'asc' | 'desc';
};

type OrderClause = {
  column: string;
  ascending: boolean;
};

export const childLaborerOrderClauses = (sort?: ChildLaborerSort): OrderClause[] => {
  if (!sort) {
    return [
      { column: 'filing_year', ascending: false },
      { column: 'barangay(name)', ascending: true },
      { column: 'last_name', ascending: true },
      { column: 'first_name', ascending: true },
      { column: 'id', ascending: true },
    ];
  }

  if (sort.field === 'child_name') {
    return [
      { column: 'last_name', ascending: sort.direction === 'asc' },
      { column: 'first_name', ascending: sort.direction === 'asc' },
      { column: 'id', ascending: true },
    ];
  }

  if (sort.field === 'barangay_name') {
    return [
      { column: 'barangay(name)', ascending: sort.direction === 'asc' },
      { column: 'last_name', ascending: true },
      { column: 'first_name', ascending: true },
      { column: 'id', ascending: true },
    ];
  }

  return [
    { column: sort.field, ascending: sort.direction === 'asc' },
    { column: 'last_name', ascending: true },
    { column: 'first_name', ascending: true },
    { column: 'id', ascending: true },
  ];
};
