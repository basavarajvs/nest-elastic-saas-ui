import { createFileRoute } from '@tanstack/react-router'
import { CreateUserPage } from '@/pages/users/user-create'

export const Route = createFileRoute('/_authenticated/users/new')({
  component: CreateUserPage,
})
