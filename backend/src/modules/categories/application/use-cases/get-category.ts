import { categoryRepository } from '../../infrastructure/repositories/category-repository';
import { CategoryErrors } from '../../domain/errors/category-errors';
import type { CategoryWithFields } from '../../domain/entities/category';

export const getCategory = async (id: string): Promise<CategoryWithFields> => {
  const category = await categoryRepository.getCategoryById(id);
  if (!category) {
    throw CategoryErrors.NOT_FOUND;
  }
  return category;
};
