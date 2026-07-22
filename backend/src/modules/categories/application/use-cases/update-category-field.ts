import { categoryRepository } from '../../infrastructure/repositories/category-repository';
import { CategoryErrors } from '../../domain/errors/category-errors';
import type { CategoryField } from '../../domain/entities/category';
import type { UpdateCategoryFieldInput } from '../../interface/http/schema';

export const updateCategoryField = async (categoryId: string, fieldId: string, input: UpdateCategoryFieldInput): Promise<CategoryField> => {
  const category = await categoryRepository.getCategoryById(categoryId);
  if (!category) {
    throw CategoryErrors.NOT_FOUND;
  }

  const field = await categoryRepository.getCategoryFieldById(fieldId);
  if (!field || field.category_id !== categoryId) {
    throw CategoryErrors.FIELD_NOT_FOUND;
  }

  if (input.field_type && input.field_type !== field.field_type) {
    // In a real app we'd check if any records exist with this field.
    // For now, based on requirements, we just deny it or assume it's used.
    // We'll throw an error if trying to change the type.
    throw CategoryErrors.TYPE_CHANGE_DENIED;
  }

  return categoryRepository.updateCategoryField(fieldId, {
    ...input,
    version: field.version + 1,
  });
};
