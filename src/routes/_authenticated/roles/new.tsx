import { createFileRoute } from '@tanstack/react-router'
import { CreateRolePage } from '@/pages/roles/role-create'

export const Route = createFileRoute('/_authenticated/roles/new')({
  component: CreateRolePage,
})
