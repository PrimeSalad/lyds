import { categoryRepository } from '../../infrastructure/repositories/category-repository';
import { CategoryErrors } from '../../domain/errors/category-errors';
import type { CategoryField } from '../../domain/entities/category';
import type { CreateCategoryFieldInput } from '../../interface/http/schema';

export const createCategoryField = async (categoryId: string, input: CreateCategoryFieldInput): Promise<CategoryField> => {
  const category = await categoryRepository.getCategoryById(categoryId);
  if (!category) {
    throw CategoryErrors.NOT_FOUND;
  }

  const existingField = await categoryRepository.getCategoryFieldByKey(categoryId, input.field_key);
  if (existingField) {
    throw CategoryErrors.FIELD_KEY_EXISTS;
  }

  return categoryRepository.createCategoryField({
    ...input,
    category_id: categoryId,
    version: 1,
    is_active: true,
  });
};
