import { createFileRoute } from '@tanstack/react-router'
import { ApiKeyDetailPage } from '@/pages/api-keys/api-key-detail'

export const Route = createFileRoute('/_authenticated/api-keys/$id')({
  component: ApiKeyDetailPage,
})
