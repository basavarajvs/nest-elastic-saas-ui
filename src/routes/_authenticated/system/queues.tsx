import { createFileRoute } from '@tanstack/react-router'
import { QueuesDashboardPage } from '@/pages/system/queues-dashboard'

export const Route = createFileRoute('/_authenticated/system/queues')({
  component: QueuesDashboardPage,
})
