import { createFileRoute } from '@tanstack/react-router'
import { WebhookDetailPage } from '@/pages/webhooks/webhook-detail'

export const Route = createFileRoute('/_authenticated/webhooks/$id')({
  component: WebhookDetailPage,
})
