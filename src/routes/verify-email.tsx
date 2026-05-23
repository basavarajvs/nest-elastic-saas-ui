import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { VerifyEmailPage } from '@/pages/auth/verify-email'

const searchSchema = z.object({
  token: z.string().optional(),
})

export const Route = createFileRoute('/verify-email')({
  component: VerifyEmailPage,
  validateSearch: searchSchema,
})
