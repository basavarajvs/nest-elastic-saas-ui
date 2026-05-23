import { createFileRoute } from '@tanstack/react-router'
import { GroupsPage } from '@/pages/groups/groups-list'

export const Route = createFileRoute('/_authenticated/groups/')({
  component: GroupsPage,
})
