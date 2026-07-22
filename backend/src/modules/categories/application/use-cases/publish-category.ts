import { categoryRepository } from '../../infrastructure/repositories/category-repository';
import { CategoryErrors } from '../../domain/errors/category-errors';
import type { Category } from '../../domain/entities/category';

export const publishCategory = async (id: string, profileId: string): Promise<Category> => {
  const existing = await categoryRepository.getCategoryById(id);
  if (!existing) {
    throw CategoryErrors.NOT_FOUND;
  }

  return categoryRepository.updateCategory(id, {
    status: 'PUBLISHED',
    updated_by: profileId,
  });
};
