# Move a use-case register from IBM watsonx.governance

This import covers use-case or model inventory rows from the governance console. It does not migrate model evaluation services, telemetry, access permissions or the complete IBM platform.

## Export the records you control

IBM documents [object and relationship CSV exports](https://www.ibm.com/docs/en/openpages/9.1.x?topic=ci-exporting-openpages-data-be-used-by-other-applications) and [grid exports to spreadsheets](https://www.ibm.com/docs/en/openpages/9.0.0?topic=objects-exporting-data-from-filter-results). Its [governance console configuration guide](https://www.ibm.com/docs/en/watsonx/saas?topic=console-configuring-governance) points to OpenPages documentation. Sources checked 28 October 2026 through indexed IBM documentation; direct documentation fetches returned 403.

Ask the administrator for the inventory object CSV and select only records in your scope. If using a grid export, include the stable resource identifier, name, description and responsibility fields, export the spreadsheet and save that single worksheet as UTF-8 CSV. Do not pass a workbook or a relationship CSV to this importer. Grid exports can omit large text fields. Export permissions and limits depend on the installation.

## Map once, then import in one command

The fixture is synthetic. Its headers are an example mapping, not a universal IBM format. Edit a copy of examples/column-map.json to match your export headers. The map keys are external_id, code, name, purpose, owner, department and vendor. Column matching ignores case. Required values are external_id, code and name. All explicitly mapped columns must exist. Optional default columns can be absent.

```bash
node scripts/governance.mjs import ibm-watsonx-governance export.csv --source=my-governance-console --map=examples/column-map.json --actor="Register steward" --dry-run
```

Inspect the preview, then remove --dry-run. The whole batch commits together. Bad rows, duplicate identifiers, code collisions and changed previously imported rows reject the batch. An identical repeat skips existing rows. Dry-run executes the same validation and rolls everything back, including history and the import log. Keep the source label stable for one source installation.

## What arrives

Each record gets its stable external identifier and source label, name, purpose, owner, department and vendor when mapped. Every original column is preserved in raw_source. All imports start proposed and unassessed, with no invented review date, version or approval. Raw source status is preserved for reconciliation but never converted into approval.

After import, compare counts, identifiers and raw fields against the export. Assign missing owners, add the current version, set the next review and attach evidence through a local assessment. Record each decision. Keep IBM available until this scope is reconciled and signed off.

Attachments, relationship files, historical assessments, IBM identities, electronic signatures, questionnaires, monitoring results and evaluation engines do not transfer automatically. Enterprise DNA maps the required history and connections as part of a scoped migration. A register transfer can start in a day; the wider platform migration depends on those records and services.

## Take your records out

```bash
node scripts/governance.mjs export --out=exports/governance.json
```

The JSON snapshot includes all seven domain record types and source fields. It is a data handover, not a tested recovery archive. Use native database backups and test recovery before running a shared service.
