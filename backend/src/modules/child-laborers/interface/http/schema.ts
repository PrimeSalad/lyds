import { z } from 'zod';
import { childLaborerGenders, childLaborerStatuses } from '../../domain/child-laborer';

const optionalText = (max: number) => z.string().trim().max(max).optional().default('');

const childLaborerFields = z.object({
  category_id: z.string().uuid(),
  filing_year: z.number().int().min(2000).max(2100),
  barangay_id: z.string().uuid().optional(),
  first_name: z.string().trim().min(1).max(100),
  middle_name: optionalText(100),
  last_name: z.string().trim().min(1).max(100),
  birth_date: z.string().date(),
  gender: z.enum(childLaborerGenders),
  attending_school: z.boolean(),
  highest_grade_completed: optionalText(150),
  nature_of_work: z.string().trim().min(1).max(300),
  father_name: optionalText(200),
  mother_name: optionalText(200),
  guardian_name: optionalText(200),
  parent_guardian_occupation: optionalText(300),
  record_status: z.enum(childLaborerStatuses).default('IDENTIFIED'),
  remarks: optionalText(1000),
  custom_values: z.record(z.string(), z.unknown()).optional().default({}),
});

const validateAnnualRecord = (
  value: z.infer<typeof childLaborerFields>,
  context: z.RefinementCtx,
) => {
  if (!value.father_name && !value.mother_name && !value.guardian_name) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['guardian_name'],
      message: 'Enter at least one parent or guardian name.',
    });
  }

  if (value.birth_date > `${value.filing_year}-12-31`) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['birth_date'],
      message: 'Birth date must be on or before the end of the filing year.',
    });
  }

  if (value.record_status === 'VALIDATED' && !value.remarks) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['remarks'],
      message: 'Remarks are required before a record can be marked as validated.',
    });
  }
};

export const createChildLaborerSchema = childLaborerFields.superRefine(validateAnnualRecord);

export const updateChildLaborerSchema = childLaborerFields.extend({
  version: z.number().int().positive(),
}).superRefine(validateAnnualRecord);

export const listChildLaborersQuerySchema = z.object({
  categoryId: z.string().uuid().optional(),
  filingYear: z.coerce.number().int().min(2000).max(2100).optional(),
  barangayId: z.string().uuid().optional(),
  status: z.enum(childLaborerStatuses).optional(),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(25),
  sortField: z.enum([
    'child_name',
    'barangay_name',
    'birth_date',
    'gender',
    'record_status',
    'created_at',
  ]).optional(),
  sortDir: z.enum(['asc', 'desc']).optional().default('asc'),
});

export const childLaborerSummaryQuerySchema = z.object({
  categoryId: z.string().uuid().optional(),
  filingYear: z.coerce.number().int().min(2000).max(2100).optional(),
  barangayId: z.string().uuid().optional(),
  status: z.enum(childLaborerStatuses).optional(),
  search: z.string().trim().max(100).optional(),
});

export const childLaborerExportQuerySchema = z.object({
  categoryId: z.string().uuid().optional(),
  format: z.enum(['csv', 'xlsx']).optional().default('xlsx'),
  filingYear: z.coerce.number().int().min(2000).max(2100),
  barangayId: z.string().uuid().optional(),
  status: z.enum(childLaborerStatuses).optional(),
  search: z.string().trim().max(100).optional(),
});
