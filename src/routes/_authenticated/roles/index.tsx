import { createFileRoute } from '@tanstack/react-router'
import { RolesPage } from '@/pages/roles/roles-list'

export const Route = createFileRoute('/_authenticated/roles/')({
  component: RolesPage,
})
