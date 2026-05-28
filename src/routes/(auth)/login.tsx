import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { LoginPage } from '@/pages/auth/login'

const searchSchema = z.object({
  redirect: z.string().optional(),
})

export const Route = createFileRoute('/(auth)/login')({
  component: LoginPage,
  validateSearch: searchSchema,
})
