import { createFileRoute } from '@tanstack/react-router'
import { ApiKeysPage } from '@/pages/api-keys/api-keys-list'

export const Route = createFileRoute('/_authenticated/api-keys/')({
  component: ApiKeysPage,
})
