import { createFileRoute } from '@tanstack/react-router'
import { RoleDetailPage } from '@/pages/roles/role-detail'

export const Route = createFileRoute('/_authenticated/roles/$id')({
  component: RoleDetailPage,
})
