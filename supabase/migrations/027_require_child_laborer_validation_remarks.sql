-- Validation must be supported by a recorded field-validation remark.
-- Correct legacy rows before enforcing the invariant at the database boundary.

UPDATE public.child_laborer_records
SET record_status = 'IDENTIFIED',
    version = version + 1
WHERE record_status = 'VALIDATED'
  AND NULLIF(btrim(remarks), '') IS NULL;

ALTER TABLE public.child_laborer_records
  ADD CONSTRAINT child_laborer_validated_requires_remarks
  CHECK (
    record_status <> 'VALIDATED'
    OR NULLIF(btrim(remarks), '') IS NOT NULL
  );

COMMENT ON CONSTRAINT child_laborer_validated_requires_remarks
  ON public.child_laborer_records
  IS 'VALIDATED records require nonblank remarks documenting field validation.';
