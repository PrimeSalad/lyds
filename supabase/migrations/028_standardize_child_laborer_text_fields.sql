-- Standardize imported child laborer text so reports group equivalent work
-- categories together and registry values use professional wording.
-- Blank remarks remain blank because they indicate records awaiting validation.

WITH standardized AS (
  SELECT
    source_record.id,
    source_record.barangay_id,
    source_record.filing_year,
    to_jsonb(source_record) AS before_data,
    CASE lower(regexp_replace(btrim(nature_of_work), '\s+', ' ', 'g'))
      WHEN 'artisanal fishing' THEN 'Artisanal Fishing'
      WHEN 'contruction (laborer)' THEN 'Construction Labor'
      WHEN 'construction (laborer)' THEN 'Construction Labor'
      WHEN 'copra farming' THEN 'Copra Farming'
      WHEN 'copra farming/ pag-aalaga ng kambing' THEN 'Copra Farming'
      WHEN 'farming (nagahakot ng palay)' THEN 'Agricultural Labor'
      WHEN 'helper' THEN 'General Helper'
      WHEN 'kasama sa paglukad' THEN 'Copra Processing'
      WHEN 'laborer' THEN 'General Labor'
      WHEN 'nagalabor sa tatay/ naupahan sa paglinis ng bahay, simbahan' THEN 'General Labor'
      WHEN 'nagapaupa' THEN 'Casual Labor'
      WHEN 'nagapaupa sa paghakot ng tubig' THEN 'Water Hauling'
      WHEN 'nagatinda' THEN 'Retail Vending'
      WHEN 'not specified in source workbook' THEN 'Not Reported'
      WHEN 'partime helper' THEN 'Part-Time Helper'
      WHEN 'partime helper sa poultry (nagakatay ng manok)' THEN 'Poultry Processing'
      WHEN 'partime helper sa water station (nasama sa pagdeliver/tagabuhat )' THEN 'Water Delivery'
      WHEN 'partime laborer' THEN 'Part-Time Labor'
      WHEN 'street food vending' THEN 'Street Food Vending'
      WHEN 'tanim' THEN 'Agricultural Labor'
      ELSE regexp_replace(btrim(nature_of_work), '\s+', ' ', 'g')
    END AS nature_of_work,
    CASE lower(regexp_replace(btrim(parent_guardian_occupation), '\s+', ' ', 'g'))
      WHEN 'artisanal fishing/ technician' THEN 'Artisanal Fisher and Technician'
      WHEN 'fisherman/sc pensioner' THEN 'Fisher and Senior Citizen Pensioner'
      WHEN 'fisherman/domestic helper' THEN 'Fisher and Domestic Worker'
      WHEN 'copra farming' THEN 'Copra Farmer'
      WHEN 'copra famer' THEN 'Copra Farmer'
      WHEN 'copra farmer' THEN 'Copra Farmer'
      WHEN 'farmer' THEN 'Farmer'
      WHEN 'farmers' THEN 'Farmer'
      WHEN 'kasambahay' THEN 'Domestic Worker'
      WHEN 'farmer/ nagalukad' THEN 'Farmer and Copra Processing Worker'
      WHEN 'maglukad/farmer' THEN 'Farmer and Copra Processing Worker'
      WHEN 'bhw/ farmer' THEN 'Barangay Health Worker and Farmer'
      WHEN 'farmer/ brgy. sec.' THEN 'Farmer and Barangay Secretary'
      WHEN 'nagapaupa' THEN 'Casual Laborer'
      WHEN 'bhw/ nagalukad' THEN 'Barangay Health Worker and Copra Processing Worker'
      WHEN 'nagatanim/ nagalukad' THEN 'Agricultural Laborer and Copra Processing Worker'
      WHEN 'nagalukad' THEN 'Copra Processing Worker'
      WHEN 'farmer/ kasambahay' THEN 'Farmer and Domestic Worker'
      WHEN 'farmer/ househelper' THEN 'Farmer and Domestic Worker'
      WHEN 'farmer/sc pensioner' THEN 'Farmer and Senior Citizen Pensioner'
      WHEN 'rice farmer/ househelper' THEN 'Rice Farmer and Domestic Worker'
      WHEN 'construction worker' THEN 'Construction Worker'
      WHEN 'construction' THEN 'Construction Worker'
      WHEN 'on call laborer/ solo p' THEN 'On-Call Laborer (Solo Parent)'
      WHEN 'mananahi/ lukad' THEN 'Seamstress and Copra Processing Worker'
      WHEN 'pensioner' THEN 'Pensioner'
      WHEN 'laborer/ laundery women' THEN 'Laborer and Laundry Worker'
      WHEN 'street food vending /solo parent' THEN 'Street Food Vendor (Solo Parent)'
      ELSE NULLIF(regexp_replace(btrim(parent_guardian_occupation), '\s+', ' ', 'g'), '')
    END AS parent_guardian_occupation,
    CASE lower(regexp_replace(btrim(remarks), '\s+', ' ', 'g'))
      WHEN 'kasali sa 4ps ang kanilang family'
        THEN 'The household is a beneficiary of the Pantawid Pamilyang Pilipino Program (4Ps).'
      WHEN 'kasali ang family sa 4ps'
        THEN 'The household is a beneficiary of the Pantawid Pamilyang Pilipino Program (4Ps).'
      WHEN 'kasali sa 4ps'
        THEN 'The household is a beneficiary of the Pantawid Pamilyang Pilipino Program (4Ps).'
      WHEN 'naoperahan ang mata ng lolo. napadalhan kahit papano ng nanay'
        THEN 'The child''s grandfather underwent eye surgery, and the mother provides occasional financial support.'
      WHEN 'ang tatay ay nakikigamit lang ng bangka ng iba dahil nasira ang sarili nilang bangka'
        THEN 'The father currently borrows another fisher''s boat because the family''s boat is damaged.'
      WHEN 'may sarili ng pamilya (may isang anak)'
        THEN 'The individual has a family and one child.'
      WHEN 'yellow- kasama na dati'
        THEN 'Previously included in the program and classified under the Yellow category.'
      WHEN 'lolo at lola na ang nag-aalaga simula pagkababy'
        THEN 'The child has been under the care of the grandparents since infancy.'
      WHEN 'separated ang parents/ hindi kasali sa 4ps'
        THEN 'The parents are separated, and the household is not a 4Ps beneficiary.'
      WHEN 'hindi kasali sa 4ps'
        THEN 'The household is not a beneficiary of the Pantawid Pamilyang Pilipino Program (4Ps).'
      WHEN 'hiwalay ang parents/may bagong partner ang nanay/ isa mga kapatid ay kasali sa 4ps'
        THEN 'The parents are separated; the mother has a new partner, and one sibling is a 4Ps beneficiary.'
      ELSE NULLIF(regexp_replace(btrim(remarks), '\s+', ' ', 'g'), '')
    END AS remarks
  FROM public.child_laborer_records AS source_record
),
updated AS (
  UPDATE public.child_laborer_records AS record
  SET
    nature_of_work = standardized.nature_of_work,
    parent_guardian_occupation = standardized.parent_guardian_occupation,
    remarks = standardized.remarks,
    version = record.version + 1
  FROM standardized
  WHERE record.id = standardized.id
    AND (
      record.nature_of_work IS DISTINCT FROM standardized.nature_of_work
      OR record.parent_guardian_occupation IS DISTINCT FROM standardized.parent_guardian_occupation
      OR record.remarks IS DISTINCT FROM standardized.remarks
    )
  RETURNING
    record.id,
    record.barangay_id,
    record.filing_year,
    standardized.before_data,
    to_jsonb(record) AS after_data
)
INSERT INTO public.audit_logs (
  actor_profile_id,
  actor_role,
  action,
  entity_type,
  entity_id,
  barangay_id,
  before_data,
  after_data,
  metadata
)
SELECT
  NULL,
  NULL,
  'STANDARDIZE_TEXT_FIELDS',
  'CHILD_LABORER_RECORD',
  updated.id,
  updated.barangay_id,
  updated.before_data,
  updated.after_data,
  jsonb_build_object(
    'source', 'migration_028',
    'filing_year', updated.filing_year,
    'fields', jsonb_build_array('nature_of_work', 'parent_guardian_occupation', 'remarks')
  )
FROM updated;
