import type { NavItem, NavGroup } from '@/components/layout/types'

export type { NavItem, NavGroup }

export const mainNavItems: NavGroup[] = [
  {
    title: 'Platform',
    items: [
      {
        title: 'Tenants',
        items: [
          { title: 'All Tenants', url: '/tenants' },
          { title: 'Plans', url: '/tenants/plans' },
        ],
      },
      {
        title: 'Users',
        items: [
          { title: 'All Users', url: '/users' },
          { title: 'Groups', url: '/groups' },
        ],
      },
      { title: 'Roles & Permissions', url: '/roles' },
      { title: 'Audit Logs', url: '/audit' },
    ],
  },
  {
    title: 'Billing',
    items: [
      { title: 'License Plans', url: '/license-plans' },
      { title: 'Subscriptions', url: '/subscriptions' },
    ],
  },
]
