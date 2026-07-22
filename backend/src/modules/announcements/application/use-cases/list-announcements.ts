import { announcementRepository } from '../../infrastructure/repositories/announcement-repository';
import type { Announcement } from '../../domain/entities/announcement';

export const listAnnouncements = async (input: {
  role: string;
  barangayId: string | null;
}): Promise<Announcement[]> => {
  if (input.role === 'ADMIN') {
    return announcementRepository.listForAdmin();
  }

  return announcementRepository.listForViewer(input);
};
