import { createFileRoute } from '@tanstack/react-router'
import { CreateNotificationTemplatePage } from '@/pages/communication/template-create'

export const Route = createFileRoute('/_authenticated/notification-templates/new')({
  component: CreateNotificationTemplatePage,
})
