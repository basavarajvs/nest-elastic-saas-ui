import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { MfaPage } from '@/pages/auth/mfa'

const searchSchema = z.object({
  email: z.string().email().optional(),
})

export const Route = createFileRoute('/mfa')({
  component: MfaPage,
  validateSearch: searchSchema,
})
