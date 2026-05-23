import { createFileRoute } from '@tanstack/react-router'
import { FeatureFlagsPage } from '@/pages/system/feature-flags'

export const Route = createFileRoute('/_authenticated/system/feature-flags')({
  component: FeatureFlagsPage,
})
