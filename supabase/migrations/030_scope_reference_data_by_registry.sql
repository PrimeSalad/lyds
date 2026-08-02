-- Scope reference-data groups to the registry they support and add maintained
-- suggestions for Child Laborer education, work, and household fields.

ALTER TABLE public.reference_groups
  ADD COLUMN IF NOT EXISTS record_type TEXT;

UPDATE public.reference_groups
SET record_type = 'YOUTH_PROFILE'
WHERE record_type IS NULL;

ALTER TABLE public.reference_groups
  DROP CONSTRAINT IF EXISTS reference_groups_record_type_check;

ALTER TABLE public.reference_groups
  ADD CONSTRAINT reference_groups_record_type_check
    CHECK (record_type IN ('YOUTH_PROFILE', 'CHILD_LABORER')),
  ALTER COLUMN record_type SET DEFAULT 'YOUTH_PROFILE',
  ALTER COLUMN record_type SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_reference_groups_record_type_name
  ON public.reference_groups (record_type, name);

INSERT INTO public.reference_groups (code, name, description, record_type) VALUES
  (
    'CHILD_LABORER_HIGHEST_GRADE',
    'Highest Grade Completed',
    'Maintained grade-level suggestions for Child Laborer records.',
    'CHILD_LABORER'
  ),
  (
    'CHILD_LABORER_NATURE_OF_WORK',
    'Nature of Work',
    'Standard work descriptions used by the Child Laborer registry and reports.',
    'CHILD_LABORER'
  ),
  (
    'CHILD_LABORER_PARENT_GUARDIAN_OCCUPATION',
    'Parent or Guardian Occupation',
    'Standard occupation descriptions used for Child Laborer household details.',
    'CHILD_LABORER'
  )
ON CONFLICT (code) DO UPDATE
SET record_type = EXCLUDED.record_type;

INSERT INTO public.reference_options (group_code, code, label, sort_order) VALUES
  ('CHILD_LABORER_HIGHEST_GRADE', 'NO_GRADE_COMPLETED', 'No Grade Completed', 1),
  ('CHILD_LABORER_HIGHEST_GRADE', 'KINDERGARTEN', 'Kindergarten', 2),
  ('CHILD_LABORER_HIGHEST_GRADE', 'GRADE_1', 'Grade 1', 3),
  ('CHILD_LABORER_HIGHEST_GRADE', 'GRADE_2', 'Grade 2', 4),
  ('CHILD_LABORER_HIGHEST_GRADE', 'GRADE_3', 'Grade 3', 5),
  ('CHILD_LABORER_HIGHEST_GRADE', 'GRADE_4', 'Grade 4', 6),
  ('CHILD_LABORER_HIGHEST_GRADE', 'GRADE_5', 'Grade 5', 7),
  ('CHILD_LABORER_HIGHEST_GRADE', 'GRADE_6', 'Grade 6', 8),
  ('CHILD_LABORER_HIGHEST_GRADE', 'GRADE_7', 'Grade 7', 9),
  ('CHILD_LABORER_HIGHEST_GRADE', 'GRADE_8', 'Grade 8', 10),
  ('CHILD_LABORER_HIGHEST_GRADE', 'GRADE_9', 'Grade 9', 11),
  ('CHILD_LABORER_HIGHEST_GRADE', 'GRADE_10', 'Grade 10', 12),
  ('CHILD_LABORER_HIGHEST_GRADE', 'GRADE_11', 'Grade 11', 13),
  ('CHILD_LABORER_HIGHEST_GRADE', 'GRADE_12', 'Grade 12', 14),
  ('CHILD_LABORER_HIGHEST_GRADE', 'ALS', 'Alternative Learning System', 15),
  ('CHILD_LABORER_HIGHEST_GRADE', 'ALS_JUNIOR_HIGH', 'ALS Junior High', 16),
  ('CHILD_LABORER_HIGHEST_GRADE', 'SPED', 'Special Education (SPED)', 17),
  ('CHILD_LABORER_HIGHEST_GRADE', 'COLLEGE_LEVEL', 'College Level', 18),

  ('CHILD_LABORER_NATURE_OF_WORK', 'AGRICULTURAL_LABOR', 'Agricultural Labor', 1),
  ('CHILD_LABORER_NATURE_OF_WORK', 'ARTISANAL_FISHING', 'Artisanal Fishing', 2),
  ('CHILD_LABORER_NATURE_OF_WORK', 'CASUAL_LABOR', 'Casual Labor', 3),
  ('CHILD_LABORER_NATURE_OF_WORK', 'CONSTRUCTION_LABOR', 'Construction Labor', 4),
  ('CHILD_LABORER_NATURE_OF_WORK', 'COPRA_FARMING', 'Copra Farming', 5),
  ('CHILD_LABORER_NATURE_OF_WORK', 'COPRA_PROCESSING', 'Copra Processing', 6),
  ('CHILD_LABORER_NATURE_OF_WORK', 'GENERAL_HELPER', 'General Helper', 7),
  ('CHILD_LABORER_NATURE_OF_WORK', 'GENERAL_LABOR', 'General Labor', 8),
  ('CHILD_LABORER_NATURE_OF_WORK', 'NOT_REPORTED', 'Not Reported', 9),
  ('CHILD_LABORER_NATURE_OF_WORK', 'PART_TIME_HELPER', 'Part-Time Helper', 10),
  ('CHILD_LABORER_NATURE_OF_WORK', 'PART_TIME_LABOR', 'Part-Time Labor', 11),
  ('CHILD_LABORER_NATURE_OF_WORK', 'POULTRY_PROCESSING', 'Poultry Processing', 12),
  ('CHILD_LABORER_NATURE_OF_WORK', 'RETAIL_VENDING', 'Retail Vending', 13),
  ('CHILD_LABORER_NATURE_OF_WORK', 'STREET_FOOD_VENDING', 'Street Food Vending', 14),
  ('CHILD_LABORER_NATURE_OF_WORK', 'WATER_DELIVERY', 'Water Delivery', 15),
  ('CHILD_LABORER_NATURE_OF_WORK', 'WATER_HAULING', 'Water Hauling', 16),

  ('CHILD_LABORER_PARENT_GUARDIAN_OCCUPATION', 'AGRICULTURAL_LABORER_COPRA_WORKER', 'Agricultural Laborer and Copra Processing Worker', 1),
  ('CHILD_LABORER_PARENT_GUARDIAN_OCCUPATION', 'ARTISANAL_FISHER_TECHNICIAN', 'Artisanal Fisher and Technician', 2),
  ('CHILD_LABORER_PARENT_GUARDIAN_OCCUPATION', 'BHW_COPRA_WORKER', 'Barangay Health Worker and Copra Processing Worker', 3),
  ('CHILD_LABORER_PARENT_GUARDIAN_OCCUPATION', 'BHW_FARMER', 'Barangay Health Worker and Farmer', 4),
  ('CHILD_LABORER_PARENT_GUARDIAN_OCCUPATION', 'CASUAL_LABORER', 'Casual Laborer', 5),
  ('CHILD_LABORER_PARENT_GUARDIAN_OCCUPATION', 'CONSTRUCTION_WORKER', 'Construction Worker', 6),
  ('CHILD_LABORER_PARENT_GUARDIAN_OCCUPATION', 'COPRA_FARMER', 'Copra Farmer', 7),
  ('CHILD_LABORER_PARENT_GUARDIAN_OCCUPATION', 'COPRA_PROCESSING_WORKER', 'Copra Processing Worker', 8),
  ('CHILD_LABORER_PARENT_GUARDIAN_OCCUPATION', 'DOMESTIC_WORKER', 'Domestic Worker', 9),
  ('CHILD_LABORER_PARENT_GUARDIAN_OCCUPATION', 'FARMER', 'Farmer', 10),
  ('CHILD_LABORER_PARENT_GUARDIAN_OCCUPATION', 'FARMER_BARANGAY_SECRETARY', 'Farmer and Barangay Secretary', 11),
  ('CHILD_LABORER_PARENT_GUARDIAN_OCCUPATION', 'FARMER_COPRA_WORKER', 'Farmer and Copra Processing Worker', 12),
  ('CHILD_LABORER_PARENT_GUARDIAN_OCCUPATION', 'FARMER_DOMESTIC_WORKER', 'Farmer and Domestic Worker', 13),
  ('CHILD_LABORER_PARENT_GUARDIAN_OCCUPATION', 'FARMER_SC_PENSIONER', 'Farmer and Senior Citizen Pensioner', 14),
  ('CHILD_LABORER_PARENT_GUARDIAN_OCCUPATION', 'FISHER_DOMESTIC_WORKER', 'Fisher and Domestic Worker', 15),
  ('CHILD_LABORER_PARENT_GUARDIAN_OCCUPATION', 'FISHER_SC_PENSIONER', 'Fisher and Senior Citizen Pensioner', 16),
  ('CHILD_LABORER_PARENT_GUARDIAN_OCCUPATION', 'LABORER_LAUNDRY_WORKER', 'Laborer and Laundry Worker', 17),
  ('CHILD_LABORER_PARENT_GUARDIAN_OCCUPATION', 'ON_CALL_LABORER_SOLO_PARENT', 'On-Call Laborer (Solo Parent)', 18),
  ('CHILD_LABORER_PARENT_GUARDIAN_OCCUPATION', 'PENSIONER', 'Pensioner', 19),
  ('CHILD_LABORER_PARENT_GUARDIAN_OCCUPATION', 'RICE_FARMER_DOMESTIC_WORKER', 'Rice Farmer and Domestic Worker', 20),
  ('CHILD_LABORER_PARENT_GUARDIAN_OCCUPATION', 'SEAMSTRESS_COPRA_WORKER', 'Seamstress and Copra Processing Worker', 21),
  ('CHILD_LABORER_PARENT_GUARDIAN_OCCUPATION', 'STREET_FOOD_VENDOR_SOLO_PARENT', 'Street Food Vendor (Solo Parent)', 22)
ON CONFLICT (group_code, code) DO NOTHING;
