import { createFileRoute } from '@tanstack/react-router'
import { EditProfilePage } from '@/pages/profile/edit'

export const Route = createFileRoute('/_authenticated/profile/edit')({
  component: EditProfilePage,
})
