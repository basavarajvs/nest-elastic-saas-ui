import { createFileRoute } from '@tanstack/react-router'
import { UserSettingsPage } from '@/pages/profile/settings'

export const Route = createFileRoute('/_authenticated/profile/settings')({
  component: UserSettingsPage,
})
