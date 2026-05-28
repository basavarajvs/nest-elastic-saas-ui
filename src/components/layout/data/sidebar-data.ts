import {
  LayoutDashboard,
  Building2,
  Users,
  Shield,
  Group,
  ScrollText,
  CreditCard,
  Banknote,
  Key,
  Webhook,
  Puzzle,
  Bell,
  Mail,
  ShieldAlert,
  ShieldCheck,
  Gauge,
  Settings,
  Sliders,
  FileText,
  UserCog,
  Server,
  Settings2,
  Heart,
} from 'lucide-react'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  user: {
    name: 'Admin User',
    email: 'admin@saas-core.com',
    avatar: '/avatars/shadcn.jpg',
  },
  teams: [
    {
      name: 'SaaS Core',
      logo: LayoutDashboard,
      plan: 'System Admin',
    },
  ],
  navGroups: [
    {
      title: 'Overview',
      items: [
        {
          title: 'Dashboard',
          url: '/',
          icon: LayoutDashboard,
          pattern: '^/$',
        },
      ],
    },
    {
      title: 'Platform',
      items: [
        {
          title: 'Tenants',
          icon: Building2,
          pattern: '^/tenants',
          items: [
            { title: 'All Tenants', url: '/tenants', icon: Building2, pattern: '^/tenants$|^/tenants/' },
            { title: 'Plans', url: '/tenants/plans', icon: CreditCard, pattern: '^/tenants/plans$' },
          ],
        },
        {
          title: 'Users',
          icon: Users,
          pattern: '^/users|^/groups',
          items: [
            { title: 'All Users', url: '/users', icon: Users, pattern: '^/users$|^/users/' },
            { title: 'Groups', url: '/groups', icon: Group, pattern: '^/groups$|^/groups/' },
          ],
        },
        { title: 'Roles & Permissions', url: '/roles', icon: Shield, pattern: '^/roles(/|$)' },
        { title: 'Audit Logs', url: '/audit', icon: ScrollText, pattern: '^/audit(/|$)' },
      ],
    },
    {
      title: 'Billing',
      items: [
        { title: 'Dashboard', url: '/billing/dashboard', icon: LayoutDashboard, pattern: '^/billing/dashboard(/|$)' },
        { title: 'Invoices', url: '/billing/invoices', icon: FileText, pattern: '^/billing/invoices(/|$)' },
        { title: 'License Plans', url: '/license-plans', icon: CreditCard, pattern: '^/license-plans(/|$)' },
        { title: 'Subscriptions', url: '/subscriptions', icon: Banknote, pattern: '^/subscriptions(/|$)' },
        { title: 'Payments', url: '/billing/payments', icon: Banknote, pattern: '^/billing/payments(/|$)' },
      ],
    },
    {
      title: 'System',
      items: [
        { title: 'System Settings', url: '/system', icon: Settings, pattern: '^/system(/|$)' },
        { title: 'Global Settings', url: '/system/settings', icon: Settings2, pattern: '^/system/settings(/|$)' },
        { title: 'Queue Monitor', url: '/system/queues', icon: Server, pattern: '^/system/queues(/|$)' },
        { title: 'Request Log', url: '/system/request-log', icon: ScrollText, pattern: '^/system/request-log(/|$)' },
        { title: 'Health', url: '/system/health', icon: Heart, pattern: '^/system/health(/|$)' },
        { title: 'API Keys', url: '/api-keys', icon: Key, pattern: '^/api-keys(/|$)' },
        { title: 'Webhooks', url: '/webhooks', icon: Webhook, pattern: '^/webhooks(/|$)' },
        { title: 'Integrations', url: '/integrations', icon: Puzzle, pattern: '^/integrations(/|$)' },
        { title: 'SMTP', url: '/system/smtp', icon: Mail, pattern: '^/system/smtp(/|$)' },
        { title: 'Feature Flags', url: '/system/feature-flags', icon: Settings2, pattern: '^/system/feature-flags(/|$)' },
        { title: 'Tenant Settings', url: '/tenant-settings', icon: Sliders, pattern: '^/tenant-settings(/|$)' },
        { title: 'Reports', url: '/reports', icon: FileText, pattern: '^/reports(/|$)' },
      ],
    },
    {
      title: 'Communication',
      items: [
        { title: 'Notifications', url: '/notifications', icon: Bell, pattern: '^/notifications(/|$)' },
        { title: 'Templates', url: '/notification-templates', icon: Mail, pattern: '^/notification-templates(/|$)' },
      ],
    },
    {
      title: 'Security',
      items: [
        { title: 'Sessions', url: '/security/sessions', icon: LayoutDashboard, pattern: '^/security/sessions(/|$)' },
        { title: 'Security Events', url: '/security', icon: ShieldAlert, pattern: '^/security(/|$)' },
        { title: 'SSO / SAML', url: '/security/sso', icon: ShieldCheck, pattern: '^/security/sso(/|$)' },
        { title: 'IP Rules', url: '/security/ip-rules', icon: ShieldAlert, pattern: '^/security/ip-rules(/|$)' },
        { title: 'Compliance', url: '/compliance', icon: ShieldCheck, pattern: '^/compliance(/|$)' },
        { title: 'Resource Quotas', url: '/quotas', icon: Gauge, pattern: '^/quotas(/|$)' },
      ],
    },
    {
      title: 'Settings',
      items: [
        {
          title: 'My Settings',
          url: '/settings',
          icon: UserCog,
          pattern: '^/settings',
        },
      ],
    },
  ],
}
