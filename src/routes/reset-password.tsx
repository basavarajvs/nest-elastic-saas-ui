import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { ResetPasswordPage } from '@/pages/auth/reset-password'

const searchSchema = z.object({
  token: z.string().optional(),
})

export const Route = createFileRoute('/reset-password')({
  component: ResetPasswordPage,
  validateSearch: searchSchema,
})
