import { createFileRoute } from '@tanstack/react-router'
import { CreateWebhookPage } from '@/pages/webhooks/webhook-create'

export const Route = createFileRoute('/_authenticated/webhooks/new')({
  component: CreateWebhookPage,
})
