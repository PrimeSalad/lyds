import { categoryRepository } from '../../infrastructure/repositories/category-repository';
import { CategoryErrors } from '../../domain/errors/category-errors';
import type { Category } from '../../domain/entities/category';
import type { CreateCategoryInput } from '../../interface/http/schema';

export const createCategory = async (input: CreateCategoryInput, profileId: string): Promise<Category> => {
  const existing = await categoryRepository.getCategoryByCode(input.code);
  if (existing) {
    throw CategoryErrors.ALREADY_EXISTS;
  }

  return categoryRepository.createCategory({
    ...input,
    status: 'DRAFT',
    created_by: profileId,
  });
};
