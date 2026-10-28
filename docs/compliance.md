# Review rules and their sources

This is a record-checking desk for internal model governance. It does not evaluate model outputs, certify compliance, supply legal advice or grant permission to deploy. A human reviewer decides. Actor text is a label, not an authenticated identity.

## Framework references

[NIST Risk Management Framework core](https://airc.nist.gov/airmf-resources/airmf/5-sec-core/), opened 28 October 2026. This framework is voluntary. NIST says its actions do not constitute a checklist. These local checks support selected record-keeping outcomes; they do not implement the full framework.

| Check | Reference | Local implementation |
|---|---|---|
| Accountable owner | GOVERN 2.1 | Flag a missing owner on an active register entry. |
| Inventory and current version | GOVERN 1.6 | Flag an active entry without a recorded version. |
| Periodic review | GOVERN 1.5 | Flag a missing or past next-review date. The organisation sets the date. |
| Intended use | MAP 1.1 | Flag a blank purpose. |

## Local policy, not legal requirements

LOCAL-RISK: record impact and likelihood on a 1 to 5 scale. Their product sets low below 6, medium from 6 through 14, high from 15. Unassessed stays explicit. These thresholds are demo policy, not NIST thresholds.

LOCAL-EVIDENCE: approval requires three evidence categories: validation, privacy and human oversight. Each must have been checked by today and remain valid through the requested approval expiry. The reviewer must differ from the recorded owner, and the next review must fall within the approval period. Reference links are recorded; their contents are not fetched or verified. A person must check them.

LOCAL-ACTIONS: unresolved high-severity actions block approval and marking a record operating. Closing an action requires a written resolution. Expired evidence and missing reviews remain visible even after an earlier approval. The latest final decision for a version supersedes earlier decisions. A new current version requires a new assessment.

Retired entries stay in the register and retain history. Outstanding actions remain visible. No rule deletes records, contacts a regulator, changes a live model or sends a notice. Legal requirements differ by use, sector and country; record the applicable rules and review them with the responsible specialist before operational use.
