import { categoryRepository } from '../../infrastructure/repositories/category-repository';
import type { Category } from '../../domain/entities/category';

export const listCategories = async (role: string): Promise<Category[]> => {
  if (role === 'ADMIN') {
    return categoryRepository.listCategories();
  } else {
    // SK_OFFICIAL sees only PUBLISHED, and probably PUBLIC or RESTRICTED based on requirements
    // For now, SK_OFFICIAL sees all PUBLISHED
    return categoryRepository.listCategories({ status: 'PUBLISHED' });
  }
};
