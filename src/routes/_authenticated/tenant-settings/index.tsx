import { createFileRoute } from '@tanstack/react-router'
import { TenantSettingsPage } from '@/pages/settings/tenant-settings'

export const Route = createFileRoute('/_authenticated/tenant-settings/')({
  component: TenantSettingsPage,
})
