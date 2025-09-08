import { useState } from 'react'

interface EmailVerificationState {
  isLoading: boolean
  error: string | null
  success: boolean
  message: string | null
}

export function useEmailVerification() {
  const [state, setState] = useState<EmailVerificationState>({
    isLoading: false,
    error: null,
    success: false,
    message: null
  })

  const sendVerificationCode = async (email: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null, success: false }))
    
    try {
      const response = await fetch('/api/auth/send-verification-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send verification code')
      }

      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        success: true, 
        message: data.message || 'Verification code sent successfully' 
      }))

      return { success: true, data }
    } catch (error: any) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error.message || 'Failed to send verification code' 
      }))
      return { success: false, error: error.message }
    }
  }

  const verifyEmailCode = async (email: string, code: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null, success: false }))
    
    try {
      const response = await fetch('/api/auth/verify-email-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, code }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify code')
      }

      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        success: true, 
        message: data.message || 'Email verified successfully' 
      }))

      return { success: true, data }
    } catch (error: any) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error.message || 'Failed to verify code' 
      }))
      return { success: false, error: error.message }
    }
  }

  const resetState = () => {
    setState({
      isLoading: false,
      error: null,
      success: false,
      message: null
    })
  }

  return {
    ...state,
    sendVerificationCode,
    verifyEmailCode,
    resetState
  }
}
