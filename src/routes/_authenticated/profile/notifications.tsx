import { createFileRoute } from '@tanstack/react-router'
import { NotificationPreferencesPage } from '@/pages/profile/notifications'

export const Route = createFileRoute('/_authenticated/profile/notifications')({
  component: NotificationPreferencesPage,
})
