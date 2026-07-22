export const CategoryErrors = {
  NOT_FOUND: { status: 404, code: 'CATEGORY_NOT_FOUND', message: 'Category not found.' },
  ALREADY_EXISTS: { status: 409, code: 'CATEGORY_ALREADY_EXISTS', message: 'Category code already exists.' },
  FIELD_NOT_FOUND: { status: 404, code: 'CATEGORY_FIELD_NOT_FOUND', message: 'Category field not found.' },
  FIELD_KEY_EXISTS: { status: 409, code: 'CATEGORY_FIELD_KEY_EXISTS', message: 'Field key already exists in this category.' },
  TYPE_CHANGE_DENIED: { status: 400, code: 'FIELD_TYPE_CHANGE_DENIED', message: 'Cannot change field type for a field that is currently in use.' },
} as const;
