import { describe, expect, it } from 'vitest';
import { buildDashboardAnalytics, type AnalyticsProfile } from './dashboard-analytics';

const makeProfile = (overrides: Partial<AnalyticsProfile> = {}): AnalyticsProfile => ({
  id: 'profile-1',
  barangay_id: 'barangay-1',
  display_name: 'Alex Youth',
  first_name: 'Alex',
  last_name: 'Youth',
  birth_date: '2004-02-24',
  age_at_submission: 22,
  status: 'DRAFT',
  email: 'alex@example.com',
  contact_number: '09123456789',
  sex_assigned_at_birth_id: 'sex-1',
  civil_status_id: 'civil-1',
  youth_classification_id: 'classification-1',
  youth_age_group_id: 'age-1',
  educational_attainment_id: 'education-1',
  work_status_id: 'work-1',
  created_at: '2026-07-03T00:00:00.000Z',
  updated_at: '2026-07-03T00:00:00.000Z',
  submitted_at: null,
  approved_at: null,
  barangayName: 'Agot',
  ageGroupLabel: 'Core Youth',
  classificationLabel: 'In-School Youth',
  ...overrides,
});

describe('buildDashboardAnalytics', () => {
  it('builds status, coverage, trend, and quality metrics', () => {
    const profiles = [
      makeProfile(),
      makeProfile({
        id: 'profile-2',
        status: 'APPROVED',
        submitted_at: '2026-06-02T00:00:00.000Z',
        approved_at: '2026-07-04T00:00:00.000Z',
        updated_at: '2026-07-04T00:00:00.000Z',
      }),
      makeProfile({
        id: 'profile-3',
        barangay_id: 'barangay-2',
        barangayName: 'Agumaymayan',
        display_name: 'Incomplete Youth',
        status: 'SUBMITTED',
        email: null,
        contact_number: null,
        work_status_id: null,
        submitted_at: '2026-07-05T00:00:00.000Z',
      }),
    ];

    const result = buildDashboardAnalytics(
      profiles,
      [{ id: 'barangay-1', name: 'Agot' }, { id: 'barangay-2', name: 'Agumaymayan' }],
      2,
      new Date('2026-07-22T00:00:00.000Z'),
    );

    expect(result.summary).toMatchObject({ totalRecords: 3, draft: 1, submitted: 1, approved: 1, totalAccounts: 2 });
    expect(result.coverage).toEqual({ barangaysWithRecords: 2, totalBarangays: 2, percentage: 100 });
    expect(result.dataQuality).toMatchObject({ completeRecords: 2, missingContact: 1, incompleteCore: 1 });
    expect(result.monthlyTrend.at(-1)).toMatchObject({ month: '2026-07', created: 3, submitted: 1, approved: 1 });
  });

  it('detects duplicate groups and stale drafts without dividing by zero', () => {
    const duplicate = makeProfile({ id: 'profile-2', email: null, contact_number: null });
    const result = buildDashboardAnalytics(
      [makeProfile({ updated_at: '2026-05-01T00:00:00.000Z' }), duplicate],
      [{ id: 'barangay-1', name: 'Agot' }],
      0,
      new Date('2026-07-22T00:00:00.000Z'),
    );
    const empty = buildDashboardAnalytics([], [], 0, new Date('2026-07-22T00:00:00.000Z'));

    expect(result.dataQuality).toMatchObject({ duplicateCandidates: 1, staleDrafts: 1 });
    expect(empty.dataQuality.completionRate).toBe(0);
    expect(empty.coverage.percentage).toBe(0);
  });
});
