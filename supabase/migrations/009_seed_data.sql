-- Seed Data

-- ============================================
-- REFERENCE GROUPS
-- ============================================

INSERT INTO reference_groups (code, name, description) VALUES
  ('SEX_ASSIGNED_AT_BIRTH', 'Sex Assigned at Birth', 'Biological sex at birth'),
  ('CIVIL_STATUS', 'Civil Status', 'Legal civil status'),
  ('YOUTH_CLASSIFICATION', 'Youth Classification', 'Youth classification category'),
  ('YOUTH_AGE_GROUP', 'Youth Age Group', 'Age group bracket'),
  ('EDUCATIONAL_ATTAINMENT', 'Highest Educational Attainment', 'Highest level of education completed'),
  ('WORK_STATUS', 'Work Status', 'Current employment status');

-- ============================================
-- REFERENCE OPTIONS
-- ============================================

-- Sex Assigned at Birth
INSERT INTO reference_options (group_code, code, label, sort_order) VALUES
  ('SEX_ASSIGNED_AT_BIRTH', 'MALE', 'Male', 1),
  ('SEX_ASSIGNED_AT_BIRTH', 'FEMALE', 'Female', 2);

-- Civil Status
INSERT INTO reference_options (group_code, code, label, sort_order) VALUES
  ('CIVIL_STATUS', 'SINGLE', 'Single', 1),
  ('CIVIL_STATUS', 'MARRIED', 'Married', 2),
  ('CIVIL_STATUS', 'WIDOWED', 'Widowed', 3),
  ('CIVIL_STATUS', 'SEPARATED', 'Separated', 4),
  ('CIVIL_STATUS', 'DIVORCED', 'Divorced', 5);

-- Youth Classification
INSERT INTO reference_options (group_code, code, label, sort_order) VALUES
  ('YOUTH_CLASSIFICATION', 'IN_SCHOOL', 'In-School Youth', 1),
  ('YOUTH_CLASSIFICATION', 'OUT_OF_SCHOOL', 'Out-of-School Youth', 2),
  ('YOUTH_CLASSIFICATION', 'YOUTH_WHO_WORK', 'Youth Who Work', 3),
  ('YOUTH_CLASSIFICATION', 'YOUTH_WITH_DISABILITY', 'Youth with Disability', 4),
  ('YOUTH_CLASSIFICATION', 'YOUTH_IN_CONFLICT', 'Youth in Conflict with the Law', 5),
  ('YOUTH_CLASSIFICATION', 'INDIGENOUS_YOUTH', 'Indigenous Youth', 6);

-- Youth Age Group
INSERT INTO reference_options (group_code, code, label, sort_order, metadata) VALUES
  ('YOUTH_AGE_GROUP', 'CHILD_YOUTH', 'Child Youth (15-17)', 1, '{"minimum_age": 15, "maximum_age": 17}'),
  ('YOUTH_AGE_GROUP', 'CORE_YOUTH', 'Core Youth (18-24)', 2, '{"minimum_age": 18, "maximum_age": 24}'),
  ('YOUTH_AGE_GROUP', 'YOUNG_ADULT', 'Young Adult (25-30)', 3, '{"minimum_age": 25, "maximum_age": 30}');

-- Educational Attainment
INSERT INTO reference_options (group_code, code, label, sort_order) VALUES
  ('EDUCATIONAL_ATTAINMENT', 'NONE', 'None', 1),
  ('EDUCATIONAL_ATTAINMENT', 'ELEMENTARY', 'Elementary Level', 2),
  ('EDUCATIONAL_ATTAINMENT', 'ELEMENTARY_GRAD', 'Elementary Graduate', 3),
  ('EDUCATIONAL_ATTAINMENT', 'HIGH_SCHOOL', 'High School Level', 4),
  ('EDUCATIONAL_ATTAINMENT', 'HIGH_SCHOOL_GRAD', 'High School Graduate', 5),
  ('EDUCATIONAL_ATTAINMENT', 'SENIOR_HIGH', 'Senior High School Level', 6),
  ('EDUCATIONAL_ATTAINMENT', 'SENIOR_HIGH_GRAD', 'Senior High School Graduate', 7),
  ('EDUCATIONAL_ATTAINMENT', 'COLLEGE', 'College Level', 8),
  ('EDUCATIONAL_ATTAINMENT', 'COLLEGE_GRAD', 'College Graduate', 9),
  ('EDUCATIONAL_ATTAINMENT', 'POST_GRAD', 'Post Graduate', 10);

-- Work Status
INSERT INTO reference_options (group_code, code, label, sort_order) VALUES
  ('WORK_STATUS', 'EMPLOYED', 'Employed', 1),
  ('WORK_STATUS', 'SELF_EMPLOYED', 'Self-Employed', 2),
  ('WORK_STATUS', 'UNEMPLOYED', 'Unemployed', 3),
  ('WORK_STATUS', 'STUDENT', 'Student', 4),
  ('WORK_STATUS', 'NON_WORKING', 'Not Working', 5);

-- ============================================
-- KK_PROFILE CATEGORY (seeded without created_by/updated_by since no admin exists yet)
-- ============================================

-- Note: This seed assumes the categories table allows NULL for created_by/updated_by during seeding,
-- or that an admin profile will be created first. Adjust as needed.
-- For now, we skip category seeding and let the application create it after the first admin is bootstrapped.
