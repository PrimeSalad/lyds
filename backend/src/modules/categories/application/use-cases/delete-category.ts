import { categoryRepository } from '../../infrastructure/repositories/category-repository';
import { CategoryErrors } from '../../domain/errors/category-errors';
import type { Category } from '../../domain/entities/category';

export const deleteCategory = async (id: string, profileId: string): Promise<Category> => {
  const existing = await categoryRepository.getCategoryById(id);
  if (!existing) {
    throw CategoryErrors.NOT_FOUND;
  }

  if (existing.status !== 'ARCHIVED') {
    throw CategoryErrors.DELETE_REQUIRES_ARCHIVED;
  }

  return categoryRepository.deleteCategory(id, profileId);
};
