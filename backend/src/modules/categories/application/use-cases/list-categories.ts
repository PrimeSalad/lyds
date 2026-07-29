import { categoryRepository } from '../../infrastructure/repositories/category-repository';
import type { Category, CategoryRecordType } from '../../domain/entities/category';

export const listCategories = async (
  role: string,
  barangayId: string | null,
  recordType?: CategoryRecordType,
): Promise<Category[]> => {
  if (role === 'ADMIN') {
    return categoryRepository.listCategories({ record_type: recordType });
  } else {
    // SK_OFFICIAL sees only PUBLISHED, and probably PUBLIC or RESTRICTED based on requirements
    // For now, SK_OFFICIAL sees all PUBLISHED
    return categoryRepository.listCategories({
      status: 'PUBLISHED',
      record_type: recordType,
      recordBarangayId: barangayId,
    });
  }
};
