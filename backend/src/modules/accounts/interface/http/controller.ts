import type { Request, Response } from 'express';
import type { AuthenticatedRequest } from '../../../../middleware/auth';
import { listAccounts } from '../../application/use-cases/list-accounts';
import { getAccount } from '../../application/use-cases/get-account';
import { createAccount } from '../../application/use-cases/create-account';
import { updateAccount } from '../../application/use-cases/update-account';
import { activateAccount } from '../../application/use-cases/activate-account';
import { deactivateAccount } from '../../application/use-cases/deactivate-account';
import { assignBarangay } from '../../application/use-cases/assign-barangay';
import { createAccountSchema, updateAccountSchema, assignBarangaySchema } from './schema';

export const accountController = {
  async list(_req: Request, res: Response) {
    const accounts = await listAccounts();
    res.json({ data: accounts });
  },

  async getById(req: Request, res: Response) {
    const id = String(req.params.accountId);
    const account = await getAccount(id);
    res.json({ data: account });
  },

  async create(req: Request, res: Response) {
    const input = createAccountSchema.parse(req.body);
    const ctx = (req as AuthenticatedRequest).authContext!;
    const account = await createAccount(input, ctx.profileId);
    res.status(201).json({ data: account });
  },

  async update(req: Request, res: Response) {
    const input = updateAccountSchema.parse(req.body);
    const id = String(req.params.accountId);
    const account = await updateAccount(id, input);
    res.json({ data: account });
  },

  async activate(req: Request, res: Response) {
    const ctx = (req as AuthenticatedRequest).authContext!;
    const id = String(req.params.accountId);
    const account = await activateAccount(id, ctx.profileId);
    res.json({ data: account });
  },

  async deactivate(req: Request, res: Response) {
    const ctx = (req as AuthenticatedRequest).authContext!;
    const id = String(req.params.accountId);
    const account = await deactivateAccount(id, ctx.profileId);
    res.json({ data: account });
  },

  async assignBarangayEndpoint(req: Request, res: Response) {
    const input = assignBarangaySchema.parse(req.body);
    const ctx = (req as AuthenticatedRequest).authContext!;
    const id = String(req.params.accountId);
    const result = await assignBarangay(id, input.barangay_id, ctx.profileId);
    res.json({ data: result });
  },
};
