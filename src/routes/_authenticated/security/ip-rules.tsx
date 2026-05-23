import { createFileRoute } from '@tanstack/react-router'
import { IpRulesPage } from '@/pages/security/ip-rules'

export const Route = createFileRoute('/_authenticated/security/ip-rules')({
  component: IpRulesPage,
})
