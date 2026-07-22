-- Seed official Boac, Marinduque barangays from PSA PSGC municipality 1704001000.
-- Source: Philippine Statistics Authority PSGC, 61 barangays as of 31 July 2025.

ALTER TABLE public.barangays
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

DELETE FROM public.barangays
WHERE code = 'DEFAULT'
  AND name = 'Default Barangay'
  AND NOT EXISTS (
    SELECT 1 FROM public.account_barangay_assignments a WHERE a.barangay_id = public.barangays.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.youth_profiles y WHERE y.barangay_id = public.barangays.id
  );

INSERT INTO public.barangays (code, name, municipality, province, is_active, deleted_at) VALUES
  ('174001001', 'Agot', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001002', 'Agumaymayan', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001003', 'Amoingon', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001004', 'Apitong', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001005', 'Balagasan', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001006', 'Balaring', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001007', 'Balimbing', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001008', 'Balogo', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001009', 'Bangbangalon', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001010', 'Bamban', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001011', 'Bantad', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001012', 'Bantay', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001013', 'Bayuti', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001014', 'Binunga', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001015', 'Boi', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001016', 'Boton', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001017', 'Buliasnin', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001018', 'Bunganay', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001019', 'Maligaya', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001020', 'Caganhao', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001021', 'Canat', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001022', 'Catubugan', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001023', 'Cawit', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001024', 'Daig', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001025', 'Daypay', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001026', 'Duyay', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001027', 'Ihatub', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001028', 'Isok II Pob.', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001029', 'Hinapulan', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001030', 'Laylay', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001031', 'Lupac', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001032', 'Mahinhin', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001033', 'Mainit', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001034', 'Malbog', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001035', 'Malusak', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001036', 'Mansiwat', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001037', 'Mataas Na Bayan', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001038', 'Maybo', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001039', 'Mercado', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001040', 'Murallon', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001041', 'Ogbac', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001042', 'Pawa', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001043', 'Pili', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001044', 'Poctoy', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001045', 'Poras', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001046', 'Puting Buhangin', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001047', 'Puyog', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001048', 'Sabong', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001049', 'San Miguel', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001050', 'Santol', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001051', 'Sawi', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001052', 'Tabi', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001053', 'Tabigue', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001054', 'Tagwak', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001055', 'Tambunan', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001056', 'Tampus', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001057', 'Tanza', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001058', 'Tugos', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001059', 'Tumagabok', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001060', 'Tumapon', 'Boac', 'Marinduque', TRUE, NULL),
  ('174001061', 'Isok I', 'Boac', 'Marinduque', TRUE, NULL)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  municipality = EXCLUDED.municipality,
  province = EXCLUDED.province,
  is_active = TRUE,
  deleted_at = NULL,
  updated_at = NOW();
