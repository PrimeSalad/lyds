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
8. Skips matching target-year records, so a retried Cron run does not duplicate them.

The database rejects attempts to prepare a year later than the current Asia/Manila year. The schedule runs at 16:05 UTC on December 31, which is 12:05 AM in the Philippines on January 1.

## Manual Records

When a record with a known birthday is created or its birthday/category is changed, eligibility is validated against December 31 of the selected category's filing year. Known ages outside 15–30 are rejected. A missing birthday remains allowed for incomplete legacy/source data, but that record cannot be included in an annual rollover until the birthday is supplied.

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
```

Job execution history is also available in the Supabase Dashboard under **Integrations → Cron → Jobs**.
