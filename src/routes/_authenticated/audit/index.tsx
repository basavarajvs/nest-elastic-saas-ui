import { createFileRoute } from '@tanstack/react-router'
import { AuditLogsPage } from '@/pages/audit/audit-logs'

export const Route = createFileRoute('/_authenticated/audit/')({
  component: AuditLogsPage,
})
