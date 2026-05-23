import { createFileRoute } from '@tanstack/react-router'
import { IntegrationsPage } from '@/pages/integrations/integrations-list'

export const Route = createFileRoute('/_authenticated/integrations/')({
  component: IntegrationsPage,
})
