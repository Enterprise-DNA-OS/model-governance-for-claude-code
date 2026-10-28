# Model Governance for Claude Code

Know which models have an owner, which review is overdue and which approval rests on expired evidence. An owned database for model registers, versions, assessment decisions and remediation work. Built by Enterprise DNA.

| Do it yourself | We customise it | We run it for you |
|---|---|---|
| Free, MIT. Install the database and command recipes. | Your fields, review policy, evidence types, export mapping and a web front end if wanted. | Installed and operated through Omni by Enterprise DNA. One setup fee, then a retainer. |

[Get your version built](https://enterprisedna.co/omni/book/?offer=replace-software&utm_source=github&utm_campaign=ibm-watsonx-governance)

## Start with the weekly work

Review the inventory, assign owners, check evidence expiry, resolve remediation actions and prepare the review meeting. Decisions attach to a specific model version. Approval requires evidence valid through its expiry and no unresolved high-severity action. Adding a new version resets its assessment status. Records marked operating are checked again when evidence or dates lapse.

IBM's [pricing page](https://www.ibm.com/products/watsonx-governance/pricing) lists Risk & Compliance Advanced from US$6,450 monthly, or US$77,400 over twelve months, checked 28 October 2026. Prices are indicative, vary by country and exclude taxes. This desk covers the review records; it is not a replacement for IBM's model evaluation or monitoring services.

## Quick start

Node 20 or newer. Claude Code, Codex, OpenCode or Cursor. No paid model API required by the CLI.

```bash
npm install
npm run demo
node scripts/governance.mjs review-queue
node scripts/governance.mjs compliance
node scripts/governance.mjs insights
npm run view
npm run docs
npm test
```

The demo is fictional, with missing owners, overdue reviews and expired evidence. Set a fresh DATA_DIR and run npm run migrate without seeding for real work. DATABASE_URL selects a dedicated Postgres database; otherwise PGlite lives in .data/db. One local process at a time.

## Commands

Run node scripts/governance.mjs help for the complete option list. All 27 CLI commands support --json. Required options are marked ! in help. Named options use --name=value; selectors are positional. Case-insensitive exact codes and names, or partial identifiers, find records. Ambiguous selectors list candidates and exit 1.

Read: help, register, versions, review-queue, evidence-due, actions-due, attention, compliance, insights, show, history.

Write: add, add-version, open-review, attach-evidence, decide, add-action, close-action, set-owner, schedule-review, set-status, log, import.

Handover: export, weekly-review, draft-review, draft-action. Drafts never send.

Each has a matching slash recipe. /customise changes a rule or field through a migration and tests. /new-view adds a read-only view. The operating label records a human decision; it never starts or stops a running model.

## Bring your register

```bash
node scripts/governance.mjs import ibm-watsonx-governance examples/ibm-use-cases.csv --source=demo-console --map=examples/column-map.json --actor="Register steward" --dry-run
node scripts/governance.mjs export --out=exports/governance.json
```

The fixture is synthetic. Map the exported headers once, preview, then remove --dry-run. Imported rows keep every raw field but start unassessed. Identical repeat imports skip; changed rows require reconciliation. Invalid batches roll back in full. [Switch guide](docs/replace-ibm-watsonx-governance.md).

## Ten questions to ask

The insights command answers these from current records. These are custom joins over your policy and evidence, not a claim that IBM cannot be configured to answer them.

1. Which operating models have no current approval?
2. Which owners have both an overdue review and overdue actions?
3. Which suppliers have unassessed use cases?
4. Which departments have no accountable owner recorded?
5. Which approvals depend on evidence expiring within 30 days?
6. Which current versions have never had a review?
7. Which high-severity actions are overdue and who owns them?
8. Which imported use cases still need assessment?
9. Which retired systems still have unresolved actions?
10. Which planned reviews arrive before their evidence expires?

## Your first hour: ten things to ask for

1. Put our business name and colours in brand.json.
2. Add our use-case register.
3. Assign accountable owners.
4. Record the model version currently in use.
5. Set the next review date for each owner.
6. Map a small exported sample and preview it.
7. Set our impact and likelihood thresholds.
8. Record our validation, privacy and oversight evidence.
9. Render a review brief and remediation plan.
10. Add our next recurring question with /new-view.

## Documents and views

Three dashboards cover reviews and actions, evidence and readiness, and the register. Three document types produce model cards, assessment/evidence records and remediation plans. brand.json controls logo, business name and colours. Generated files stay local and are read-only reports. Drafts live under drafts/.

## Rules and boundaries

[Compliance notes](docs/compliance.md) separate voluntary NIST references from the demo's local policy. No legal certification, automated risk determination or production enforcement. The reviewer label differs from the recorded owner but is not authentication. The operator checks evidence references and owns every decision.

[Why no front end](docs/why-no-front-end.md). No mobile app, collaboration UI, electronic signatures, automatic discovery, model evaluation, drift monitoring, attachment hosting or vendor connection. Enterprise DNA scopes those into a custom version when needed.

Shared use requires secured hosting, authenticated roles, access controls and tested backups. Public database roles have no access by default. History records application actions but is not tamper-proof against the database owner. Protect exports and drafts; they contain business records. File permissions are restricted where supported; secure Windows folders separately. [Verification](docs/verification.md).

MIT. Built by Enterprise DNA.
