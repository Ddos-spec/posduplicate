---
source_file: "backend/src/modules/shared/services/changeApproval.service.ts"
type: "code"
community: "Community 13"
location: "L1"
tags:
  - graphify/code
  - graphify/EXTRACTED
  - community/Community_13
---

# changeApproval.service.ts

## Connections
- [[ApplyOperationalChangeResult]] - `contains` [EXTRACTED]
- [[ChangeControlMode]] - `contains` [EXTRACTED]
- [[CreateOperationalChangeRequestInput]] - `contains` [EXTRACTED]
- [[OPERATIONAL_ROLES]] - `contains` [EXTRACTED]
- [[OperationalChangeRequestRecord]] - `contains` [EXTRACTED]
- [[OperationalChangeStatus]] - `contains` [EXTRACTED]
- [[PRIVILEGED_ROLES]] - `contains` [EXTRACTED]
- [[activity-log.controller.ts]] - `imports_from` [EXTRACTED]
- [[applyOperationalChange()]] - `contains` [EXTRACTED]
- [[approveOperationalChangeRequest()]] - `contains` [EXTRACTED]
- [[buildApprovedReason()]] - `contains` [EXTRACTED]
- [[buildCategorySnapshot()]] - `contains` [EXTRACTED]
- [[buildIngredientSnapshot()]] - `contains` [EXTRACTED]
- [[buildModifierSnapshot()]] - `contains` [EXTRACTED]
- [[buildProductSnapshot()]] - `contains` [EXTRACTED]
- [[buildTableSnapshot()]] - `contains` [EXTRACTED]
- [[canInitiateOperationalChange()]] - `contains` [EXTRACTED]
- [[createActivityLog()]] - `imports` [EXTRACTED]
- [[createOperationalChangeRequest()]] - `contains` [EXTRACTED]
- [[emailNotification.service.ts]] - `imports_from` [EXTRACTED]
- [[ensureOperationalChangeTables()]] - `contains` [EXTRACTED]
- [[escapeHtml()]] - `contains` [EXTRACTED]
- [[formatActionLabel()]] - `contains` [EXTRACTED]
- [[formatChangeLabel()]] - `contains` [EXTRACTED]
- [[getOperationalChangeRequestById()]] - `contains` [EXTRACTED]
- [[getPendingOperationalChangeNotifications()]] - `contains` [EXTRACTED]
- [[getTenantChangeControlMode()]] - `contains` [EXTRACTED]
- [[getTenantNotificationPreferences()]] - `imports` [EXTRACTED]
- [[isEmailDeliveryConfigured()]] - `imports` [EXTRACTED]
- [[isPrivilegedChangeRole()]] - `contains` [EXTRACTED]
- [[listOperationalChangeRequests()]] - `contains` [EXTRACTED]
- [[mapRequestRow()]] - `contains` [EXTRACTED]
- [[normalizeMode()]] - `contains` [EXTRACTED]
- [[prisma_6]] - `imports` [EXTRACTED]
- [[prisma.ts]] - `imports_from` [EXTRACTED]
- [[rejectOperationalChangeRequest()]] - `contains` [EXTRACTED]
- [[requireTenantOutlet()]] - `contains` [EXTRACTED]
- [[sendApprovalLifecycleEmail()]] - `contains` [EXTRACTED]
- [[sendEmail()]] - `imports` [EXTRACTED]
- [[shouldQueueOperationalChange()]] - `contains` [EXTRACTED]
- [[toRecord()_2]] - `contains` [EXTRACTED]

#graphify/code #graphify/EXTRACTED #community/Community_13