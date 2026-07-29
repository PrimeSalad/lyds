import type { Page, Route } from '@playwright/test';

export type MockRole = 'ADMIN' | 'SK_OFFICIAL';

const json = async (route: Route, body: unknown, status = 200) => route.fulfill({
  status,
  contentType: 'application/json',
  body: JSON.stringify(body),
});

const encodeJwtPart = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');

const accessTokenWithAal = (aal: 'aal1' | 'aal2') => [
  encodeJwtPart({ alg: 'none', typ: 'JWT' }),
  encodeJwtPart({
    sub: 'profile-1',
    aud: 'authenticated',
    role: 'authenticated',
    aal,
    amr: aal === 'aal2'
      ? [{ method: 'password', timestamp: Math.floor(Date.now() / 1_000) }, { method: 'totp', timestamp: Math.floor(Date.now() / 1_000) }]
      : [{ method: 'password', timestamp: Math.floor(Date.now() / 1_000) }],
    iat: Math.floor(Date.now() / 1_000),
    exp: Math.floor(Date.now() / 1_000) + 3_600,
  }),
  'test-signature',
].join('.');

const emptyMeta = {
  page: 1,
  pageSize: 25,
  totalItems: 0,
  totalPages: 0,
};

const dashboard = {
  summary: {
    totalRecords: 6_714,
    draft: 50,
    submitted: 300,
    approved: 6_344,
    returned: 20,
    archived: 0,
    thisMonth: 0,
    totalBarangays: 61,
    totalAccounts: 62,
  },
  statusDistribution: [],
  monthlyTrend: [],
  barangayCoverage: [],
  coverage: { barangaysWithRecords: 61, totalBarangays: 61, percentage: 100 },
  dataQuality: {
    completeRecords: 2_400,
    completionRate: 35.7,
    missingContact: 1_000,
    incompleteCore: 4_314,
    duplicateCandidates: 0,
    staleDrafts: 0,
  },
  demographics: { ageGroups: [], youthClassifications: [] },
  recentRecords: [],
  generatedAt: '2026-07-28T00:00:00.000Z',
};

const breakdown = [
  { label: 'Yes', count: 2_949, percentage: 43.9 },
  { label: 'No response', count: 3_765, percentage: 56.1 },
];

const demographics = {
  totalRecords: 6_714,
  sex: [{ label: 'Female', count: 3_520, percentage: 52.4 }, { label: 'No response', count: 3_194, percentage: 47.6 }],
  civilStatus: breakdown,
  youthClassification: breakdown,
  youthAgeGroup: breakdown,
  educationalAttainment: breakdown,
  workStatus: breakdown,
  registeredVoter: breakdown,
  votedLastElection: breakdown,
  attendedAssembly: breakdown,
};

const category = {
  id: 'category-2026',
  code: 'KK_2026',
  name: 'KK Youth Profile 2026',
  description: null,
  record_type: 'YOUTH_PROFILE',
  filing_year: 2026,
  permission_mode: 'BARANGAY_SCOPED',
  allow_sk_export: true,
  record_count: 6_714,
  field_count: 0,
  status: 'PUBLISHED',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

const barangay = {
  id: 'barangay-agot',
  code: '174001001',
  name: 'Agot',
  municipality: 'Boac',
  province: 'Marinduque',
  is_active: true,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

const childLaborer = {
  id: 'child-laborer-1',
  row_number: 1,
  filing_year: 2026,
  barangay_id: barangay.id,
  barangay_name: barangay.name,
  first_name: 'Maria',
  middle_name: 'Santos',
  last_name: 'Dela Cruz',
  child_name: 'Dela Cruz, Maria Santos',
  birth_date: '2012-04-15',
  age: 14,
  gender: 'FEMALE',
  attending_school: true,
  highest_grade_completed: 'Grade 7',
  nature_of_work: 'Seasonal farm work',
  father_name: 'Pedro Dela Cruz',
  mother_name: 'Ana Dela Cruz',
  guardian_name: null,
  parent_guardian_occupation: 'Farmer',
  record_status: 'MONITORED',
  remarks: 'Quarterly follow-up',
  version: 1,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

export const installApiMocks = async (page: Page, role: MockRole = 'ADMIN') => {
  const now = Math.floor(Date.now() / 1_000);
  await page.addInitScript(({ key, session }) => {
    window.localStorage.setItem(key, JSON.stringify(session));
  }, {
    key: 'sb-localhost-auth-token',
    session: {
      access_token: accessTokenWithAal('aal2'),
      token_type: 'bearer',
      expires_in: 3_600,
      expires_at: now + 3_600,
      refresh_token: 'test-refresh-token',
      user: {
        id: 'profile-1',
        aud: 'authenticated',
        role: 'authenticated',
        email: 'admin@example.com',
        app_metadata: {},
        user_metadata: {},
        created_at: '2026-01-01T00:00:00.000Z',
        factors: [{
          id: 'totp-factor-1',
          status: 'verified',
          factor_type: 'totp',
          friendly_name: 'Test Authenticator',
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z',
        }],
      },
    },
  });

  await page.route('http://localhost:4000/api/v1/**', async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace('/api/v1', '');

    if (path === '/auth/me') {
      await json(route, {
        data: {
          profileId: 'profile-1',
          role,
          barangayId: role === 'SK_OFFICIAL' ? barangay.id : null,
          accountStatus: 'ACTIVE',
          mfaVerified: true,
          mustChangePassword: false,
        },
      });
      return;
    }
    if (path === '/auth/profile') {
      await json(route, {
        data: {
          profile: {
            id: 'profile-1',
            full_name: 'Test Administrator',
            role,
            account_status: 'ACTIVE',
            position_title: 'System Administrator',
            contact_number: null,
            must_change_password: false,
            created_at: '2026-01-01T00:00:00.000Z',
            updated_at: '2026-01-01T00:00:00.000Z',
          },
          email: 'admin@example.com',
        },
      });
      return;
    }
    if (path === '/reports/dashboard') {
      await json(route, { data: dashboard });
      return;
    }
    if (path === '/reports/summary') {
      await json(route, { data: dashboard.summary });
      return;
    }
    if (path === '/reports/demographics') {
      await json(route, { data: demographics });
      return;
    }
    if (path === '/barangays') {
      await json(route, { data: [barangay] });
      return;
    }
    if (path === `/barangays/${barangay.id}`) {
      await json(route, { data: barangay });
      return;
    }
    if (path === '/categories') {
      await json(route, { data: [category] });
      return;
    }
    if (path === `/categories/${category.id}`) {
      await json(route, { data: { ...category, fields: [] } });
      return;
    }
    if (path === `/categories/${category.id}/fields`) {
      await json(route, { data: [] });
      return;
    }
    if (path === '/reference-data') {
      await json(route, { data: [] });
      return;
    }
    if (path.startsWith('/reference-data/')) {
      const groupCode = path.split('/')[2] ?? 'REFERENCE';
      await json(route, {
        data: [{
          id: `${groupCode.toLowerCase()}-option`,
          group_code: groupCode,
          code: 'OPTION',
          label: 'Sample option',
          sort_order: 1,
          is_active: true,
        }],
      });
      return;
    }
    if (path === '/youth-records') {
      await json(route, { data: [], meta: emptyMeta });
      return;
    }
    if (path === '/child-laborers') {
      await json(route, { data: [childLaborer], meta: { ...emptyMeta, totalItems: 1, totalPages: 1 } });
      return;
    }
    if (path === '/child-laborers/summary') {
      await json(route, {
        data: {
          total_records: 1,
          attending_school: 1,
          not_attending_school: 0,
          active_cases: 1,
          closed_cases: 0,
          status_counts: { MONITORED: 1 },
        },
      });
      return;
    }
    if (path === `/child-laborers/${childLaborer.id}`) {
      await json(route, { data: childLaborer });
      return;
    }
    if (path === '/youth-records/record-unanswered') {
      await json(route, {
        data: {
          id: 'record-unanswered',
          category_id: category.id,
          barangay_id: barangay.id,
          display_name: 'Imported Youth',
          first_name: 'Imported',
          middle_name: null,
          last_name: 'Youth',
          suffix: null,
          birth_date: '2004-01-15',
          age_at_submission: 22,
          sex_assigned_at_birth_id: 'sex_assigned_at_birth-option',
          civil_status_id: 'civil_status-option',
          youth_classification_id: 'youth_classification-option',
          educational_attainment_id: 'educational_attainment-option',
          work_status_id: 'work_status-option',
          email: null,
          contact_number: null,
          is_registered_voter: null,
          voted_last_election: null,
          attended_kk_assembly: null,
          kk_assembly_count: 0,
          custom_values: {},
          status: 'DRAFT',
          version: 1,
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z',
        },
      });
      return;
    }
    if (path === '/youth-records/record-unanswered/history') {
      await json(route, { data: [] });
      return;
    }
    if (path === '/imports') {
      await json(route, { data: [], meta: emptyMeta });
      return;
    }
    if (path === '/accounts') {
      await json(route, { data: [] });
      return;
    }
    if (path === '/announcements') {
      await json(route, { data: [] });
      return;
    }
    if (path === '/audit-logs') {
      await json(route, { data: [], meta: emptyMeta });
      return;
    }

    await json(route, { data: [] });
  });
};

export const installSupabaseLoginMock = async (
  page: Page,
  succeeds: boolean,
  mfaState: 'verified' | 'challenge' = 'verified',
) => {
  await page.route('**/auth/v1/token**', async (route) => {
    if (!succeeds) {
      await json(route, { message: 'Invalid login credentials' }, 400);
      return;
    }

    await json(route, {
      access_token: accessTokenWithAal(mfaState === 'verified' ? 'aal2' : 'aal1'),
      token_type: 'bearer',
      expires_in: 3_600,
      expires_at: Math.floor(Date.now() / 1_000) + 3_600,
      refresh_token: 'test-refresh-token',
      user: {
        id: 'profile-1',
        aud: 'authenticated',
        role: 'authenticated',
        email: 'admin@example.com',
        app_metadata: {},
        user_metadata: {},
        factors: [{
          id: 'totp-factor-1',
          status: 'verified',
          factor_type: 'totp',
          friendly_name: 'Test Authenticator',
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z',
        }],
        created_at: '2026-01-01T00:00:00.000Z',
      },
    });
  });

  if (succeeds && mfaState === 'challenge') {
    await page.route('**/auth/v1/user', async (route) => {
      await json(route, {
        id: 'profile-1',
        aud: 'authenticated',
        role: 'authenticated',
        email: 'admin@example.com',
        app_metadata: {},
        user_metadata: {},
        factors: [{
          id: 'totp-factor-1',
          status: 'verified',
          factor_type: 'totp',
          friendly_name: 'Test Authenticator',
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z',
        }],
        created_at: '2026-01-01T00:00:00.000Z',
      });
    });
    await page.route('**/auth/v1/factors/totp-factor-1/challenge', async (route) => {
      await json(route, { id: 'mfa-challenge-1', expires_at: Math.floor(Date.now() / 1_000) + 300 });
    });
    await page.route('**/auth/v1/factors/totp-factor-1/verify', async (route) => {
      await json(route, {
        access_token: accessTokenWithAal('aal2'),
        token_type: 'bearer',
        expires_in: 3_600,
        expires_at: Math.floor(Date.now() / 1_000) + 3_600,
        refresh_token: 'verified-refresh-token',
        user: {
          id: 'profile-1',
          aud: 'authenticated',
          role: 'authenticated',
          email: 'admin@example.com',
          app_metadata: {},
          user_metadata: {},
          factors: [{
            id: 'totp-factor-1',
            status: 'verified',
            factor_type: 'totp',
            friendly_name: 'Test Authenticator',
            created_at: '2026-01-01T00:00:00.000Z',
            updated_at: '2026-01-01T00:00:00.000Z',
          }],
          created_at: '2026-01-01T00:00:00.000Z',
        },
      });
    });
  }
};

export const runtimeErrors = (page: Page) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  return errors;
};
