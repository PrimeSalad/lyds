import { auditService } from '../../../audit-logs/infrastructure/audit-service';
import { announcementRepository } from '../../infrastructure/repositories/announcement-repository';
import type { Announcement, CreateAnnouncementInput } from '../../domain/entities/announcement';

export const createAnnouncement = async (
  input: CreateAnnouncementInput,
  actorId: string,
  actorRole: string,
): Promise<Announcement> => {
  const announcement = await announcementRepository.create({
    ...input,
    barangay_id: input.barangay_id || null,
    expires_at: input.expires_at || null,
    created_by: actorId,
  });

  await auditService.log({
    actor_profile_id: actorId,
    actor_role: actorRole,
    action: 'ANNOUNCEMENT_CREATED',
    entity_type: 'ANNOUNCEMENT',
    entity_id: announcement.id,
    barangay_id: announcement.barangay_id ?? undefined,
    after_data: { ...announcement },
  });

  return announcement;
};
