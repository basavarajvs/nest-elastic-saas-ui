import { createFileRoute } from '@tanstack/react-router'
import { UserDetailPage } from '@/pages/users/user-detail'
import { z } from 'zod'

export const Route = createFileRoute('/_authenticated/users/$id')({
  component: UserDetailPage,
  validateSearch: z.object({
    edit: z.string().optional(),
  }),
})
