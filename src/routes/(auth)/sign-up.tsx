import { createFileRoute } from '@tanstack/react-router'
import { RegisterPage } from '@/pages/auth/register'

export const Route = createFileRoute('/(auth)/sign-up')({
  component: RegisterPage,
})
