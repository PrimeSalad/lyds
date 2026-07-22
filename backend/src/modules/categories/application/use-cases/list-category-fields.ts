import { categoryRepository } from '../../infrastructure/repositories/category-repository';
import { CategoryErrors } from '../../domain/errors/category-errors';
import type { CategoryField } from '../../domain/entities/category';

export const listCategoryFields = async (categoryId: string): Promise<CategoryField[]> => {
  const existing = await categoryRepository.getCategoryById(categoryId);
  if (!existing) {
    throw CategoryErrors.NOT_FOUND;
  }

  return categoryRepository.listCategoryFields(categoryId);
};
