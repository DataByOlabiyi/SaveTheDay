'use client'

import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  message: string
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="min-h-screen bg-obsidian flex flex-col items-center justify-center px-6 text-center">
          <div
            className="w-16 h-16 rounded-full mx-auto mb-8 flex items-center justify-center"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(201, 168, 76, 0.08) 0%, transparent 70%)',
              border: '1px solid rgba(201, 168, 76, 0.15)',
            }}
          >
            <span className="font-display text-gold" style={{ fontSize: '1.5rem', fontStyle: 'italic' }}>!</span>
          </div>
          <h1
            className="font-display text-ivory/60 mb-3"
            style={{ fontSize: 'clamp(1.25rem, 4vw, 2rem)', fontWeight: 300 }}
          >
            Something went wrong
          </h1>
          <p className="font-body text-ivory/25 text-sm max-w-xs leading-relaxed mb-8">
            We hit an unexpected error loading this page. Please try refreshing.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="font-body text-obsidian bg-gold hover:bg-gold-light text-xs tracking-widest uppercase px-8 py-3 transition-colors"
          >
            Refresh page
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
