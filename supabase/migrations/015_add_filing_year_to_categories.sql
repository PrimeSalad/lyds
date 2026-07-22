-- Add filing_year to categories for year-based organization of youth records.

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS filing_year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM now())::int;

CREATE INDEX IF NOT EXISTS idx_categories_filing_year ON public.categories(filing_year)
  WHERE deleted_at IS NULL;
