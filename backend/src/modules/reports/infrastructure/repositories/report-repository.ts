import { supabaseAdmin } from '../../../../config/supabase';

export const reportRepository = {
  async getSummary(filters: { barangayId?: string | null; categoryId?: string | null; status?: string | null } = {}) {
    let query = supabaseAdmin.from('youth_profiles').select('youth_profile_status, created_at, id');
    if (filters.barangayId) {
      query = query.eq('barangay_id', filters.barangayId);
    }
    if (filters.categoryId) {
      query = query.eq('category_id', filters.categoryId);
    }
    if (filters.status) {
      query = query.eq('youth_profile_status', filters.status);
    }
    
    const { data: profiles, error } = await query;
    if (error) throw error;
    
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const summary = {
      total: profiles.length,
      thisMonth: profiles.filter((p: any) => p.created_at >= firstDayOfMonth).length,
      byStatus: {
        DRAFT: 0,
        SUBMITTED: 0,
        APPROVED: 0,
        RETURNED: 0,
        ARCHIVED: 0,
      } as Record<string, number>,
      totalBarangays: 0,
      totalSKAccounts: 0,
    };
    
    for (const p of profiles) {
      if (summary.byStatus[p.youth_profile_status] !== undefined) {
        summary.byStatus[p.youth_profile_status]++;
      }
    }
    
    if (!filters.barangayId) {
      const { count: barangayCount } = await supabaseAdmin.from('barangays').select('id', { count: 'exact', head: true });
      const { count: skCount } = await supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'SK_OFFICIAL');
      summary.totalBarangays = barangayCount || 0;
      summary.totalSKAccounts = skCount || 0;
    }
    
    return summary;
  },

  async getDemographics(filters: { barangayId?: string | null; categoryId?: string | null; status?: string | null } = {}) {
    let query = supabaseAdmin.from('youth_profiles').select(`
      sex_id,
      civil_status_id,
      youth_classification_id,
      youth_age_group_id,
      educational_attainment_id,
      work_status_id,
      sex:reference_options!sex_id(label),
      civil_status:reference_options!civil_status_id(label),
      youth_classification:reference_options!youth_classification_id(label),
      youth_age_group:reference_options!youth_age_group_id(label),
      educational_attainment:reference_options!educational_attainment_id(label),
      work_status:reference_options!work_status_id(label)
    `);
    
    if (filters.barangayId) {
      query = query.eq('barangay_id', filters.barangayId);
    }
    if (filters.categoryId) {
      query = query.eq('category_id', filters.categoryId);
    }
    if (filters.status) {
      query = query.eq('youth_profile_status', filters.status);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    
    const countGroups = (profiles: any[], field: string) => {
      const counts: Record<string, number> = {};
      let total = 0;
      for (const p of profiles) {
        if (p[field]) {
          const label = p[field].label;
          counts[label] = (counts[label] || 0) + 1;
          total++;
        }
      }
      return Object.entries(counts).map(([label, count]) => ({
        label,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0
      })).sort((a, b) => b.count - a.count);
    };

    return {
      sex: countGroups(data, 'sex'),
      civilStatus: countGroups(data, 'civil_status'),
      youthClassification: countGroups(data, 'youth_classification'),
      youthAgeGroup: countGroups(data, 'youth_age_group'),
      educationalAttainment: countGroups(data, 'educational_attainment'),
      workStatus: countGroups(data, 'work_status'),
    };
  },

  async getByBarangay() {
    const { data: barangays, error: bError } = await supabaseAdmin.from('barangays').select('id, name');
    if (bError) throw bError;
    
    const { data: profiles, error: pError } = await supabaseAdmin.from('youth_profiles').select('barangay_id, youth_profile_status');
    if (pError) throw pError;
    
    const { data: imports, error: iError } = await supabaseAdmin.from('import_batches').select('barangay_id, created_at').order('created_at', { ascending: false });
    if (iError) throw iError;
    
    const statsMap = new Map();
    for (const b of barangays) {
      statsMap.set(b.id, {
        id: b.id,
        name: b.name,
        totalRecords: 0,
        pendingRecords: 0,
        lastImportDate: null
      });
    }
    
    for (const p of profiles) {
      if (p.barangay_id && statsMap.has(p.barangay_id)) {
        const stat = statsMap.get(p.barangay_id);
        stat.totalRecords++;
        if (p.youth_profile_status === 'SUBMITTED') {
          stat.pendingRecords++;
        }
      }
    }
    
    for (const i of imports) {
      if (i.barangay_id && statsMap.has(i.barangay_id)) {
        const stat = statsMap.get(i.barangay_id);
        if (!stat.lastImportDate) {
          stat.lastImportDate = i.created_at;
        }
      }
    }
    
    return Array.from(statsMap.values()).sort((a, b) => b.totalRecords - a.totalRecords);
  },

  async getExportData(filters: { barangayId?: string | null; categoryId?: string | null; status?: string | null } = {}) {
    let query = supabaseAdmin.from('youth_profiles').select(`
      *,
      sex:reference_options!sex_id(label),
      civil_status:reference_options!civil_status_id(label),
      youth_classification:reference_options!youth_classification_id(label),
      youth_age_group:reference_options!youth_age_group_id(label),
      educational_attainment:reference_options!educational_attainment_id(label),
      work_status:reference_options!work_status_id(label),
      barangay:barangays(name)
    `);
    
    if (filters.barangayId) {
      query = query.eq('barangay_id', filters.barangayId);
    }

    if (filters.categoryId) {
      query = query.eq('category_id', filters.categoryId);
    }

    if (filters.status) {
      query = query.eq('youth_profile_status', filters.status);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    
    return data;
  }
};
