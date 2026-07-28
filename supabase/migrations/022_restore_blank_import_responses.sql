-- Restore historical unanswered values only when one committed profile has one
-- exact source-row match. Ambiguous or unmatched imports remain untouched.

-- This is a source-data correction, not a user edit. Preserve the original
-- activity timestamps and avoid generating thousands of misleading audit rows.
DO $$
DECLARE
  trigger_name TEXT;
BEGIN
  FOR trigger_name IN
    SELECT pg_trigger.tgname
    FROM pg_trigger
    WHERE pg_trigger.tgrelid = 'public.youth_profiles'::regclass
      AND pg_trigger.tgname IN (
        'set_youth_profiles_updated_at',
        'youth_profiles_set_updated_at',
        'audit_youth_profile_changes'
      )
  LOOP
    EXECUTE format(
      'ALTER TABLE public.youth_profiles DISABLE TRIGGER %I',
      trigger_name
    );
  END LOOP;
END;
$$;

WITH candidate_rows AS (
  SELECT
    profile.id AS profile_id,
    row_result.id AS import_row_id,
    row_result.raw_data,
    count(*) OVER (PARTITION BY profile.id) AS match_count
  FROM public.youth_profiles profile
  JOIN public.import_row_results row_result
    ON COALESCE(row_result.batch_id, row_result.import_batch_id) = profile.submission_batch_id
   AND row_result.normalized_data->>'display_name' = profile.display_name
   AND row_result.is_valid = TRUE
   AND row_result.is_duplicate = FALSE
  WHERE profile.submission_batch_id IS NOT NULL
), source_answers AS (
  SELECT
    candidate.profile_id,
    candidate.import_row_id,
    EXISTS (
      SELECT 1
      FROM jsonb_each_text(COALESCE(candidate.raw_data, '{}'::JSONB)) AS raw(key, value)
      WHERE regexp_replace(
        btrim(regexp_replace(lower(raw.key), '[^a-z0-9]+', ' ', 'g')),
        '[[:space:]]+', ' ', 'g'
      ) IN ('registered voter', 'registered voter y n', 'registered sk voter')
        AND btrim(raw.value) <> ''
    ) AS has_voter_answer,
    EXISTS (
      SELECT 1
      FROM jsonb_each_text(COALESCE(candidate.raw_data, '{}'::JSONB)) AS raw(key, value)
      WHERE regexp_replace(
        btrim(regexp_replace(lower(raw.key), '[^a-z0-9]+', ' ', 'g')),
        '[[:space:]]+', ' ', 'g'
      ) IN ('registered voter', 'registered voter y n', 'registered national voter')
        AND btrim(raw.value) <> ''
    ) AS has_national_voter_answer,
    EXISTS (
      SELECT 1
      FROM jsonb_each_text(COALESCE(candidate.raw_data, '{}'::JSONB)) AS raw(key, value)
      WHERE regexp_replace(
        btrim(regexp_replace(lower(raw.key), '[^a-z0-9]+', ' ', 'g')),
        '[[:space:]]+', ' ', 'g'
      ) IN ('voted last election', 'voted last election y n')
        AND btrim(raw.value) <> ''
    ) AS has_election_answer,
    EXISTS (
      SELECT 1
      FROM jsonb_each_text(COALESCE(candidate.raw_data, '{}'::JSONB)) AS raw(key, value)
      WHERE regexp_replace(
        btrim(regexp_replace(lower(raw.key), '[^a-z0-9]+', ' ', 'g')),
        '[[:space:]]+', ' ', 'g'
      ) IN ('attended kk assembly', 'attended kk assembly if yes how many times')
        AND btrim(raw.value) <> ''
    ) AS has_assembly_answer
  FROM candidate_rows candidate
  WHERE candidate.match_count = 1
)
UPDATE public.youth_profiles profile
SET
  is_registered_voter = CASE
    WHEN source.has_voter_answer THEN profile.is_registered_voter ELSE NULL
  END,
  is_registered_sk_voter = CASE
    WHEN source.has_voter_answer THEN profile.is_registered_sk_voter ELSE NULL
  END,
  is_registered_national_voter = CASE
    WHEN source.has_national_voter_answer THEN profile.is_registered_national_voter ELSE NULL
  END,
  voted_last_election = CASE
    WHEN source.has_election_answer THEN profile.voted_last_election ELSE NULL
  END,
  attended_kk_assembly = CASE
    WHEN source.has_assembly_answer THEN profile.attended_kk_assembly ELSE NULL
  END
FROM source_answers source
WHERE profile.id = source.profile_id
  AND (
    NOT source.has_voter_answer
    OR NOT source.has_national_voter_answer
    OR NOT source.has_election_answer
    OR NOT source.has_assembly_answer
  );

DO $$
DECLARE
  trigger_name TEXT;
BEGIN
  FOR trigger_name IN
    SELECT pg_trigger.tgname
    FROM pg_trigger
    WHERE pg_trigger.tgrelid = 'public.youth_profiles'::regclass
      AND pg_trigger.tgname IN (
        'set_youth_profiles_updated_at',
        'youth_profiles_set_updated_at',
        'audit_youth_profile_changes'
      )
  LOOP
    EXECUTE format(
      'ALTER TABLE public.youth_profiles ENABLE TRIGGER %I',
      trigger_name
    );
  END LOOP;
END;
$$;

WITH candidate_rows AS (
  SELECT
    profile.id AS profile_id,
    row_result.id AS import_row_id,
    row_result.raw_data,
    count(*) OVER (PARTITION BY profile.id) AS match_count
  FROM public.youth_profiles profile
  JOIN public.import_row_results row_result
    ON COALESCE(row_result.batch_id, row_result.import_batch_id) = profile.submission_batch_id
   AND row_result.normalized_data->>'display_name' = profile.display_name
   AND row_result.is_valid = TRUE
   AND row_result.is_duplicate = FALSE
  WHERE profile.submission_batch_id IS NOT NULL
), source_answers AS (
  SELECT
    candidate.import_row_id,
    EXISTS (
      SELECT 1
      FROM jsonb_each_text(COALESCE(candidate.raw_data, '{}'::JSONB)) AS raw(key, value)
      WHERE regexp_replace(
        btrim(regexp_replace(lower(raw.key), '[^a-z0-9]+', ' ', 'g')),
        '[[:space:]]+', ' ', 'g'
      ) IN ('registered voter', 'registered voter y n', 'registered sk voter')
        AND btrim(raw.value) <> ''
    ) AS has_voter_answer,
    EXISTS (
      SELECT 1
      FROM jsonb_each_text(COALESCE(candidate.raw_data, '{}'::JSONB)) AS raw(key, value)
      WHERE regexp_replace(
        btrim(regexp_replace(lower(raw.key), '[^a-z0-9]+', ' ', 'g')),
        '[[:space:]]+', ' ', 'g'
      ) IN ('registered voter', 'registered voter y n', 'registered national voter')
        AND btrim(raw.value) <> ''
    ) AS has_national_voter_answer,
    EXISTS (
      SELECT 1
      FROM jsonb_each_text(COALESCE(candidate.raw_data, '{}'::JSONB)) AS raw(key, value)
      WHERE regexp_replace(
        btrim(regexp_replace(lower(raw.key), '[^a-z0-9]+', ' ', 'g')),
        '[[:space:]]+', ' ', 'g'
      ) IN ('voted last election', 'voted last election y n')
        AND btrim(raw.value) <> ''
    ) AS has_election_answer,
    EXISTS (
      SELECT 1
      FROM jsonb_each_text(COALESCE(candidate.raw_data, '{}'::JSONB)) AS raw(key, value)
      WHERE regexp_replace(
        btrim(regexp_replace(lower(raw.key), '[^a-z0-9]+', ' ', 'g')),
        '[[:space:]]+', ' ', 'g'
      ) IN ('attended kk assembly', 'attended kk assembly if yes how many times')
        AND btrim(raw.value) <> ''
    ) AS has_assembly_answer
  FROM candidate_rows candidate
  WHERE candidate.match_count = 1
)
UPDATE public.import_row_results row_result
SET normalized_data = COALESCE(row_result.normalized_data, '{}'::JSONB)
  || CASE WHEN source.has_voter_answer THEN '{}'::JSONB ELSE jsonb_build_object(
    'is_registered_voter', NULL,
    'is_registered_sk_voter', NULL
  ) END
  || CASE WHEN source.has_national_voter_answer THEN '{}'::JSONB ELSE jsonb_build_object(
    'is_registered_national_voter', NULL
  ) END
  || CASE WHEN source.has_election_answer THEN '{}'::JSONB ELSE jsonb_build_object(
    'voted_last_election', NULL
  ) END
  || CASE WHEN source.has_assembly_answer THEN '{}'::JSONB ELSE jsonb_build_object(
    'attended_kk_assembly', NULL
  ) END
FROM source_answers source
WHERE row_result.id = source.import_row_id
  AND (
    NOT source.has_voter_answer
    OR NOT source.has_national_voter_answer
    OR NOT source.has_election_answer
    OR NOT source.has_assembly_answer
  );
