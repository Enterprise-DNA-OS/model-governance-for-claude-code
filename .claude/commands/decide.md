---
description: Record an independent reviewer decision
---

# Record an independent reviewer decision

Read the use case, its version, open actions and evidence first. Ask the operator for the decision, rationale, reviewer label and validity. Do not decide from a score alone. The actor must differ from the recorded owner; labels are not authentication. Approval is a local record, never permission to deploy.

Run `node scripts/governance.mjs decide <argument-1>` with the required named options. Use a code, case-insensitive exact name or partial identifier. For attach-evidence and decide, use the assessment identifier; for close-action and draft-action use the action identifier.

Options: decision!, valid-until, rationale!, actor!. A trailing ! means required; pass options as --name=value. All commands accept --json. Read help for the current contract.

Present the answer in plain language. Generated output stays in drafts, views, docs-out or the explicit export path. Never email, publish, delete records or change a running model.
