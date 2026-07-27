# Youth Spreadsheet Imports

The import workflow checks a spreadsheet before it creates any youth records:

1. Select the published youth-profile category for the intended filing year.
2. Administrators select the destination barangay. SK officials automatically use their active barangay assignment.
3. Upload an `.xlsx` or `.csv` file up to 10 MB.
4. Review ready, invalid, and duplicate rows. Download the error report when corrections are needed.
5. Confirm the import. All ready rows are created atomically as submitted youth profiles.

## Supported workbook layouts

The parser scans the first 50 rows of every worksheet and uses the best recognizable header row. This supports both the downloadable template and official KK Youth Profile workbooks that contain title/instruction rows before their column headings.

Common combined columns such as `NAME` and `BIRTHDAY` are supported alongside split name and date columns. The validator tolerates common spelling and formatting differences for reference fields, while preserving warnings in the row preview.

## Annual age and barangay rules

- Known birth dates must produce an age from 15 through 30 on December 31 of the selected category's filing year.
- The age and youth age group stored by the import are recomputed from the birth date and filing year; a spreadsheet's typed age does not override them.
- A missing birth date is allowed but remains visible as a data-quality warning, with age and age group left blank.
- When the spreadsheet has a `BARANGAY` column, rows for a different barangay are invalid and skipped.

## Duplicate handling

Names are normalized for casing, punctuation, accents, and repeated spaces. The validator skips:

- a name already present in the same category and barangay; and
- repeated names within the uploaded file after the first valid occurrence.

The commit transaction rechecks existing records under a category-and-barangay lock. This prevents concurrent imports from creating the same normalized name twice. Duplicate checking does not cross annual categories, so the same person may correctly appear once in each eligible filing year.

## Batch statuses

- `VALIDATING` — the spreadsheet is being parsed and checked.
- `VALIDATED` — review is available and no youth records have been created yet.
- `COMMITTED` — ready rows were imported.
- `FAILED` — parsing or validation setup failed.
- `CANCELLED` — the review was discarded before commit.

Import history is available at `/imports`. A validated batch can be resumed from that page.
