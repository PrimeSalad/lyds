import type { Request, Response } from 'express';
import { listBarangays } from '../../application/use-cases/list-barangays';
import { getBarangay } from '../../application/use-cases/get-barangay';
import { createBarangay } from '../../application/use-cases/create-barangay';
import { updateBarangay } from '../../application/use-cases/update-barangay';
import { toggleBarangayStatus } from '../../application/use-cases/toggle-barangay-status';
import { barangayRepository } from '../../infrastructure/repositories/barangay-repository';
import { createBarangaySchema, updateBarangaySchema } from './schema';

export const barangayController = {
  async list(_req: Request, res: Response) {
    const barangays = await listBarangays();
    res.json({ data: barangays });
  },

  async getById(req: Request, res: Response) {
    const id = String(req.params.barangayId);
    const barangay = await getBarangay(id);
    res.json({ data: barangay });
  },

  async create(req: Request, res: Response) {
    const input = createBarangaySchema.parse(req.body);
    const barangay = await createBarangay(input);
    res.status(201).json({ data: barangay });
  },

  async update(req: Request, res: Response) {
    const input = updateBarangaySchema.parse(req.body);
    const id = String(req.params.barangayId);
    const barangay = await updateBarangay(id, input);
    res.json({ data: barangay });
  },

  async activate(req: Request, res: Response) {
    const id = String(req.params.barangayId);
    const barangay = await toggleBarangayStatus(id, true);
    res.json({ data: barangay });
  },

  async deactivate(req: Request, res: Response) {
    const id = String(req.params.barangayId);
    const barangay = await toggleBarangayStatus(id, false);
    res.json({ data: barangay });
  },

  async summary(req: Request, res: Response) {
    const id = String(req.params.barangayId);
    const barangay = await getBarangay(id);
    const accountCount = await barangayRepository.countAssignedAccounts(barangay.id);
    const recordCount = await barangayRepository.countYouthRecords(barangay.id);

    res.json({
      data: {
        ...barangay,
        account_count: accountCount,
        record_count: recordCount,
      },
    });
  },
};
