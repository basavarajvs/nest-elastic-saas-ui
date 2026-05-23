import { createFileRoute } from '@tanstack/react-router'
import { NotificationTemplateDetailPage } from '@/pages/communication/template-detail'

export const Route = createFileRoute('/_authenticated/notification-templates/$id')({
  component: NotificationTemplateDetailPage,
})
