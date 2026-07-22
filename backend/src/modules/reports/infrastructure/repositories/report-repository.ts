import { supabaseAdmin } from '../../../../config/supabase';
import { buildDashboardAnalytics, type AnalyticsProfile } from '../../domain/dashboard-analytics';

type ReportFilters = {
  barangayId?: string | null;
  categoryId?: string | null;
  status?: string | null;
};

const pageSize = 1000;
const boacMunicipality = 'Boac';
const marinduqueProvince = 'Marinduque';

const fetchAllPages = async (
  getPage: (from: number, to: number) => PromiseLike<{ data: any[] | null; error: any }>,
) => {
  const rows: any[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await getPage(from, from + pageSize - 1);
    if (error) throw error;
    const page = data ?? [];
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return rows;
};

const relationLabel = (relation: any): string | null => {
  if (Array.isArray(relation)) return relation[0]?.label ?? null;
  return relation?.label ?? null;
};

const relationName = (relation: any): string => {
  if (Array.isArray(relation)) return relation[0]?.name ?? 'Unknown barangay';
  return relation?.name ?? 'Unknown barangay';
};

const applyFilters = (query: any, filters: ReportFilters) => {
  let filtered = query.is('deleted_at', null);
  if (filters.barangayId) filtered = filtered.eq('barangay_id', filters.barangayId);
  if (filters.categoryId) filtered = filtered.eq('category_id', filters.categoryId);
  if (filters.status) filtered = filtered.eq('status', filters.status);
  return filtered;
};

export const reportRepository = {
  async getSummary(filters: ReportFilters = {}) {
    const profiles = await fetchAllPages((from, to) => applyFilters(
      supabaseAdmin.from('youth_profiles').select('status, created_at'),
      filters,
    ).range(from, to));

    const now = new Date();
    const firstDayOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
    const byStatus = {
      DRAFT: 0,
      SUBMITTED: 0,
      APPROVED: 0,
      RETURNED: 0,
      ARCHIVED: 0,
    } as Record<string, number>;
    profiles.forEach((profile) => {
      if (byStatus[profile.status] !== undefined) byStatus[profile.status] += 1;
    });

    let totalBarangays = 0;
    let totalSKAccounts = 0;
    if (!filters.barangayId) {
      const [barangayResult, accountResult] = await Promise.all([
        supabaseAdmin.from('barangays').select('id', { count: 'exact', head: true })
          .eq('is_active', true).is('deleted_at', null)
          .eq('municipality', boacMunicipality).eq('province', marinduqueProvince),
        supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true })
          .eq('role', 'SK_OFFICIAL').eq('account_status', 'ACTIVE'),
      ]);
      if (barangayResult.error) throw barangayResult.error;
      if (accountResult.error) throw accountResult.error;
      totalBarangays = barangayResult.count ?? 0;
      totalSKAccounts = accountResult.count ?? 0;
    }

    return {
      total: profiles.length,
      thisMonth: profiles.filter((profile) => profile.created_at >= firstDayOfMonth).length,
      byStatus,
      totalBarangays,
      totalSKAccounts,
    };
  },

  async getDashboardAnalytics(barangayId?: string | null) {
    const profiles = await fetchAllPages((from, to) => {
      let query = supabaseAdmin.from('youth_profiles').select(`
        id, barangay_id, display_name, first_name, last_name, birth_date, age_at_submission,
        status, email, contact_number, sex_assigned_at_birth_id, civil_status_id,
        youth_classification_id, youth_age_group_id, educational_attainment_id, work_status_id,
        created_at, updated_at, submitted_at, approved_at,
        barangay:barangays!barangay_id(name),
        age_group:reference_options!youth_age_group_id(label),
        classification:reference_options!youth_classification_id(label)
      `).is('deleted_at', null);
      if (barangayId) query = query.eq('barangay_id', barangayId);
      return query.range(from, to);
    });

    let barangayQuery = supabaseAdmin.from('barangays').select('id, name')
      .eq('is_active', true).is('deleted_at', null)
      .eq('municipality', boacMunicipality).eq('province', marinduqueProvince).order('name');
    if (barangayId) barangayQuery = barangayQuery.eq('id', barangayId);

    const [barangayResult, accountResult] = await Promise.all([
      barangayQuery,
      barangayId
        ? Promise.resolve({ count: 0, error: null })
        : supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true })
          .eq('role', 'SK_OFFICIAL').eq('account_status', 'ACTIVE'),
    ]);
    if (barangayResult.error) throw barangayResult.error;
    if (accountResult.error) throw accountResult.error;

    const normalizedProfiles: AnalyticsProfile[] = profiles.map((profile) => ({
      id: profile.id,
      barangay_id: profile.barangay_id,
      display_name: profile.display_name,
      first_name: profile.first_name,
      last_name: profile.last_name,
      birth_date: profile.birth_date,
      age_at_submission: profile.age_at_submission,
      status: profile.status,
      email: profile.email,
      contact_number: profile.contact_number,
      sex_assigned_at_birth_id: profile.sex_assigned_at_birth_id,
      civil_status_id: profile.civil_status_id,
      youth_classification_id: profile.youth_classification_id,
      youth_age_group_id: profile.youth_age_group_id,
      educational_attainment_id: profile.educational_attainment_id,
      work_status_id: profile.work_status_id,
      created_at: profile.created_at,
      updated_at: profile.updated_at,
      submitted_at: profile.submitted_at,
      approved_at: profile.approved_at,
      barangayName: relationName(profile.barangay),
      ageGroupLabel: relationLabel(profile.age_group),
      classificationLabel: relationLabel(profile.classification),
    }));

    return buildDashboardAnalytics(
      normalizedProfiles,
      (barangayResult.data ?? []).map((barangay) => ({ id: barangay.id, name: barangay.name })),
      accountResult.count ?? 0,
    );
  },

  async getDemographics(filters: ReportFilters = {}) {
    const data = await fetchAllPages((from, to) => applyFilters(
      supabaseAdmin.from('youth_profiles').select(`
        sex:reference_options!sex_assigned_at_birth_id(label),
        civil_status:reference_options!civil_status_id(label),
        youth_classification:reference_options!youth_classification_id(label),
        youth_age_group:reference_options!youth_age_group_id(label),
        educational_attainment:reference_options!educational_attainment_id(label),
        work_status:reference_options!work_status_id(label)
      `),
      filters,
    ).range(from, to));

    const countGroups = (field: string) => {
      const counts = new Map<string, number>();
      data.forEach((profile) => {
        const label = relationLabel(profile[field]);
        if (label) counts.set(label, (counts.get(label) ?? 0) + 1);
      });
      const total = Array.from(counts.values()).reduce((sum, count) => sum + count, 0);
      return Array.from(counts.entries())
        .map(([label, count]) => ({ label, count, percentage: total > 0 ? (count / total) * 100 : 0 }))
        .sort((a, b) => b.count - a.count);
    };

    return {
      sex: countGroups('sex'),
      civilStatus: countGroups('civil_status'),
      youthClassification: countGroups('youth_classification'),
      youthAgeGroup: countGroups('youth_age_group'),
      educationalAttainment: countGroups('educational_attainment'),
      workStatus: countGroups('work_status'),
    };
  },

  async getByBarangay() {
    const { data: barangays, error: barangayError } = await supabaseAdmin.from('barangays')
      .select('id, name').eq('is_active', true).is('deleted_at', null)
      .eq('municipality', boacMunicipality).eq('province', marinduqueProvince).order('name');
    if (barangayError) throw barangayError;

    const profiles = await fetchAllPages((from, to) => supabaseAdmin.from('youth_profiles')
      .select('barangay_id, status, updated_at').is('deleted_at', null).range(from, to));
    const imports = await fetchAllPages((from, to) => supabaseAdmin.from('import_batches')
      .select('barangay_id, created_at').order('created_at', { ascending: false }).range(from, to));

    const statsMap = new Map((barangays ?? []).map((barangay) => [barangay.id, {
      barangayId: barangay.id,
      barangayName: barangay.name,
      totalRecords: 0,
      pendingReview: 0,
      lastImportDate: null as string | null,
    }]));
    profiles.forEach((profile) => {
      const stat = statsMap.get(profile.barangay_id);
      if (!stat) return;
      stat.totalRecords += 1;
      if (profile.status === 'SUBMITTED') stat.pendingReview += 1;
    });
    imports.forEach((item) => {
      const stat = statsMap.get(item.barangay_id);
      if (stat && !stat.lastImportDate) stat.lastImportDate = item.created_at;
    });
    return Array.from(statsMap.values())
      .sort((a, b) => b.totalRecords - a.totalRecords || a.barangayName.localeCompare(b.barangayName));
  },

  async getExportData(filters: ReportFilters = {}) {
    return fetchAllPages((from, to) => applyFilters(
      supabaseAdmin.from('youth_profiles').select(`
        *,
        sex:reference_options!sex_assigned_at_birth_id(label),
        civil_status:reference_options!civil_status_id(label),
        youth_classification:reference_options!youth_classification_id(label),
        youth_age_group:reference_options!youth_age_group_id(label),
        educational_attainment:reference_options!educational_attainment_id(label),
        work_status:reference_options!work_status_id(label),
        barangay:barangays(name)
      `),
      filters,
    ).range(from, to));
  },
};
