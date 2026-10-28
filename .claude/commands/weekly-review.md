---
description: Prepare the weekly review draft
---

# Prepare the weekly review draft

Read review-queue, actions-due and evidence-due. The script combines those three into a dated draft. State overdue owners and evidence gaps. No messages are sent.

Run `node scripts/governance.mjs weekly-review` with the required named options.

Options: none. A trailing ! means required; pass options as --name=value. All commands accept --json. Read help for the current contract.

Present the answer in plain language. Generated output stays in drafts, views, docs-out or the explicit export path. Never email, publish, delete records or change a running model.
