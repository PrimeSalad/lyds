import { categoryRepository } from '../../infrastructure/repositories/category-repository';
import { CategoryErrors } from '../../domain/errors/category-errors';
import type { Category } from '../../domain/entities/category';
import type { UpdateCategoryInput } from '../../interface/http/schema';

export const updateCategory = async (id: string, input: UpdateCategoryInput, profileId: string): Promise<Category> => {
  const existing = await categoryRepository.getCategoryById(id);
  if (!existing) {
    throw CategoryErrors.NOT_FOUND;
  }

  return categoryRepository.updateCategory(id, {
    ...input,
    updated_by: profileId,
  });
};
