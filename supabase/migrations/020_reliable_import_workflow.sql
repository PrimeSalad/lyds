-- Make spreadsheet imports duplicate-aware, observable, and atomic.

ALTER TABLE public.import_batches
  ADD COLUMN IF NOT EXISTS duplicate_rows INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.import_row_results
  ADD COLUMN IF NOT EXISTS is_duplicate BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_import_rows_batch_validity
  ON public.import_row_results (batch_id, is_valid, is_duplicate, row_number);

CREATE OR REPLACE FUNCTION public.commit_youth_import_batch(
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
  imported_count INTEGER := 0;
  valid_count INTEGER := 0;
  invalid_count INTEGER := 0;
  duplicate_count INTEGER := 0;
  duplicate_message CONSTANT TEXT := 'Duplicate name already exists in this barangay and filing year.';
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

  -- Serialize commits for one annual barangay dataset so concurrent imports
  -- cannot both pass the same duplicate check.
  PERFORM pg_advisory_xact_lock(
    hashtextextended(target_batch.category_id::TEXT || ':' || target_batch.barangay_id::TEXT, 0)
  );

  WITH duplicate_matches AS (
    SELECT
      row_result.id AS row_id,
      (
        SELECT profile.id
        FROM public.youth_profiles profile
        WHERE profile.category_id = target_batch.category_id
          AND profile.barangay_id = target_batch.barangay_id
          AND profile.deleted_at IS NULL
          AND lower(regexp_replace(btrim(profile.display_name), '[^[:alnum:]]+', ' ', 'g')) =
            lower(regexp_replace(btrim(row_result.normalized_data->>'display_name'), '[^[:alnum:]]+', ' ', 'g'))
        ORDER BY profile.created_at, profile.id
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

  INSERT INTO public.youth_profiles (
    category_id,
    barangay_id,
    submission_batch_id,
    display_name,
    first_name,
    middle_name,
    last_name,
    suffix,
    ext_name,
    birth_date,
    age_at_submission,
    sex_assigned_at_birth_id,
    sex_id,
    civil_status_id,
    youth_classification_id,
    youth_age_group_id,
    educational_attainment_id,
    work_status_id,
    email,
    contact_number,
    purok,
    is_registered_voter,
    is_registered_sk_voter,
    is_registered_national_voter,
    voted_last_election,
    attended_kk_assembly,
    kk_assembly_count,
    custom_values,
    status,
    youth_profile_status,
    created_by,
    updated_by,
    submitted_by,
    submitted_at
  )
  SELECT
    target_batch.category_id,
    target_batch.barangay_id,
    p_batch_id,
    row_result.normalized_data->>'display_name',
    NULLIF(row_result.normalized_data->>'first_name', ''),
    NULLIF(row_result.normalized_data->>'middle_name', ''),
    NULLIF(row_result.normalized_data->>'last_name', ''),
    NULLIF(row_result.normalized_data->>'suffix', ''),
    NULLIF(row_result.normalized_data->>'suffix', ''),
    NULLIF(row_result.normalized_data->>'birth_date', '')::DATE,
    NULLIF(row_result.normalized_data->>'age_at_submission', '')::INTEGER,
    NULLIF(row_result.normalized_data->>'sex_assigned_at_birth_id', '')::UUID,
    NULLIF(row_result.normalized_data->>'sex_assigned_at_birth_id', '')::UUID,
    NULLIF(row_result.normalized_data->>'civil_status_id', '')::UUID,
    NULLIF(row_result.normalized_data->>'youth_classification_id', '')::UUID,
    NULLIF(row_result.normalized_data->>'youth_age_group_id', '')::UUID,
    NULLIF(row_result.normalized_data->>'educational_attainment_id', '')::UUID,
    NULLIF(row_result.normalized_data->>'work_status_id', '')::UUID,
    NULLIF(row_result.normalized_data->>'email', ''),
    NULLIF(row_result.normalized_data->>'contact_number', ''),
    NULLIF(row_result.normalized_data->>'purok', ''),
    COALESCE(NULLIF(row_result.normalized_data->>'is_registered_voter', '')::BOOLEAN, FALSE),
    COALESCE(NULLIF(row_result.normalized_data->>'is_registered_sk_voter', '')::BOOLEAN, FALSE),
    COALESCE(NULLIF(row_result.normalized_data->>'is_registered_national_voter', '')::BOOLEAN, FALSE),
    COALESCE(NULLIF(row_result.normalized_data->>'voted_last_election', '')::BOOLEAN, FALSE),
    COALESCE(NULLIF(row_result.normalized_data->>'attended_kk_assembly', '')::BOOLEAN, FALSE),
    COALESCE(NULLIF(row_result.normalized_data->>'kk_assembly_count', '')::INTEGER, 0),
    COALESCE(row_result.normalized_data->'custom_values', '{}'::JSONB),
    'SUBMITTED'::public.record_status,
    'SUBMITTED'::public.record_status,
    p_actor_id,
    p_actor_id,
    p_actor_id,
    NOW()
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

REVOKE ALL ON FUNCTION public.commit_youth_import_batch(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.commit_youth_import_batch(UUID, UUID) TO service_role;
