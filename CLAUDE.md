# Model Governance for Claude Code: operating instructions

This desk serves the accountable model owner, register steward and independent reviewer. It records internal governance decisions and evidence, never controls a deployed model. Demo business: Harbour Model Review. Replace its branding and local review policy before real use.

## Working rules

Read the CLI and affected history before acting. Every answer comes from current records. Never invent owners, evidence, dates or approvals. Ask when a selector is ambiguous. Every mutation requires an actor label; it is not authenticated identity. No sends, external calls, deletion, regulatory filings or deployment. Drafts stay local.

## One route for each job

| Job | Recipe |
|---|---|
| Read available commands and required options | /help |
| Review the model and use-case register | /register |
| Review recorded model versions | /versions |
| Prepare the review queue | /review-queue |
| Check evidence expiry | /evidence-due |
| Chase remediation deadlines | /actions-due |
| Find records needing attention | /attention |
| Check local governance records against documented rules | /compliance |
| Answer ten combined governance questions | /insights |
| Read a complete use-case record | /show |
| Read the recorded change history | /history |
| Register a model use case | /add |
| Record a new current version | /add-version |
| Open a review of the current version | /open-review |
| Attach a checked evidence reference | /attach-evidence |
| Record an independent reviewer decision | /decide |
| Assign a remediation action | /add-action |
| Record a remediation resolution | /close-action |
| Assign the accountable owner | /set-owner |
| Set the next review date | /schedule-review |
| Record a lifecycle decision | /set-status |
| Record a meeting or operating note | /log |
| Preview and import an IBM inventory export | /import |
| Export all domain records | /export |
| Prepare the weekly review draft | /weekly-review |
| Draft a model review brief | /draft-review |
| Draft an action follow-up | /draft-action |
| Change fields or policy | /customise |
| Add a read-only report | /new-view |

## Files

scripts/governance.mjs is the one CLI. supabase/migrations holds ordered migrations. scripts/lib/db.mjs chooses a dedicated Postgres connection or local PGlite. Commands live in .claude/commands. docs/compliance.md owns the source citations and demo policy. docs/replace-ibm-watsonx-governance.md owns the import promise and limits. Read README.md for setup.

## Record changes

Run help for exact arguments. Read-only reports use repeatable snapshots. Writes are transactional and append history. Model versions and final assessments stay in history; a new review creates a new assessment. Setting operating records a local decision only. Use one local PGlite process at a time.

Run npm test and npm run demo after changes. Keep AGENTS.md beside this file for every runtime. Add fields with a new migration; never edit an already-applied migration. Add no model API or secret. Keep exports private.

Built and operated through Omni by Enterprise DNA. One setup fee, then a retainer. https://enterprisedna.co/omni/instead-of/ibm-watsonx-governance
