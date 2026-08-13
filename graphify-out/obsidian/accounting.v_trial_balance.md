---
source_file: "backend/prisma/migrations/20260121145000_create_trial_balance_view/migration.sql"
type: "code"
community: "Community 121"
location: "L2"
tags:
  - graphify/code
  - graphify/EXTRACTED
  - community/Community_121
---

# "accounting"."v_trial_balance"

## Connections
- [[accounting.chart_of_accounts]] - `reads_from` [EXTRACTED]
- [[accounting.general_ledger]] - `reads_from` [EXTRACTED]

#graphify/code #graphify/EXTRACTED #community/Community_121