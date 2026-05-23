import { createFileRoute } from '@tanstack/react-router'
import { SessionsPage } from '@/pages/security/sessions'

export const Route = createFileRoute('/_authenticated/security/sessions')({
  component: SessionsPage,
})
