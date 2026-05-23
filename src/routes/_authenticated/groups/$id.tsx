import { createFileRoute } from '@tanstack/react-router'
import { GroupDetailPage } from '@/pages/groups/group-detail'

export const Route = createFileRoute('/_authenticated/groups/$id')({
  component: GroupDetailPage,
})
