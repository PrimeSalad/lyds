import { createApiError } from '../../../config/api-error';
import type { AuthenticatedRequest } from '../../../middleware/auth';
import { auditService } from '../../audit-logs/infrastructure/audit-service';
import type { ChildLaborerWriteInput } from '../domain/child-laborer';
import { childLaborerRepository, type ChildLaborerFilters } from '../infrastructure/child-laborer-repository';
import { childLaborerExportService } from '../infrastructure/child-laborer-export-service';
import type {
  createChildLaborerSchema,
  updateChildLaborerSchema,
  listChildLaborersQuerySchema,
} from '../interface/http/schema';
import type { z } from 'zod';

type AuthContext = NonNullable<AuthenticatedRequest['authContext']>;
type CreateInput = z.infer<typeof createChildLaborerSchema>;
type UpdateInput = z.infer<typeof updateChildLaborerSchema>;
type ListInput = z.infer<typeof listChildLaborersQuerySchema>;

const notFound = () => createApiError(404, 'CHILD_LABORER_NOT_FOUND', 'Child laborer record not found.');
const accessDenied = () => createApiError(403, 'BARANGAY_ACCESS_DENIED', 'Access to this barangay is denied.');

const scopedBarangayId = (requestedBarangayId: string | undefined, context: AuthContext) => {
  if (context.role === 'ADMIN') return requestedBarangayId;
  if (!context.barangayId) throw createApiError(403, 'NO_BARANGAY_ASSIGNMENT', 'No active barangay assignment.');
  if (requestedBarangayId && requestedBarangayId !== context.barangayId) throw accessDenied();
  return context.barangayId;
};

const ensureRecordAccess = (record: { barangay_id: string }, context: AuthContext) => {
  if (context.role !== 'ADMIN' && record.barangay_id !== context.barangayId) throw accessDenied();
};

const blankToNull = (value: string | undefined) => value?.trim() || null;

const writeInput = (input: CreateInput | UpdateInput, barangayId: string): ChildLaborerWriteInput => ({
  filing_year: input.filing_year,
  barangay_id: barangayId,
  first_name: input.first_name.trim(),
  middle_name: blankToNull(input.middle_name),
  last_name: input.last_name.trim(),
  birth_date: input.birth_date,
  gender: input.gender,
  attending_school: input.attending_school,
  highest_grade_completed: blankToNull(input.highest_grade_completed),
  nature_of_work: input.nature_of_work.trim(),
  father_name: blankToNull(input.father_name),
  mother_name: blankToNull(input.mother_name),
  guardian_name: blankToNull(input.guardian_name),
  parent_guardian_occupation: blankToNull(input.parent_guardian_occupation),
  record_status: input.record_status,
  remarks: blankToNull(input.remarks),
});

const checkDuplicate = async (input: ChildLaborerWriteInput, excludeId?: string) => {
  const duplicate = await childLaborerRepository.findDuplicate({
    filingYear: input.filing_year,
    barangayId: input.barangay_id,
    firstName: input.first_name,
    lastName: input.last_name,
    birthDate: input.birth_date,
    excludeId,
  });
  if (duplicate) {
    throw createApiError(
      409,
      'DUPLICATE_CHILD_LABORER',
      'A record with the same name and birth date already exists for this barangay and filing year.',
    );
  }
};

const filtersFromList = (input: ListInput, context: AuthContext): ChildLaborerFilters => ({
  filingYear: input.filingYear,
  barangayId: scopedBarangayId(input.barangayId, context),
  status: input.status,
  search: input.search,
  sort: input.sortField ? { field: input.sortField, direction: input.sortDir } : undefined,
});

export const childLaborerService = {
  async list(input: ListInput, context: AuthContext) {
    return await childLaborerRepository.list({
      ...filtersFromList(input, context),
      page: input.page,
      pageSize: input.pageSize,
    });
  },

  async get(id: string, context: AuthContext) {
    const record = await childLaborerRepository.getById(id);
    if (!record) throw notFound();
    ensureRecordAccess(record, context);
    return record;
  },

  async create(input: CreateInput, context: AuthContext) {
    const barangayId = scopedBarangayId(input.barangay_id, context);
    if (!barangayId) {
      throw createApiError(422, 'BARANGAY_REQUIRED', 'Select a barangay for this record.');
    }
    const recordInput = writeInput(input, barangayId);
    await checkDuplicate(recordInput);
    return await childLaborerRepository.create({
      ...recordInput,
      created_by: context.profileId,
      updated_by: context.profileId,
    });
  },

  async update(id: string, input: UpdateInput, context: AuthContext) {
    const existing = await childLaborerRepository.getById(id);
    if (!existing) throw notFound();
    ensureRecordAccess(existing, context);
    if (existing.record_status === 'ARCHIVED') {
      throw createApiError(409, 'ARCHIVED_RECORD', 'Restore this record before editing it.');
    }

    const barangayId = scopedBarangayId(input.barangay_id ?? existing.barangay_id, context);
    if (!barangayId) throw createApiError(422, 'BARANGAY_REQUIRED', 'Select a barangay for this record.');
    const recordInput = writeInput(input, barangayId);
    await checkDuplicate(recordInput, id);
    const updated = await childLaborerRepository.update(
      id,
      { ...recordInput, updated_by: context.profileId },
      input.version,
    );
    if (!updated) {
      throw createApiError(409, 'VERSION_CONFLICT', 'This record changed in another session. Reload and try again.');
    }
    return updated;
  },

  async archive(id: string, context: AuthContext) {
    const existing = await childLaborerRepository.getById(id);
    if (!existing) throw notFound();
    ensureRecordAccess(existing, context);
    if (existing.record_status === 'ARCHIVED') return existing;
    const updated = await childLaborerRepository.update(
      id,
      { record_status: 'ARCHIVED', updated_by: context.profileId },
      existing.version,
    );
    if (!updated) throw createApiError(409, 'VERSION_CONFLICT', 'This record changed in another session. Reload and try again.');
    return updated;
  },

  async restore(id: string, context: AuthContext) {
    const existing = await childLaborerRepository.getById(id);
    if (!existing) throw notFound();
    ensureRecordAccess(existing, context);
    if (existing.record_status !== 'ARCHIVED') return existing;
    const updated = await childLaborerRepository.update(
      id,
      { record_status: 'IDENTIFIED', updated_by: context.profileId },
      existing.version,
    );
    if (!updated) throw createApiError(409, 'VERSION_CONFLICT', 'This record changed in another session. Reload and try again.');
    return updated;
  },

  async summary(
    input: {
      filingYear?: number;
      barangayId?: string;
      status?: ChildLaborerFilters['status'];
      search?: string;
    },
    context: AuthContext,
  ) {
    return await childLaborerRepository.summary({
      filingYear: input.filingYear,
      barangayId: scopedBarangayId(input.barangayId, context),
      status: input.status,
      search: input.search,
    });
  },

  async export(
    input: {
      format: 'csv' | 'xlsx';
      filingYear: number;
      barangayId?: string;
      status?: ChildLaborerFilters['status'];
      search?: string;
    },
    context: AuthContext,
  ) {
    const barangayId = scopedBarangayId(input.barangayId, context);
    const records = await childLaborerRepository.listForExport({
      filingYear: input.filingYear,
      barangayId,
      status: input.status,
      search: input.search,
      sort: { field: 'barangay_name', direction: 'asc' },
    });
    const buffer = input.format === 'csv'
      ? childLaborerExportService.csv(records)
      : await childLaborerExportService.xlsx(records, input.filingYear);

    await auditService.log({
      actor_profile_id: context.profileId,
      actor_role: context.role,
      action: 'EXPORT_CHILD_LABORER_RECORDS',
      entity_type: 'REPORT',
      barangay_id: barangayId ?? undefined,
      metadata: {
        filing_year: input.filingYear,
        record_status: input.status,
        search: input.search,
        format: input.format,
        record_count: records.length,
      },
    });

    return buffer;
  },
};
