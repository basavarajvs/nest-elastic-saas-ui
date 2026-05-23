import { createFileRoute } from '@tanstack/react-router'
import { SecuritySettingsPage } from '@/pages/profile/security'

export const Route = createFileRoute('/_authenticated/profile/security')({
  component: SecuritySettingsPage,
})
