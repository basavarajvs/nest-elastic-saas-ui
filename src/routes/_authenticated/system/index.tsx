import { createFileRoute } from '@tanstack/react-router'
import { SystemSettingsPage } from '@/pages/settings/system-settings'

export const Route = createFileRoute('/_authenticated/system/')({
  component: SystemSettingsPage,
})
