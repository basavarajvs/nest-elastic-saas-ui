# SaaS Admin Portal — Gap Analysis

Generated: 2026-05-23
Scope: `nest-saas-ui/` frontend vs generated API client (`wms-saas-core-api`)

---

## 1. Completely Unused API Domains

These API domains have **zero UI pages** consuming them. The endpoints exist in the generated client but are not wired up anywhere.

| Domain | API File | Available Endpoints | Notes |
|---|---|---|---|
| **License Plans** | `license-plans/license-plans.ts` | `findAll`, `create`, `findOne`, `update`, `remove` | Duplicate of `billing-plans`; UI uses `billing-plans` exclusively |
| **Tenant Admin** | `tenant-admin/tenant-admin.ts` | `getSettings`, `setSetting`, `deleteSetting`, `getConfigOverrides`, `getHealth`, `getUsage`, `getQuotas` | Tenant-level admin (settings, usage, quotas, health) — **entire domain orphaned** |
| **System** | `system/system.ts` | `getRequestLog` | Request log viewer — single endpoint, entirely unused |
| **Health** | `health/health.ts` | `check` | Basic health check probe — entirely unused |
| **App** | `app/app.ts` | `getHello` | Hello-world probe — entirely unused |

---

## 2. Partially Used API Domains — Unused Endpoints

These domains have some UI pages but **many endpoints are not consumed**.

### 2.1 Billing & Subscriptions
| Unused Endpoint | Method | Use Case |
|---|---|---|
| `SubscriptionController_getDashboard` | GET | **Admin billing dashboard** (revenue, MRR, churn) |
| `SubscriptionController_getInvoices` | GET | List invoices for current tenant |
| `SubscriptionController_getInvoice` | GET | Single invoice details |
| `SubscriptionController_getPendingPayments` | GET | Pending payments overview |
| `SubscriptionController_confirmPayment` | POST | Confirm offline payment receipt |
| `SubscriptionController_requestPayment` | POST | Request offline payment |
| `SubscriptionController_cancel` | PATCH | Cancel a subscription |
| `SubscriptionController_upgrade` | POST | Upgrade subscription plan |
| `SubscriptionController_downgrade` | POST | Schedule plan downgrade |
| `SubscriptionController_findByTenant` | GET | Look up subscription by tenant ID |
| `SubscriptionController_getMySubscription` | GET | Current tenant's own subscription |
| `SubscriptionController_getPlanLimits` | GET | Plan limit details for current tenant |
| `PlanController_getPublicPlans` | GET | Cached public plans |
| `PlanController_update` | PATCH | Update a billing plan |

### 2.2 Users
| Unused Endpoint | Method | Use Case |
|---|---|---|
| `UserController_invite` | POST | Invite user via email |
| `UserController_acceptInvitation` | POST | Accept invitation flow |
| `UserController_resendInvitation` | POST | Resend invitation email |
| `UserController_revokeInvitation` | DELETE | Revoke pending invitation |
| `UserController_update` | PATCH | Update user profile (admin) |
| `UserController_remove` | DELETE | Delete a user |
| `UserController_revokeRole` | DELETE | Revoke a role assignment |
| `UserController_approveRole` | POST | Approve pending role request |
| `UserController_resetPin` | POST | Admin reset of user PIN |

### 2.3 Security
| Unused Endpoint | Method | Use Case |
|---|---|---|
| `SecurityController_getUnresolved` | GET | All unresolved security events in one view |
| `TokenController_getActiveTokens` | GET | List/revoke active sessions/tokens |

### 2.4 System Admin
| Unused Endpoint | Method | Use Case |
|---|---|---|
| `SystemAdminController_getQueues` | GET | Queue statistics dashboard |
| `SystemAdminController_purgeQueue` | DELETE | Purge failed jobs from a queue |
| `SystemAdminController_seed` | POST | Re-run system seeder |
| `SystemAdminController_suspendTenant` | POST | Suspend tenant (dedicated endpoint) |
| `SystemAdminController_reactivateTenant` | POST | Reactivate tenant (dedicated endpoint) |

### 2.5 Integrations & Webhooks
| Unused Endpoint | Method | Use Case |
|---|---|---|
| `IntegrationController_getDecryptedConfig` | GET | View decrypted integration config (sysadmin) |
| `IntegrationController_updateStatus` | PATCH | Update integration status |
| `WebhookController_getDelivery` | GET | Single delivery details |
| `WebhookController_resetFailures` | POST | Reset delivery failure count |

### 2.6 Quotas & Settings
| Unused Endpoint | Method | Use Case |
|---|---|---|
| `QuotaController_findByResourceType` | GET | Filter quotas by resource type |
| `QuotaController_findOne` | GET | Single quota detail |
| `QuotaController_recordUsage` | POST | Record usage manually |
| `QuotaController_update` | PATCH | Update quota definition |
| `TenantSettingController_createConfigOverride` | POST | Per-tenant config override |
| `TenantSettingController_findAllConfigOverrides` | GET | List all config overrides |
| `TenantSettingController_findAllSystemSettings` | GET | List all system settings |
| `TenantSettingController_findSetting` | GET | Single setting detail |
| `TenantSettingController_updateConfigOverride` | PATCH | Update a config override |
| `TenantSettingController_updateSystemSetting` | PATCH | Update a system setting |

---

## 3. API Usage Pattern Issue

**100% of API calls use raw functions** (e.g., `await TenantController_create(...)`) inside hand-rolled `useQuery`/`useMutation` wrappers in page files.

The generated React Query hooks (`useTenantControllerCreate`, etc.) are **never used**. This means:

- No standardised cache invalidation strategy
- No query key conventions
- Each page duplicates loading/error state management
- Poor observability (no `queryKey` logging)
- Generated hooks are dead code

---

## 4. Missing Enterprise Features (no API or no UI)

### 4.1 Tenant Lifecycle & Management
| Feature | Priority | Notes |
|---|---|---|
| Tenant provisioning wizard | High | Multi-step onboarding (details → plan → admin user → notification) |
| Tenant deprovisioning workflow | High | Confirm → drain → archive → delete with audit trail |
| Health monitoring dashboard | High | All-tenants health at a glance; API exists (`getHealth`) |
| Bulk tenant operations | Medium | Suspend/reactivate/export multiple tenants at once |
| Tenant migration (plan change) | Medium | Move tenant between plans with proration |
| Tenant tags/labels | Low | Custom metadata for filtering and grouping |

### 4.2 Billing & Revenue Operations
| Feature | Priority | Notes |
|---|---|---|
| Admin billing dashboard | High | MRR, churn rate, active subscriptions, revenue charts (API exists) |
| Invoice viewer & management | High | Browse, download, email invoices (API exists) |
| Subscription management UI | High | Upgrade, downgrade, cancel, reactivate workflows (API exists) |
| Payment management | High | Pending payments, manual confirmation, payment history (API exists) |
| Discount & coupon management | Medium | Promo codes, trial extensions, custom pricing |
| Usage-based billing | Medium | Metered billing UI showing consumption vs limits (API partially exists) |
| Dunning & retry workflows | Low | Failed payment email automation, retry schedules |

### 4.3 Identity & Access Management
| Feature | Priority | Notes |
|---|---|---|
| SSO/SAML configuration | High | Enterprise SSO setup UI (no SAML API endpoints exist) |
| Role hierarchy & inheritance | High | Visual role tree showing permission inheritance (API exists) |
| User invitation workflow | High | Invite → pending → accept with email templates (API exists) |
| Session management | High | Active sessions per user, force logout (Token API exists) |
| MFA enforcement policies | Medium | Require MFA per role or per tenant |
| Password policy configuration | Medium | Complexity rules, expiry, history |
| IP allow/block list | Medium | Per-tenant IP restrictions |
| SCIM provisioning | Low | Automatic user provisioning from IdP |

### 4.4 Security & Compliance
| Feature | Priority | Notes |
|---|---|---|
| Security events dashboard | High | Real-time security events, trends, resolution workflow (partially exists) |
| Audit log viewer | High | Searchable, exportable audit trail with filters (partially exists) |
| Data retention management | High | Per-category retention rules, automated purging (partially exists) |
| Compliance policy management | High | Policy CRUD, enforcement status (partially exists) |
| API rate limiting admin | Medium | View/configure rate limits per endpoint or tenant |
| Data export/import | Medium | GDPR data portability, bulk import tools |
| Encryption key management | Low | Bring-your-own-key (BYOK) UI |

### 4.5 System Administration & Operations
| Feature | Priority | Notes |
|---|---|---|
| Queue management dashboard | High | View queue depth, failed jobs, retry/purge (API exists) |
| System settings manager | High | Unified settings CRUD with validation (API partially exists) |
| Background jobs scheduler | Medium | Cron job UI, job history, retry |
| Cache management | Medium | Invalidate cache keys, view cache stats |
| Feature flags | Medium | Toggle features per tenant or globally |
| API documentation viewer | Medium | Embedded Swagger/OpenAPI viewer |
| System health page | Low | Uptime, dependency status, version info (API exists) |

### 4.6 Communication & Notifications
| Feature | Priority | Notes |
|---|---|---|
| Email/SMTP configuration | High | SMTP settings, test email, template preview |
| Notification preferences per tenant | Medium | Per-tenant default notification rules |
| Broadcast scheduling | Medium | Schedule notifications for future delivery |
| Push notification management | Low | Mobile push config |
| In-app notification center | Medium | User preference settings (partially exists) |

### 4.7 Support & Helpdesk
| Feature | Priority | Notes |
|---|---|---|
| Support ticket system | High | Ticket CRUD, status workflow, priority levels — **no API endpoints exist** |
| Tenant impersonation | High | Just implemented; also could have session recording |
| Announcement banner | Low | System-wide announcements |
| Knowledge base / help articles | Low | Embedded help documentation |

### 4.8 Reporting & Analytics
| Feature | Priority | Notes |
|---|---|---|
| Scheduled report delivery | High | Email reports on schedule (API partially exists) |
| Custom report builder | Medium | Drag-and-drop report configuration |
| Usage analytics dashboard | Medium | Per-tenant usage trends, top consumers |
| Export to PDF/CSV | Medium | Consistent export across all list views |
| Dashboard widgets | Medium | Configurable dashboard with drag-and-drop |

---

## 5. Recommended Build Order

```
Phase 1 (High-Impact, APIs Exist)
├── Admin billing dashboard & invoice viewer
├── Subscription management (upgrade/downgrade/cancel)
├── Queue management dashboard
├── Tenant health monitoring
├── Session management (active tokens)
└── User invitation workflow

Phase 2 (Core Enterprise, APIs Exist)
├── System settings manager (unified CRUD)
├── Tenant config overrides UI
├── Role hierarchy viewer
├── Security events dashboard enhancements
└── Data retention policy enforcement

Phase 3 (APIs Missing or Partial)
├── SSO/SAML configuration
├── Support ticket system
├── Feature flags management
├── IP allow/block list
├── Password policy configuration
└── Email/SMTP configuration

Phase 4 (Enhancements)
├── Custom report builder
├── Scheduled report delivery UI
├── Bulk operations across domains
├── Dashboard widgets
├── API documentation viewer
├── System health page
└── Announcement banner system
```

---

## 6. Technical Debt Items

1. **Generated hooks unused** — 70+ `useXxx` hooks are dead code; decision needed: adopt them or remove them
2. **Raw function duplication** — Every page recreates `useQuery`/`useMutation` wrappers with duplicate loading/error logic
3. **Two subscription APIs** — `subscriptions-billing/` (legacy) and `billing-subscriptions/` (v2) coexist with overlapping functionality
4. **Two plan APIs** — `billing-plans/` (used) and `license-plans/` (unused) appear to be duplicate domains
5. **Auth is direct** — Auth pages call raw API functions instead of using a centralised auth context/hook; token management is unclear
6. **No error boundary on root** — `GeneralError` is the TanStack Router `errorComponent` but no React Error Boundary wraps the tree
7. **No consistent query key strategy** — Each page invents its own query key format
8. **No API response type safety** — Most pages cast responses with `as unknown as { data: ... }` rather than using generated types
