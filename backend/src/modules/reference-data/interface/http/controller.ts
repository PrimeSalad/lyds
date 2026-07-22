import type { Request, Response } from 'express';
import { listReferenceGroups } from '../../application/use-cases/list-reference-groups';
import { listReferenceOptions } from '../../application/use-cases/list-reference-options';
import { createReferenceOption } from '../../application/use-cases/create-reference-option';
import { updateReferenceOption } from '../../application/use-cases/update-reference-option';
import { createReferenceOptionSchema, updateReferenceOptionSchema } from './schema';

export const referenceDataController = {
  async listGroups(_req: Request, res: Response) {
    const groups = await listReferenceGroups();
    res.json({ data: groups });
  },

  async listOptions(req: Request, res: Response) {
    const groupCode = String(req.params.groupCode);
    const options = await listReferenceOptions(groupCode);
    res.json({ data: options });
  },

  async createOption(req: Request, res: Response) {
    const groupCode = String(req.params.groupCode);
    const input = createReferenceOptionSchema.parse(req.body);
    const option = await createReferenceOption(groupCode, input);
    res.status(201).json({ data: option });
  },

  async updateOption(req: Request, res: Response) {
    const groupCode = String(req.params.groupCode);
    const optionId = String(req.params.optionId);
    const input = updateReferenceOptionSchema.parse(req.body);
    const option = await updateReferenceOption(groupCode, optionId, input);
    res.json({ data: option });
  },
};
