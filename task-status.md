# SaaS Admin Portal — Task Tracker

## Phase 1 — High Impact (APIs Exist)

### 1.1 Billing Dashboard
- [x] `src/pages/billing/billing-dashboard.tsx`
- [x] `src/routes/_authenticated/billing/dashboard.tsx`
- [x] Sidebar: add Billing > Dashboard

### 1.2 Invoice Viewer
- [x] `src/pages/billing/invoices-list.tsx`
- [x] `src/pages/billing/invoice-detail.tsx`
- [x] `src/routes/_authenticated/billing/invoices.tsx`
- [x] `src/routes/_authenticated/billing/invoices.$id.tsx`
- [x] Sidebar: add Billing > Invoices

### 1.3 Subscription Management Enhancements
- [x] Enhance `src/pages/subscriptions/` with upgrade/downgrade/cancel dialogs

### 1.4 Payment Management Enhancements
- [x] Enhance `src/pages/billing/payments.tsx` with pending, confirm, request

### 1.5 Queue Management Dashboard
- [x] `src/pages/system/queues-dashboard.tsx`
- [x] `src/routes/_authenticated/system/queues.tsx`
- [x] Sidebar: add System > Queue Monitor

### 1.6 User Invitation Workflow
- [x] Enhance `src/pages/users/users-list.tsx` with invite Sheet + pending tab
- [x] Enhance `src/pages/users/user-detail.tsx` with edit/delete/resetPin

### 1.7 Session Management
- [x] `src/pages/security/sessions.tsx` (stub — TokenController API not in generated client)
- [x] `src/routes/_authenticated/security/sessions.tsx`
- [x] Sidebar: add Security > Sessions

## Phase 2 — Core Enterprise

### 2.1 System Settings Manager
- [x] Enhance `src/pages/system/` with CRUD for settings

### 2.2 Tenant Config Overrides
- [x] Enhance `src/pages/tenant-settings/` with overrides CRUD (tabs + full CRUD for config overrides)

### 2.3 Role Hierarchy Viewer
- [x] Enhance `/roles` with hierarchy tab + tree view (approve/revoke noted on user pages)

### 2.4 Security Events Enhancements
- [x] Enhance `/security` with unresolved tab + trend bar chart (recharts)

### 2.5 Quota Management Enhancements
- [x] Enhance `/quotas` with detail/edit dialog, record usage, actions, update API

## Phase 3 — Stubs for Missing APIs
- [x] SMTP Configuration page (stub) + route + sidebar
- [x] Feature Flags page (stub) + route + sidebar
- [x] SSO/SAML page (stub) + route + sidebar
- [x] IP Allow/Block page (stub) + route + sidebar

## Phase 4 — Polish & Enhancements
- [x] Request Log Viewer + route + sidebar
- [x] System Health Page + route + sidebar
- [x] Dashboard widget enhancements (existing rich KPIs + security)
- [x] CSV export on list views (roles, quotas + reusable pattern)
