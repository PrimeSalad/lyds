-- Preserve unanswered spreadsheet fields as NULL so reports can distinguish
-- missing responses from an explicit "No" answer.

ALTER TABLE public.youth_profiles
  ALTER COLUMN is_registered_voter DROP DEFAULT,
  ALTER COLUMN is_registered_sk_voter DROP DEFAULT,
  ALTER COLUMN is_registered_national_voter DROP DEFAULT,
  ALTER COLUMN voted_last_election DROP NOT NULL,
  ALTER COLUMN voted_last_election DROP DEFAULT,
  ALTER COLUMN attended_kk_assembly DROP NOT NULL,
  ALTER COLUMN attended_kk_assembly DROP DEFAULT;

CREATE OR REPLACE FUNCTION public.sync_youth_profile_compat()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.status = COALESCE(NEW.status, NEW.youth_profile_status, 'DRAFT'::public.record_status);
    NEW.youth_profile_status = NEW.status;
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.youth_profile_status = NEW.status;
  ELSIF NEW.youth_profile_status IS DISTINCT FROM OLD.youth_profile_status THEN
    NEW.status = NEW.youth_profile_status;
  END IF;

  IF TG_OP = 'INSERT' OR NEW.suffix IS DISTINCT FROM OLD.suffix THEN
    NEW.ext_name = NEW.suffix;
  ELSIF NEW.ext_name IS DISTINCT FROM OLD.ext_name THEN
    NEW.suffix = NEW.ext_name;
  END IF;

  IF TG_OP = 'INSERT' OR NEW.sex_assigned_at_birth_id IS DISTINCT FROM OLD.sex_assigned_at_birth_id THEN
    NEW.sex_id = NEW.sex_assigned_at_birth_id;
  ELSIF NEW.sex_id IS DISTINCT FROM OLD.sex_id THEN
    NEW.sex_assigned_at_birth_id = NEW.sex_id;
  END IF;

  IF NEW.is_registered_voter IS NULL AND NEW.is_registered_sk_voter IS NOT NULL THEN
    NEW.is_registered_voter = NEW.is_registered_sk_voter;
  ELSIF NEW.is_registered_sk_voter IS NULL AND NEW.is_registered_voter IS NOT NULL THEN
    NEW.is_registered_sk_voter = NEW.is_registered_voter;
  END IF;

  IF NEW.is_registered_national_voter IS NULL AND NEW.voted_last_election IS NOT NULL THEN
    NEW.is_registered_national_voter = NEW.voted_last_election;
  END IF;

  RETURN NEW;
END;
$$;

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
    NULLIF(row_result.normalized_data->>'is_registered_voter', '')::BOOLEAN,
    NULLIF(row_result.normalized_data->>'is_registered_sk_voter', '')::BOOLEAN,
    NULLIF(row_result.normalized_data->>'is_registered_national_voter', '')::BOOLEAN,
    NULLIF(row_result.normalized_data->>'voted_last_election', '')::BOOLEAN,
    NULLIF(row_result.normalized_data->>'attended_kk_assembly', '')::BOOLEAN,
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
