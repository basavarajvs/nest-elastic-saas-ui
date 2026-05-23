import { createFileRoute } from '@tanstack/react-router'
import { ProfileOverviewPage } from '@/pages/profile/profile-overview'

export const Route = createFileRoute('/_authenticated/profile/')({
  component: ProfileOverviewPage,
})
