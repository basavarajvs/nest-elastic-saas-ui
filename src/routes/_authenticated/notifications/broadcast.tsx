import { createFileRoute } from '@tanstack/react-router'
import { BroadcastNotificationPage } from '@/pages/communication/notifications-broadcast'

export const Route = createFileRoute('/_authenticated/notifications/broadcast')({
  component: BroadcastNotificationPage,
})
