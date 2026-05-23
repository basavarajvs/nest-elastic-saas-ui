import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

type Props = {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

type State = {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.props.onError?.(error, errorInfo)
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught:', error, errorInfo)
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className='flex h-svh flex-col items-center justify-center gap-4 p-6 text-center'>
          <AlertTriangle className='h-12 w-12 text-destructive' />
          <h2 className='text-xl font-semibold'>Something went wrong</h2>
          <p className='max-w-md text-sm text-muted-foreground'>
            {this.state.error?.message ?? 'An unexpected error occurred.'}
          </p>
          <Button onClick={this.handleReset} variant='outline'>
            Try again
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}
