import { createFileRoute } from '@tanstack/react-router'
import { CreateGroupPage } from '@/pages/groups/group-create'

export const Route = createFileRoute('/_authenticated/groups/new')({
  component: CreateGroupPage,
})
