import { createFileRoute } from '@tanstack/react-router'
import { SecurityEventsPage } from '@/pages/security/security-events'

export const Route = createFileRoute('/_authenticated/security/')({
  component: SecurityEventsPage,
})
