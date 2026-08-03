# Youth Records

## Annual KK Youth Profile

Youth records are organized by filing year. Annual categories use the display name `KK Youth Profile <year>`. A future-year category must not exist before that year starts.

At 12:05 AM Asia/Manila every January 1, the Supabase Cron job `annual-kk-youth-rollover` calls the database rollover function. No administrator or open browser is required. The rollover process automatically:

1. Uses December 31 of the target year as the age cutoff.
2. Includes only records whose known birthday makes them 15–30 years old, inclusive, on that cutoff date.
3. Excludes records that are under 15, over 30, or missing a birthday.
4. Creates and publishes the target year's KK Youth Profile category when it does not exist.
5. Copies active custom-field definitions from the source category.
6. Recomputes `age_at_submission` and the youth age group for the target filing year.
7. Resets copied records to `DRAFT` and clears submission/approval history.
8. Keeps one source row per barangay and normalized youth name, even when repeated source names have different birthdays.
9. Skips a name already present in the same target-year barangay, so a retried Cron run does not duplicate it.

At 12:06 AM Asia/Manila every January 1, `annual-osy-category` publishes the new `Out-of-School Youth <year>` category. The annual OSY category intentionally starts with zero records: prior-year people are never copied forward, and the new consolidation is populated only through validated CSV imports or later verified entry. Migration `033` also prepares the current year immediately, so 2026 is available even though it begins empty.

The database rejects attempts to prepare a year later than the current Asia/Manila year. The schedule runs at 16:05 UTC on December 31, which is 12:05 AM in the Philippines on January 1.

Because the automated schedule was installed after January 1, 2026, migration `019_backfill_2026_youth_profiles.sql` performs the same guarded rollover once for 2026. The live backfill copied 2,918 unique eligible names from 2025, excluded 427 rows without birthdays and 268 rows outside the target age range, and skipped two repeated source rows from one same-barangay name collision. Re-running the function copies zero additional rows.

## Manual Records

When a record with a known birthday is created or its birthday/category is changed, eligibility is validated against December 31 of the selected category's filing year. Known ages outside 15–30 are rejected. A missing birthday remains allowed for incomplete legacy/source data, but that record cannot be included in an annual rollover until the birthday is supplied.

## Profile Editing and Archiving

The Youth Record Details page presents the full profile using readable reference labels, filing-year context, workflow history, and clear responsive actions.

- Administrators can edit any non-archived record, including submitted and approved profiles. Saving these edits preserves the current status; approval or submission is changed only through its separate workflow action.
- SK officials can edit draft and returned records within their assigned barangay, then save a draft or submit it for review.
- Administrators can archive any active record. Archived profiles remain available with their audit history and can be restored as drafts before editing.
- Age shown and validated in the edit form is calculated against December 31 of the selected filing year, so an older annual profile remains editable after the person ages beyond the current-year range.
- Archive, restore, approval, submission, and return actions require confirmation or a correction reason as appropriate.

## Annual Excel Export

The Youth Records page includes an **Export Excel** action. Select a filing year to download every non-deleted record in that annual dataset. The workbook:

- is named `KK Youth Profile <year>.xlsx`;
- follows the official Katipunan ng Kabataan youth profile column order;
- recomputes displayed age against December 31 of the selected filing year when a birthday is known;
- groups records in barangay/name order and includes print-ready headings, frozen headers, alternating rows, borders, and page footers;
- preserves backend access scope, so an SK official receives only records from the assigned barangay while an administrator receives all barangays unless another filter is applied.

Category cards show live counts for non-deleted youth records within the current account's access scope and active custom fields rather than placeholder zeroes.

## Monitoring

Supabase stores the recurring job and its run history through `pg_cron`. The schedule can be checked with the service-role-only database function:

```sql
SELECT * FROM public.annual_kk_rollover_schedule_status();
SELECT * FROM public.annual_osy_category_schedule_status();
```

Job execution history is also available in the Supabase Dashboard under **Integrations → Cron → Jobs**.
