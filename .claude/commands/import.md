---
description: Preview and import an IBM inventory export
---

# Preview and import an IBM inventory export

Read docs/replace-ibm-watsonx-governance.md first. Inspect headers and map them. Always preview with --dry-run, show counts and skipped records, then apply the exact approved file and mapping. Never infer an approval from exported status.

Run `node scripts/governance.mjs import <argument-1> <argument-2>` with the required named options. Positional arguments are ibm-watsonx-governance and the CSV path.

Options: source!, map, dry-run, actor!. A trailing ! means required; pass options as --name=value. All commands accept --json. Read help for the current contract.

Present the answer in plain language. Generated output stays in drafts, views, docs-out or the explicit export path. Never email, publish, delete records or change a running model.
