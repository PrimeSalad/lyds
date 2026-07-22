import type { Request, Response } from 'express';
import type { AuthenticatedRequest } from '../../../../middleware/auth';
import { createAnnouncement } from '../../application/use-cases/create-announcement';
import { listAnnouncements } from '../../application/use-cases/list-announcements';
import { updateAnnouncement } from '../../application/use-cases/update-announcement';
import { createAnnouncementSchema, updateAnnouncementSchema } from './schema';

export const announcementController = {
  async list(req: Request, res: Response) {
    const ctx = (req as AuthenticatedRequest).authContext!;
    const data = await listAnnouncements({ role: ctx.role, barangayId: ctx.barangayId });
    res.json({ data });
  },

  async create(req: Request, res: Response) {
    const input = createAnnouncementSchema.parse(req.body);
    const ctx = (req as AuthenticatedRequest).authContext!;
    const data = await createAnnouncement(input, ctx.profileId, ctx.role);
    res.status(201).json({ data });
  },

  async update(req: Request, res: Response) {
    const input = updateAnnouncementSchema.parse(req.body);
    const ctx = (req as AuthenticatedRequest).authContext!;
    const data = await updateAnnouncement(String(req.params.announcementId), input, ctx.profileId, ctx.role);
    res.json({ data });
  },

  async archive(req: Request, res: Response) {
    const ctx = (req as AuthenticatedRequest).authContext!;
    const data = await updateAnnouncement(
      String(req.params.announcementId),
      { status: 'ARCHIVED' },
      ctx.profileId,
      ctx.role,
    );
    res.json({ data });
  },
};
