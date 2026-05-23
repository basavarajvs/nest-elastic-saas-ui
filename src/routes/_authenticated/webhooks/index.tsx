import { createFileRoute } from '@tanstack/react-router'
import { WebhooksPage } from '@/pages/webhooks/webhooks-list'

export const Route = createFileRoute('/_authenticated/webhooks/')({
  component: WebhooksPage,
})
