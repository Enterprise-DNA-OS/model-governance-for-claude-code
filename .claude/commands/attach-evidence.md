---
description: Attach a checked evidence reference
---

# Attach a checked evidence reference

Read the affected record and history before any change. Resolve ambiguous names with the operator. Report what the command returned without inventing records or evidence.

Run `node scripts/governance.mjs attach-evidence <argument-1>` with the required named options. Use a code, case-insensitive exact name or partial identifier. For attach-evidence and decide, use the assessment identifier; for close-action and draft-action use the action identifier.

Options: kind!, reference!, summary!, checked-on!, valid-until!, actor!. A trailing ! means required; pass options as --name=value. All commands accept --json. Read help for the current contract.

Present the answer in plain language. Generated output stays in drafts, views, docs-out or the explicit export path. Never email, publish, delete records or change a running model.
