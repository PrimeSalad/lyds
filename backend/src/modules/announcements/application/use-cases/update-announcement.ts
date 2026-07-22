import { auditService } from '../../../audit-logs/infrastructure/audit-service';
import { announcementRepository } from '../../infrastructure/repositories/announcement-repository';
import type { Announcement, UpdateAnnouncementInput } from '../../domain/entities/announcement';

export const updateAnnouncement = async (
  id: string,
  input: UpdateAnnouncementInput,
  actorId: string,
  actorRole: string,
): Promise<Announcement> => {
  const payload: UpdateAnnouncementInput = { ...input };
  if ('barangay_id' in payload) {
    payload.barangay_id = payload.barangay_id || null;
  }
  if ('expires_at' in payload) {
    payload.expires_at = payload.expires_at || null;
  }

  const announcement = await announcementRepository.update(id, payload);

  await auditService.log({
    actor_profile_id: actorId,
    actor_role: actorRole,
    action: 'ANNOUNCEMENT_UPDATED',
    entity_type: 'ANNOUNCEMENT',
    entity_id: announcement.id,
    barangay_id: announcement.barangay_id ?? undefined,
    after_data: { ...announcement },
  });

  return announcement;
};
