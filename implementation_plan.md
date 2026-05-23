# SaaS Admin Portal — Implementation Plan

## Background

The `nest-saas-ui` project is a Vite + React 19 SaaS admin portal. The codebase has been partially built and many API domains exist in the generated client (`wms-saas-core-api`) but have no UI pages. This plan covers what to build, in what order, following the exact conventions already established in the codebase.

---

## Codebase Patterns (Observed)

Before any new code is written, these conventions **must** be followed:

### Tech Stack
| Layer | Technology |
|---|---|
| Framework | React 19 + Vite 8 |
| Routing | TanStack Router v1 (file-based, `_authenticated/` layout) |
| Data Fetching | TanStack Query v5 (`useQuery` / `useMutation`) |
| Forms | `react-hook-form` + `zod` + `@hookform/resolvers` |
| UI Components | shadcn/ui (Radix UI primitives + Tailwind CSS v4) |
| Charts | `recharts` |
| Notifications | `sonner` (toast) |
| HTTP Client | Axios via `customInstance` from `src/lib/http/httpClient.ts` |
| API Client | Orval-generated functions in `src/lib/api/wms-saas-core-api/` |
| State | Zustand (for global UI state only) |

### API Calling Convention
All pages call **raw generated functions** directly (e.g. `SystemAdminController_getQueues()`), wrapped in **page-local** `useQuery` / `useMutation` hooks. The generated `useXxx` hooks are **not used**. This existing pattern will be **maintained** (not refactored) in this plan.

```ts
// ✅ Pattern used everywhere — follow this
function useQueues() {
  return useQuery({
    queryKey: ['system', 'queues'],
    queryFn: async () => {
      const res = await SystemAdminController_getQueues()
      return res as unknown as { data: Queue[] }
    },
    staleTime: 30_000,
  })
}
```

### Query Key Convention
```ts
// Domain-first arrays, e.g.:
['tenants', 'list']
['tenants', 'detail', tenantId]
['tenants', 'health', tenantId]
['billing', 'subscriptions', 'list']
['billing', 'subscriptions', 'dashboard']
['system', 'queues']
['users', 'list']
['users', 'detail', userId]
['users', 'sessions', userId]
```

### File & Folder Convention
```
src/
  routes/_authenticated/   ← TanStack Router file-based routes (thin, just imports the page)
  pages/                   ← Actual page component logic (all business logic lives here)
    {domain}/
      {domain}-list.tsx    ← List page
      {domain}-detail.tsx  ← Detail/view page
      {domain}-create.tsx  ← Create form page
```

### Shared Common Components (already exist)
- `PageHeader` — page title + description + action buttons slot
- `LoadingState` — full-area loading skeleton
- `ErrorState` — error card with retry button
- `EmptyState` — empty list card
- `ConfirmDialog` — reusable confirmation alert dialog
- `ErrorBoundary`

### UI Component Pattern
- **Lists**: `Card > CardHeader (filters) + CardContent (Table)` + inline pagination
- **Forms**: `Form > FormField > FormItem > FormLabel + FormControl + FormMessage` (react-hook-form + shadcn Form)
- **Confirmations**: `AlertDialog` (inline, triggered by state)
- **Side panels / drawers**: `Sheet` (for inline create/edit)
- **Multi-step**: No wizard component exists yet — must be built using `Tabs` or `Steps` UI

### Response Casting Pattern (known tech debt, maintain for now)
```ts
const typed = res as unknown as { data: MyType[]; meta: PaginationMeta }
return typed
```

---

## Open Questions

> [!IMPORTANT]
> Please answer these before implementation begins. They affect the scope and approach.

1. **Generated hooks decision**: The 70+ generated `useXxx` hooks are dead code. Should we:
   - **A) Keep the raw-function pattern** (maintain current approach, do not adopt generated hooks)
   - **B) Adopt generated hooks going forward** (refactor all new pages to use `useTenantAdminControllerGetHealth()` style)
   - **C) Refactor existing pages to use generated hooks too** (broader refactor)

2. **Two subscription APIs**: `subscriptions-billing/` (legacy) vs `billing-subscriptions/` (v2). New billing pages should use which one?

3. **Route structure for new Billing pages**: Should billing pages be grouped under `/billing/*` or kept as flat routes like `/subscriptions`, `/invoices`, `/payments`?

4. **Wizard component for tenant provisioning**: Should we use a third-party stepper (e.g. `react-stepper-horizontal`) or build one from shadcn `Tabs` primitives?

5. **Phase priority**: Do you want to strictly follow the Phase 1 → 4 order, or should any specific feature be pulled forward?

---

## Proposed Changes — Phase 1 (High-Impact, APIs Exist)

All Phase 1 features have **working backend endpoints** already in the generated client.

---

### Phase 1.1 — Admin Billing Dashboard

**Route**: `/billing/dashboard`

#### [NEW] `src/routes/_authenticated/billing/dashboard.tsx`
Thin route file that imports and renders `BillingDashboardPage`.

#### [NEW] `src/pages/billing/billing-dashboard.tsx`
- Uses `SubscriptionController_getDashboard` from `billing-subscriptions/billing-subscriptions.ts`
- Displays: MRR card, churn rate card, active subscriptions card, revenue trend chart (`recharts` AreaChart)
- Query key: `['billing', 'subscriptions', 'dashboard']`

#### [MODIFY] `src/components/layout/data/sidebar-data.ts`
- Add `{ title: 'Dashboard', url: '/billing/dashboard', icon: BarChart3 }` under the `Billing` nav group

---

### Phase 1.2 — Invoice Viewer & Management

**Route**: `/billing/invoices`, `/billing/invoices/$id`

#### [NEW] `src/routes/_authenticated/billing/invoices.tsx`
#### [NEW] `src/routes/_authenticated/billing/invoices.$id.tsx`
#### [NEW] `src/pages/billing/invoices-list.tsx`
- Uses `SubscriptionController_getInvoices`
- Filterable table: tenant, status (paid/unpaid/overdue), date range
- Row actions: View details, Download PDF (link), Email

#### [NEW] `src/pages/billing/invoice-detail.tsx`
- Uses `SubscriptionController_getInvoice(id)`
- Line items, status badge, payment history, action buttons

#### [MODIFY] `src/components/layout/data/sidebar-data.ts`
- Add Invoices link under Billing group

---

### Phase 1.3 — Subscription Management

**Route**: `/subscriptions` (already exists, extend it)

#### [MODIFY] `src/pages/subscriptions/` (existing)
The subscriptions page exists but is minimal. Extend it with:
- **Upgrade dialog**: calls `SubscriptionController_upgrade(id, dto)`
- **Downgrade dialog**: calls `SubscriptionController_downgrade(id, dto)`
- **Cancel dialog**: calls `SubscriptionController_cancel(id)`
- **Find by tenant**: inline subscription card on the Tenant detail page

---

### Phase 1.4 — Payment Management

**Route**: `/billing/payments` (route already exists in sidebar, but page is minimal)

#### [MODIFY] `src/pages/billing/payments.tsx`
Currently exists but is thin. Enhance with:
- Pending payments table — `SubscriptionController_getPendingPayments()`
- Confirm payment inline dialog — `SubscriptionController_confirmPayment(dto)`
- Request payment — `SubscriptionController_requestPayment(dto)`

---

### Phase 1.5 — Queue Management Dashboard

**Route**: `/system/queues`

#### [NEW] `src/routes/_authenticated/system/queues.tsx`
#### [NEW] `src/pages/system/queues-dashboard.tsx`
- Uses `SystemAdminController_getQueues()` — returns per-queue stats
- Shows queue cards: name, depth, active workers, failed count
- **Purge failed** button per queue → `SystemAdminController_purgeQueue(name)` with confirm dialog
- Auto-refresh every 30s via `refetchInterval`
- Query key: `['system', 'queues']`

#### [MODIFY] `src/components/layout/data/sidebar-data.ts`
- Add `{ title: 'Queue Monitor', url: '/system/queues', icon: Server }` under System group

---

### Phase 1.6 — User Invitation Workflow

**Route**: Inline on `/users` list page (Sheet drawer)

#### [MODIFY] `src/pages/users/users-list.tsx`
Add an "Invite User" button that opens a `Sheet`:
- Form: email, role (select from roles API), message (optional)
- Submit → `UserController_invite(dto)`
- Shows pending invitations inline in a tabs section: All Users | Pending Invitations
- Pending invitations rows have: Resend (`UserController_resendInvitation`) and Revoke (`UserController_revokeInvitation`) actions

#### [MODIFY] `src/pages/users/user-detail.tsx`
- Add **Edit profile** (currently placeholder) → `UserController_update(id, dto)`
- Add **Delete user** → `UserController_remove(id)` with confirm
- Add **Reset PIN** → `UserController_resetPin(id)` with confirm

---

### Phase 1.7 — Session Management (Active Tokens)

**Route**: `/security/sessions`

#### [NEW] `src/routes/_authenticated/security/sessions.tsx`
#### [NEW] `src/pages/security/sessions.tsx`
- Uses `TokenController_getActiveTokens()` from `security/security.ts`
- Lists all active tokens: user, created at, last used, IP, device
- **Revoke** action per token with confirm dialog
- Query key: `['security', 'sessions']`

#### [MODIFY] `src/components/layout/data/sidebar-data.ts`
- Add Sessions link under Security group

---

## Proposed Changes — Phase 2 (Core Enterprise)

---

### Phase 2.1 — System Settings Manager

**Route**: `/system` (already exists, currently thin — enhance it)

#### [MODIFY] `src/pages/system/` (existing)
- Uses `SystemAdminController_getSettings()` to load all system settings
- Grouped by category (general, mail, security, billing, etc.)
- Each setting: key, value (editable inline), description
- Save changes → `SystemAdminController_updateSetting(key, dto)`
- Also integrates `TenantSettingController_findAllSystemSettings()`

---

### Phase 2.2 — Tenant Config Overrides UI

**Route**: `/tenant-settings` (already exists, enhance)

#### [MODIFY] `src/pages/tenant-settings/` (existing)
- Load overrides: `TenantSettingController_findAllConfigOverrides()`
- Create override: `TenantSettingController_createConfigOverride(dto)` via Sheet/Dialog
- Update override: `TenantSettingController_updateConfigOverride(id, dto)` inline edit
- Tenant Admin settings: `TenantAdminController_getSettings()`, `TenantAdminController_setSetting(key)`, `TenantAdminController_deleteSetting(key)`

---

### Phase 2.3 — Role Hierarchy Viewer

**Route**: `/roles` (already exists, enhance)

#### [MODIFY] `src/pages/roles/` (existing)
- Add a "Hierarchy" tab that renders an interactive tree view of role inheritance
- Use a CSS tree or `recharts` tree layout (no external dep needed)
- Data from existing roles API
- Add Approve/Revoke role buttons: `UserController_approveRole(id, dto)` / `UserController_revokeRole(id, roleId)`

---

### Phase 2.4 — Security Events Dashboard Enhancements

**Route**: `/security` (enhance existing)

#### [MODIFY] `src/pages/security/` (existing)
- Add an "Unresolved" tab using `SecurityController_getUnresolved()`
- Trend charts (7-day sparklines) using `recharts`
- Resolution workflow: mark as resolved button

---

### Phase 2.5 — Quota Management Enhancements

**Route**: `/quotas` (enhance existing)

#### [MODIFY] `src/pages/quotas/` (existing)
- Filter by resource type → `QuotaController_findByResourceType(type)`
- Single quota detail panel → `QuotaController_findOne(id)`
- Update quota → `QuotaController_update(id, dto)` via inline Sheet
- Record usage manually → `QuotaController_recordUsage(dto)`
- Tenant quota view → `TenantAdminController_getQuotas()` and `TenantAdminController_getUsage(params)`

---

## Proposed Changes — Phase 3 (APIs Missing or Partial)

> [!WARNING]
> These features require new backend API endpoints that do not yet exist. Frontend can be built with mock data / placeholder states, but will only become functional when the API is available.

### Phase 3.1 — Email/SMTP Configuration
**Route**: `/system/smtp`
- Form: host, port, username, password, TLS toggle, sender name
- Test email button
- No API exists — implement with a stub/coming soon state

### Phase 3.2 — Feature Flags Management
**Route**: `/system/feature-flags`
- Table: flag name, enabled (toggle), scope (global/per-tenant), tenant override list
- No API exists — implement with a stub/coming soon state

### Phase 3.3 — SSO/SAML Configuration
**Route**: `/security/sso`
- Multi-provider support: SAML, OIDC, OAuth
- No API exists — implement with a stub/coming soon state

### Phase 3.4 — IP Allow/Block List
**Route**: `/security/ip-rules`
- Per-tenant IP ranges (CIDR), description, rule type (allow/block)
- No API exists — implement with a stub/coming soon state

---

## Proposed Changes — Phase 4 (Enhancements)

### Phase 4.1 — Request Log Viewer
**Route**: `/system/request-log`
- Uses `SystemController_getRequestLog()` from `system/system.ts`
- Searchable, filterable, paginated table of all API requests

### Phase 4.2 — System Health Page
**Route**: `/system/health`
- Uses `HealthController_check()` from `health/health.ts`
- Shows: DB status, redis, queue workers, memory usage

### Phase 4.3 — Tenant Admin Health Dashboard (All Tenants)
**Route**: `/tenants` (add a new "Health" tab on the tenants page)
- For each tenant, show health via `TenantController_getHealth(id)`
- Batch polling with status indicators

### Phase 4.4 — Reporting Enhancements
**Route**: `/reports` (enhance existing)
- Export to CSV on all list views (client-side)
- Scheduled report delivery UI (if API exists)

### Phase 4.5 — Dashboard Widgets
**Route**: `/` (home dashboard, enhance existing)
- Add missing widgets: subscription count, pending payments, unresolved security events
- Use `SystemAdminController_getStats()` (already called but enhance the display)

---

## New Navigation Items (Sidebar)

The following items need to be **added to** [sidebar-data.ts](file:///home/raju/Project/Nest/SaasCore/nest-saas-ui/src/components/layout/data/sidebar-data.ts):

| Group | New Item | Route |
|---|---|---|
| Billing | Dashboard | `/billing/dashboard` |
| Billing | Invoices | `/billing/invoices` |
| Security | Sessions | `/security/sessions` |
| System | Queue Monitor | `/system/queues` |
| System | Request Log | `/system/request-log` |
| System | Health | `/system/health` |

---

## New Route Files Required

Every new page needs a corresponding thin route file in `src/routes/_authenticated/`. Pattern:

```ts
// src/routes/_authenticated/billing/dashboard.tsx
import { createFileRoute } from '@tanstack/react-router'
import { BillingDashboardPage } from '@/pages/billing/billing-dashboard'

export const Route = createFileRoute('/_authenticated/billing/dashboard')({
  component: BillingDashboardPage,
})
```

---

## Technical Debt — Decisions Needed

| # | Debt Item | Recommendation |
|---|---|---|
| 1 | Generated hooks unused | Keep raw-function pattern (avoid big refactor risk) |
| 2 | Raw function duplication | Accept for now; a shared `createQuery` helper could be added later |
| 3 | Two subscription APIs | Use `billing-subscriptions/` (v2) for all new billing pages |
| 4 | Two plan APIs | Use `billing-plans/` (used), ignore `license-plans/` |
| 5 | Auth is direct | Out of scope for now |
| 6 | No root error boundary | Can be added as a 1-line wrap in `main.tsx` |
| 7 | No query key convention | The convention above formalizes this for new pages |
| 8 | No API response type safety | Accept for now, use same `as unknown as` casting |

---

## Verification Plan

### After Each Phase
- `pnpm build` — no TypeScript errors
- Navigate each new route in dev mode
- Confirm loading, error, and empty states all render correctly
- Confirm mutations trigger toast notifications and query invalidation

### Manual Verification
- Confirm API calls appear in browser Network tab with correct method + URL
- Confirm that table filters and pagination function correctly
- Confirm confirm dialogs appear before destructive actions

---

## Summary Build Order

```
Week 1 — Phase 1 (APIs exist, high impact)
  ✦ Billing dashboard + invoices
  ✦ Subscription management (upgrade/downgrade/cancel)
  ✦ Payment management (confirm/request/pending)
  ✦ Queue management dashboard
  ✦ Session management (active tokens)
  ✦ User invitation workflow

Week 2 — Phase 2 (Core enterprise)
  ✦ System settings manager (unified CRUD)
  ✦ Tenant config overrides UI
  ✦ Role hierarchy viewer + approve/revoke
  ✦ Security events enhancements
  ✦ Quota management enhancements

Week 3 — Phase 3 (Stubs for missing APIs)
  ✦ SMTP configuration (stub)
  ✦ Feature flags (stub)
  ✦ SSO/SAML (stub)
  ✦ IP rules (stub)

Week 4 — Phase 4 (Polish & enhancements)
  ✦ Request log viewer
  ✦ Health page
  ✦ Dashboard widget enhancements
  ✦ CSV export across all list views
```
