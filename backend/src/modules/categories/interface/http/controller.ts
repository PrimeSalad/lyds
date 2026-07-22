import type { Request, Response } from 'express';
import type { AuthenticatedRequest } from '../../../../middleware/auth';
import { listCategories } from '../../application/use-cases/list-categories';
import { getCategory } from '../../application/use-cases/get-category';
import { createCategory } from '../../application/use-cases/create-category';
import { updateCategory } from '../../application/use-cases/update-category';
import { publishCategory } from '../../application/use-cases/publish-category';
import { archiveCategory } from '../../application/use-cases/archive-category';
import { listCategoryFields } from '../../application/use-cases/list-category-fields';
import { createCategoryField } from '../../application/use-cases/create-category-field';
import { updateCategoryField } from '../../application/use-cases/update-category-field';
import {
  createCategorySchema,
  updateCategorySchema,
  createCategoryFieldSchema,
  updateCategoryFieldSchema,
} from './schema';

export const categoryController = {
  async list(req: Request, res: Response) {
    const ctx = (req as AuthenticatedRequest).authContext!;
    const categories = await listCategories(ctx.role);
    res.json({ data: categories });
  },

  async getById(req: Request, res: Response) {
    const id = String(req.params.categoryId);
    const category = await getCategory(id);
    res.json({ data: category });
  },

  async create(req: Request, res: Response) {
    const input = createCategorySchema.parse(req.body);
    const ctx = (req as AuthenticatedRequest).authContext!;
    const category = await createCategory(input, ctx.profileId);
    res.status(201).json({ data: category });
  },

  async update(req: Request, res: Response) {
    const input = updateCategorySchema.parse(req.body);
    const id = String(req.params.categoryId);
    const ctx = (req as AuthenticatedRequest).authContext!;
    const category = await updateCategory(id, input, ctx.profileId);
    res.json({ data: category });
  },

  async publish(req: Request, res: Response) {
    const id = String(req.params.categoryId);
    const ctx = (req as AuthenticatedRequest).authContext!;
    const category = await publishCategory(id, ctx.profileId);
    res.json({ data: category });
  },

  async archive(req: Request, res: Response) {
    const id = String(req.params.categoryId);
    const ctx = (req as AuthenticatedRequest).authContext!;
    const category = await archiveCategory(id, ctx.profileId);
    res.json({ data: category });
  },

  async listFields(req: Request, res: Response) {
    const id = String(req.params.categoryId);
    const fields = await listCategoryFields(id);
    res.json({ data: fields });
  },

  async createField(req: Request, res: Response) {
    const id = String(req.params.categoryId);
    const input = createCategoryFieldSchema.parse(req.body);
    const field = await createCategoryField(id, input);
    res.status(201).json({ data: field });
  },

  async updateField(req: Request, res: Response) {
    const categoryId = String(req.params.categoryId);
    const fieldId = String(req.params.fieldId);
    const input = updateCategoryFieldSchema.parse(req.body);
    const field = await updateCategoryField(categoryId, fieldId, input);
    res.json({ data: field });
  },
};
