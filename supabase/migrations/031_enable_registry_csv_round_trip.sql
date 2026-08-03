-- Allow validated Child Laborer CSV batches to commit atomically, with the same
-- duplicate protection and source-batch lineage used by Youth Profile imports.

ALTER TABLE public.child_laborer_records
  ADD COLUMN IF NOT EXISTS submission_batch_id UUID NULL
    REFERENCES public.import_batches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_child_laborers_submission_batch
  ON public.child_laborer_records (submission_batch_id)
  WHERE submission_batch_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.commit_child_laborer_import_batch(
  p_batch_id UUID,
  p_actor_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_batch public.import_batches%ROWTYPE;
  target_filing_year INTEGER;
  imported_count INTEGER := 0;
  valid_count INTEGER := 0;
  invalid_count INTEGER := 0;
  duplicate_count INTEGER := 0;
  duplicate_message CONSTANT TEXT := 'A child laborer with the same name and birth date already exists in this barangay and filing year.';
BEGIN
  SELECT *
  INTO target_batch
  FROM public.import_batches
  WHERE id = p_batch_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Import batch not found.';
  END IF;

  IF target_batch.status <> 'VALIDATED'::public.import_status THEN
    RAISE EXCEPTION 'Only a validated import batch can be committed.';
  END IF;

  SELECT category.filing_year
  INTO target_filing_year
  FROM public.categories category
  WHERE category.id = target_batch.category_id
    AND category.record_type = 'CHILD_LABORER'
    AND category.deleted_at IS NULL;

  IF target_filing_year IS NULL THEN
    RAISE EXCEPTION 'Import batch does not target a Child Laborer category.';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended('CHILD_LABORER:' || target_filing_year::TEXT || ':' || target_batch.barangay_id::TEXT, 0)
  );

  WITH duplicate_matches AS (
    SELECT
      row_result.id AS row_id,
      (
        SELECT record.id
        FROM public.child_laborer_records record
        WHERE record.filing_year = target_filing_year
          AND record.barangay_id = target_batch.barangay_id
          AND record.record_status <> 'ARCHIVED'
          AND lower(regexp_replace(btrim(record.first_name), '[^[:alnum:]]+', ' ', 'g')) =
            lower(regexp_replace(btrim(row_result.normalized_data->>'first_name'), '[^[:alnum:]]+', ' ', 'g'))
          AND lower(regexp_replace(btrim(record.last_name), '[^[:alnum:]]+', ' ', 'g')) =
            lower(regexp_replace(btrim(row_result.normalized_data->>'last_name'), '[^[:alnum:]]+', ' ', 'g'))
          AND record.birth_date = NULLIF(row_result.normalized_data->>'birth_date', '')::DATE
        ORDER BY record.created_at, record.id
        LIMIT 1
      ) AS duplicate_id
    FROM public.import_row_results row_result
    WHERE COALESCE(row_result.batch_id, row_result.import_batch_id) = p_batch_id
      AND row_result.is_valid = TRUE
  )
  UPDATE public.import_row_results row_result
  SET
    is_valid = FALSE,
    is_duplicate = TRUE,
    duplicate_match_id = duplicate_matches.duplicate_id,
    validation_errors = CASE
      WHEN duplicate_message = ANY(COALESCE(row_result.validation_errors, ARRAY[]::TEXT[]))
        THEN row_result.validation_errors
      ELSE array_append(COALESCE(row_result.validation_errors, ARRAY[]::TEXT[]), duplicate_message)
    END
  FROM duplicate_matches
  WHERE row_result.id = duplicate_matches.row_id
    AND duplicate_matches.duplicate_id IS NOT NULL;

  SELECT
    count(*) FILTER (WHERE row_result.is_valid),
    count(*) FILTER (WHERE NOT row_result.is_valid AND NOT row_result.is_duplicate),
    count(*) FILTER (WHERE row_result.is_duplicate)
  INTO valid_count, invalid_count, duplicate_count
  FROM public.import_row_results row_result
  WHERE COALESCE(row_result.batch_id, row_result.import_batch_id) = p_batch_id;

  UPDATE public.import_batches
  SET
    status = 'COMMITTING'::public.import_status,
    valid_rows = valid_count,
    invalid_rows = invalid_count,
    duplicate_rows = duplicate_count,
    updated_at = NOW()
  WHERE id = p_batch_id;

  INSERT INTO public.child_laborer_records (
    category_id,
    filing_year,
    barangay_id,
    submission_batch_id,
    first_name,
    middle_name,
    last_name,
    birth_date,
    gender,
    attending_school,
    highest_grade_completed,
    nature_of_work,
    father_name,
    mother_name,
    guardian_name,
    parent_guardian_occupation,
    record_status,
    remarks,
    custom_values,
    created_by,
    updated_by
  )
  SELECT
    target_batch.category_id,
    target_filing_year,
    target_batch.barangay_id,
    p_batch_id,
    btrim(row_result.normalized_data->>'first_name'),
    NULLIF(btrim(row_result.normalized_data->>'middle_name'), ''),
    btrim(row_result.normalized_data->>'last_name'),
    (row_result.normalized_data->>'birth_date')::DATE,
    row_result.normalized_data->>'gender',
    (row_result.normalized_data->>'attending_school')::BOOLEAN,
    NULLIF(btrim(row_result.normalized_data->>'highest_grade_completed'), ''),
    btrim(row_result.normalized_data->>'nature_of_work'),
    NULLIF(btrim(row_result.normalized_data->>'father_name'), ''),
    NULLIF(btrim(row_result.normalized_data->>'mother_name'), ''),
    NULLIF(btrim(row_result.normalized_data->>'guardian_name'), ''),
    NULLIF(btrim(row_result.normalized_data->>'parent_guardian_occupation'), ''),
    COALESCE(NULLIF(row_result.normalized_data->>'record_status', ''), 'IDENTIFIED'),
    NULLIF(btrim(row_result.normalized_data->>'remarks'), ''),
    COALESCE(row_result.normalized_data->'custom_values', '{}'::JSONB),
    p_actor_id,
    p_actor_id
  FROM public.import_row_results row_result
  WHERE COALESCE(row_result.batch_id, row_result.import_batch_id) = p_batch_id
    AND row_result.is_valid = TRUE
    AND row_result.is_duplicate = FALSE
  ORDER BY row_result.row_number;

  GET DIAGNOSTICS imported_count = ROW_COUNT;

  UPDATE public.import_batches
  SET
    status = 'COMMITTED'::public.import_status,
    valid_rows = imported_count,
    invalid_rows = invalid_count,
    duplicate_rows = duplicate_count,
    error_message = NULL,
    updated_at = NOW()
  WHERE id = p_batch_id;

  RETURN jsonb_build_object(
    'batch_id', p_batch_id,
    'imported_count', imported_count,
    'invalid_rows', invalid_count,
    'duplicate_rows', duplicate_count,
    'status', 'COMMITTED'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.commit_child_laborer_import_batch(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.commit_child_laborer_import_batch(UUID, UUID) TO service_role;
