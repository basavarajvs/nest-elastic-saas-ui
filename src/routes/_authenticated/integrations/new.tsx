import { createFileRoute } from '@tanstack/react-router'
import { CreateIntegrationPage } from '@/pages/integrations/integration-create'

export const Route = createFileRoute('/_authenticated/integrations/new')({
  component: CreateIntegrationPage,
})
