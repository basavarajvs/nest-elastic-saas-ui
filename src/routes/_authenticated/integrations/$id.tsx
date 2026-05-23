import { createFileRoute } from '@tanstack/react-router'
import { IntegrationDetailPage } from '@/pages/integrations/integration-detail'

export const Route = createFileRoute('/_authenticated/integrations/$id')({
  component: IntegrationDetailPage,
})
