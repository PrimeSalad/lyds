import { supabaseAdmin } from '../../../../config/supabase';

export const duplicateChecker = {
  async checkDuplicates(barangayId: string, rows: any[]): Promise<Map<number, string>> {
    const duplicates = new Map<number, string>();
    
    const { data: existingProfiles, error } = await supabaseAdmin
      .from('youth_profiles')
      .select('id, display_name, birth_date')
      .eq('barangay_id', barangayId);

    if (error || !existingProfiles) return duplicates;

    const existingMap = new Map<string, string>();
    for (const p of existingProfiles) {
      if (p.display_name && p.birth_date) {
        const key = `${p.display_name.toLowerCase()}_${p.birth_date}`;
        existingMap.set(key, p.id);
      }
    }

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i].normalizedData;
      if (r && r.display_name && r.birth_date) {
        const key = `${r.display_name.toLowerCase()}_${r.birth_date}`;
        if (existingMap.has(key)) {
          duplicates.set(i, existingMap.get(key)!);
        }
      }
    }
    
    return duplicates;
  }
};
