import { createFileRoute } from '@tanstack/react-router'
import { NotificationTemplatesPage } from '@/pages/communication/templates-list'

export const Route = createFileRoute('/_authenticated/notification-templates/')({
  component: NotificationTemplatesPage,
})
