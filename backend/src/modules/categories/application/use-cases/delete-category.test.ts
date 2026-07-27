import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deleteCategory } from './delete-category';
import { CategoryErrors } from '../../domain/errors/category-errors';

const repository = vi.hoisted(() => ({
  getCategoryById: vi.fn(),
  deleteCategory: vi.fn(),
}));

vi.mock('../../infrastructure/repositories/category-repository', () => ({
  categoryRepository: repository,
}));

describe('deleteCategory', () => {
  beforeEach(() => {
    repository.getCategoryById.mockReset();
    repository.deleteCategory.mockReset();
  });

  it('rejects deletion when the category is not archived', async () => {
    repository.getCategoryById.mockResolvedValue({ id: 'cat-1', status: 'PUBLISHED' });

    await expect(deleteCategory('cat-1', 'profile-1')).rejects.toEqual(CategoryErrors.DELETE_REQUIRES_ARCHIVED);
    expect(repository.deleteCategory).not.toHaveBeenCalled();
  });

  it('soft-deletes archived categories', async () => {
    repository.getCategoryById.mockResolvedValue({ id: 'cat-1', status: 'ARCHIVED' });
    repository.deleteCategory.mockResolvedValue({ id: 'cat-1', status: 'ARCHIVED', deleted_at: '2026-07-27T00:00:00.000Z' });

    await expect(deleteCategory('cat-1', 'profile-1')).resolves.toEqual({
      id: 'cat-1',
      status: 'ARCHIVED',
      deleted_at: '2026-07-27T00:00:00.000Z',
    });
    expect(repository.deleteCategory).toHaveBeenCalledWith('cat-1', 'profile-1');
  });
});
