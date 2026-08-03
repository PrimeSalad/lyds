# Registry Spreadsheet Imports

The import workflow supports both **Youth Records** and **Child Laborer Records** and checks every spreadsheet before creating records:

1. Choose the destination registry, then select its published category for the intended filing year.
2. Administrators select the destination barangay. SK officials automatically use their active barangay assignment.
3. For Youth, use the guided `.xlsx`, an official KK workbook, or a Youth CSV export. For Child Laborer, use a CSV exported from the filtered Child Laborer list. Files may be up to 10 MB.
4. Review ready, invalid, and duplicate rows. Download the error report when corrections are needed.
5. Confirm the import. All ready rows are created atomically in the selected registry.

The validation review preserves the exact worksheet row number beside the recognized person. Every row has one explicit outcome: **Ready to import**, **Needs correction**, or **Duplicate — skipped**. Errors and non-blocking warnings are listed separately instead of being collapsed into one message, and the correction report uses the same source-row references. Desktop uses a compact audit table; narrow screens use ordered review cards without hiding validation details.

## Supported workbook layouts

The parser scans the first 50 rows of every worksheet and uses the best recognizable header row for the selected registry. This supports both the downloadable template and official KK Youth Profile workbooks that contain title/instruction rows before their column headings, as well as the flat Child Laborer consolidation columns.

Common combined columns such as `NAME` and `BIRTHDAY` are supported alongside split name and date columns. The validator tolerates common spelling and formatting differences for reference fields, while preserving warnings in the row preview.

## Guided Excel template

The downloadable template mirrors the controlled fields in the Youth Record form. At download time, it loads the current active reference-data choices for sex assigned at birth, civil status, youth classification, educational attainment, and work status. Those fields and Yes/No answers use Excel dropdowns backed by hidden workbook lists, including the full educational-attainment list.

- Green columns are required; slate columns are optional.
- The `Instructions` sheet explains every field and shows the current accepted choices.
- The `Youth Records` sheet includes 1,000 prepared data rows, frozen identity columns, filters, date/phone formatting, and whole-number validation for KK assembly counts.
- The template asks for `REGISTERED VOTER?` and `VOTED LAST ELECTION?`, matching the manual Youth Record form.
- Youth age group is not typed into the guided template. It is calculated from birthday and the selected filing year after upload.
- CSV imports remain supported, but CSV files cannot preserve Excel dropdown validation.

## Export-to-import CSV round trip

Youth and Child Laborer CSV exports include `Registry`, `Filing Year`, all standard record fields, and `Custom Values JSON`. The Imports page validates the embedded registry and year against the selected category, validates a supplied barangay against the destination, and preserves category custom values. A mismatched Youth/Child dataset or filing year is rejected per row instead of being silently filed in the wrong registry.

- Youth Records can export a selected filing-year category and barangay as **CSV · Re-importable** or **Excel · Print-ready**. Administrators must choose one barangay for CSV because each import batch has one destination.
- Child Laborer Records exports the currently filtered category, filing year, barangay, status, and search results. Its CSV can be opened from the direct **Import CSV** action.
- Select the same filing year and destination barangay before checking an exported CSV.

The import validator requires the same core demographic choices as the manual form: first name, last name, sex assigned at birth, civil status, youth classification, highest educational attainment, and work status. When registered voter is `Yes`, voted-last-election must be answered. When KK assembly attendance is `Yes`, an attendance count of at least one is required.

## Annual age and barangay rules

- Known birth dates must produce an age from 15 through 30 on December 31 of the selected category's filing year.
- The age and youth age group stored by the import are recomputed from the birth date and filing year; a spreadsheet's typed age does not override them.
- A missing birth date is allowed but remains visible as a data-quality warning, with age and age group left blank.
- When the spreadsheet has a `BARANGAY` column, rows for a different barangay are invalid and skipped.

## Duplicate handling

Names are normalized for casing, punctuation, accents, and repeated spaces. Youth duplicates use the normalized name; Child Laborer duplicates use first name, last name, and birth date. The validator skips:

- a matching record already present in the same filing-year/category scope and barangay; and
- repeated names within the uploaded file after the first valid occurrence.

The commit transaction rechecks existing records under a registry/year-and-barangay lock. This prevents concurrent imports from creating the same person twice. Duplicate checking does not cross annual datasets, so the same person may correctly appear once in each eligible filing year.

## Batch statuses

- `VALIDATING` — the spreadsheet is being parsed and checked.
- `VALIDATED` — review is available and no registry records have been created yet.
- `COMMITTED` — ready rows were imported.
- `FAILED` — parsing or validation setup failed.
- `CANCELLED` — the review was discarded before commit.

Import history is available at `/imports`. A validated batch can be resumed from that page.
