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
  Wrench,
  Palette,
  Monitor,
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
        { title: 'License Plans', url: '/license-plans', icon: CreditCard, pattern: '^/license-plans(/|$)' },
        { title: 'Subscriptions', url: '/subscriptions', icon: Banknote, pattern: '^/subscriptions(/|$)' },
        { title: 'Payments', url: '/billing/payments', icon: Banknote, pattern: '^/billing/payments(/|$)' },
      ],
    },
    {
      title: 'Integrations',
      items: [
        { title: 'API Keys', url: '/api-keys', icon: Key, pattern: '^/api-keys(/|$)' },
        { title: 'Webhooks', url: '/webhooks', icon: Webhook, pattern: '^/webhooks(/|$)' },
        { title: 'Integrations', url: '/integrations', icon: Puzzle, pattern: '^/integrations(/|$)' },
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
        { title: 'Security Events', url: '/security', icon: ShieldAlert, pattern: '^/security(/|$)' },
        { title: 'Compliance', url: '/compliance', icon: ShieldCheck, pattern: '^/compliance(/|$)' },
        { title: 'Resource Quotas', url: '/quotas', icon: Gauge, pattern: '^/quotas(/|$)' },
      ],
    },
    {
      title: 'System',
      items: [
        { title: 'System Settings', url: '/system', icon: Settings, pattern: '^/system(/|$)' },
        { title: 'Tenant Settings', url: '/tenant-settings', icon: Sliders, pattern: '^/tenant-settings(/|$)' },
        { title: 'Reports', url: '/reports', icon: FileText, pattern: '^/reports(/|$)' },
      ],
    },
    {
      title: 'Settings',
      items: [
        {
          title: 'My Settings',
          icon: UserCog,
          pattern: '^/settings',
          items: [
            { title: 'Profile', url: '/settings', icon: UserCog, pattern: '^/settings$' },
            { title: 'Account', url: '/settings/account', icon: Wrench, pattern: '^/settings/account(/|$)' },
            { title: 'Appearance', url: '/settings/appearance', icon: Palette, pattern: '^/settings/appearance(/|$)' },
            { title: 'Notifications', url: '/settings/notifications', icon: Bell, pattern: '^/settings/notifications(/|$)' },
            { title: 'Display', url: '/settings/display', icon: Monitor, pattern: '^/settings/display(/|$)' },
          ],
        },
      ],
    },
  ],
}
