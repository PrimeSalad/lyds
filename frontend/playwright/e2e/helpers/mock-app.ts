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

const childLaborerCategory = {
  ...category,
  id: 'child-category-2026',
  code: 'CHILD_LABORER_2026',
  name: 'Child Laborer Records 2026',
  description: 'Annual protected child laborer registry.',
  record_type: 'CHILD_LABORER',
  permission_mode: 'SK_FILLABLE',
  record_count: 1,
};

const youthCategory2025 = {
  ...category,
  id: 'category-2025',
  code: 'KK_2025',
  name: 'KK Youth Profile 2025',
  filing_year: 2025,
  record_count: 0,
};

const childLaborerCategory2025 = {
  ...childLaborerCategory,
  id: 'child-category-2025',
  code: 'CHILD_LABORER_2025',
  name: 'Child Laborer Records 2025',
  filing_year: 2025,
  record_count: 0,
};

const youthReferenceGroups = [{
  id: 'reference-group-youth-classification',
  code: 'YOUTH_CLASSIFICATION',
  name: 'Youth Classification',
  description: 'Youth classification category',
  record_type: 'YOUTH_PROFILE',
  created_at: '2026-01-01T00:00:00.000Z',
}];

const childLaborerReferenceGroups = [
  {
    id: 'reference-group-child-grade',
    code: 'CHILD_LABORER_HIGHEST_GRADE',
    name: 'Highest Grade Completed',
    description: 'Maintained grade-level suggestions for Child Laborer records.',
    record_type: 'CHILD_LABORER',
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'reference-group-child-work',
    code: 'CHILD_LABORER_NATURE_OF_WORK',
    name: 'Nature of Work',
    description: 'Standard work descriptions used by the Child Laborer registry and reports.',
    record_type: 'CHILD_LABORER',
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'reference-group-child-occupation',
    code: 'CHILD_LABORER_PARENT_GUARDIAN_OCCUPATION',
    name: 'Parent or Guardian Occupation',
    description: 'Standard occupation descriptions used for Child Laborer household details.',
    record_type: 'CHILD_LABORER',
    created_at: '2026-01-01T00:00:00.000Z',
  },
];

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
  category_id: childLaborerCategory.id,
  category_name: childLaborerCategory.name,
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
  record_status: 'VALIDATED',
  remarks: 'Household details confirmed during field validation.',
  custom_values: {},
  version: 1,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

const importBatch = {
  id: 'import-batch-1',
  category_id: category.id,
  record_type: 'YOUTH_PROFILE',
  barangay_id: barangay.id,
  uploaded_by: 'profile-1',
  file_name: 'kk-youth-agot-2026.xlsx',
  status: 'VALIDATED',
  total_rows: 3,
  valid_rows: 1,
  invalid_rows: 1,
  duplicate_rows: 1,
  error_message: null,
  barangay_name: barangay.name,
  category_name: category.name,
  filing_year: 2026,
  uploaded_by_name: 'Test Administrator',
  created_at: '2026-08-03T00:00:00.000Z',
  updated_at: '2026-08-03T00:00:00.000Z',
};

const importRows = [
  {
    id: 'import-row-ready',
    row_number: 4,
    raw_data: { Name: 'Alyssa Reyes' },
    normalized_data: { display_name: 'Alyssa Reyes' },
    is_valid: true,
    is_duplicate: false,
    duplicate_match_id: null,
    validation_errors: [],
    validation_warnings: [],
  },
  {
    id: 'import-row-invalid',
    row_number: 5,
    raw_data: { Name: 'Brandon Santos' },
    normalized_data: { display_name: 'Brandon Santos' },
    is_valid: false,
    is_duplicate: false,
    duplicate_match_id: null,
    validation_errors: [
      'Birth date is required.',
      'Youth classification was not recognized.',
    ],
    validation_warnings: ['Contact number is blank.'],
  },
  {
    id: 'import-row-duplicate',
    row_number: 6,
    raw_data: { Name: 'Carla Mendoza' },
    normalized_data: { display_name: 'Carla Mendoza' },
    is_valid: true,
    is_duplicate: true,
    duplicate_match_id: 'existing-youth-record',
    validation_errors: [],
    validation_warnings: [],
  },
];

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
      const recordType = url.searchParams.get('recordType');
      await json(route, {
        data: recordType === 'YOUTH_PROFILE'
          ? [category, youthCategory2025]
          : recordType === 'CHILD_LABORER'
            ? [childLaborerCategory, childLaborerCategory2025]
            : [category, youthCategory2025, childLaborerCategory, childLaborerCategory2025],
      });
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
    if (path === `/categories/${youthCategory2025.id}`) {
      await json(route, { data: { ...youthCategory2025, fields: [] } });
      return;
    }
    if (path === `/categories/${youthCategory2025.id}/fields`) {
      await json(route, { data: [] });
      return;
    }
    if (path === `/categories/${childLaborerCategory.id}`) {
      await json(route, { data: { ...childLaborerCategory, fields: [] } });
      return;
    }
    if (path === `/categories/${childLaborerCategory.id}/fields`) {
      await json(route, { data: [] });
      return;
    }
    if (path === `/categories/${childLaborerCategory2025.id}`) {
      await json(route, { data: { ...childLaborerCategory2025, fields: [] } });
      return;
    }
    if (path === `/categories/${childLaborerCategory2025.id}/fields`) {
      await json(route, { data: [] });
      return;
    }
    if (path === '/reference-data') {
      const recordType = url.searchParams.get('recordType');
      await json(route, {
        data: recordType === 'CHILD_LABORER'
          ? childLaborerReferenceGroups
          : recordType === 'YOUTH_PROFILE'
            ? youthReferenceGroups
            : [...youthReferenceGroups, ...childLaborerReferenceGroups],
      });
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
          status_counts: {
            IDENTIFIED: 0,
            VALIDATED: 1,
            REFERRED: 0,
            MONITORED: 0,
            CLOSED: 0,
            ARCHIVED: 0,
          },
          gender_distribution: [
            { key: 'MALE', label: 'Male', count: 0, percentage: 0 },
            { key: 'FEMALE', label: 'Female', count: 1, percentage: 100 },
            { key: 'NOT_SPECIFIED', label: 'Not specified', count: 0, percentage: 0 },
          ],
          age_distribution: [
            { key: 'UNDER_10', label: 'Under 10', count: 0, percentage: 0 },
            { key: 'AGE_10_14', label: '10–14', count: 1, percentage: 100 },
            { key: 'AGE_15_17', label: '15–17', count: 0, percentage: 0 },
            { key: 'AGE_18_PLUS', label: '18 and above', count: 0, percentage: 0 },
          ],
          barangay_distribution: [
            { key: barangay.id, label: barangay.name, count: 1, percentage: 100 },
          ],
          work_distribution: [
            { key: 'seasonal farm work', label: 'Seasonal farm work', count: 1, percentage: 100 },
          ],
          data_quality: {
            completeness_percentage: 100,
            complete_records: 1,
            records_with_grade: 1,
            records_with_parent_occupation: 1,
            records_with_specified_work: 1,
          },
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
    if (path === `/imports/${importBatch.id}`) {
      await json(route, { data: importBatch });
      return;
    }
    if (path === `/imports/${importBatch.id}/rows`) {
      await json(route, {
        data: importRows,
        meta: { page: 1, pageSize: 25, totalItems: importRows.length, totalPages: 1 },
      });
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
