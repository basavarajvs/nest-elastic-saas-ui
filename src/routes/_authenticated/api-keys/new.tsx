import { createFileRoute } from '@tanstack/react-router'
import { CreateApiKeyPage } from '@/pages/api-keys/api-key-create'

export const Route = createFileRoute('/_authenticated/api-keys/new')({
  component: CreateApiKeyPage,
})
