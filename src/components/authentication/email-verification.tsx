"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from "@/components/ui/input-otp"
import { Mail, Check, Loader2, AlertCircle, Clock, RefreshCcw } from "lucide-react"
import { cn } from "@/lib/utils"

interface EmailVerificationProps {
  onVerified?: (code: string) => void
  initialEmail?: string
  className?: string
  title?: string
  description?: string
}

type VerificationState = "initial" | "sending" | "sent" | "verifying" | "verified" | "error"

export default function EmailVerification({
  onVerified,
  initialEmail = "",
  className,
  title = "Verify Your Email",
  description = "Enter the 6-digit verification code sent to your email"
}: EmailVerificationProps) {
  const [email] = useState(initialEmail) // Make email readonly, no setter needed
  const [pin, setPin] = useState("")
  const [state, setState] = useState<VerificationState>("initial") // Start with initial, not sending
  const [error, setError] = useState("")
  const [timeLeft, setTimeLeft] = useState(0)
  const [canResend, setCanResend] = useState(true)
  const [attempts, setAttempts] = useState(0)
  const maxAttempts = 3
  const RESEND_DELAY = 60 // 60 seconds delay
  const STORAGE_KEY = `verification_last_sent_${email}`

  // Send verification code via API
  const sendVerificationCode = async (email: string) => {
    const response = await fetch("/api/auth/send-verification-code", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    })
    
    const data = await response.json()
    return { success: response.ok, error: data.error }
  }

  // Check if can send based on localStorage rate limiting
  const canSendCode = useCallback(() => {
    try {
      const lastSent = localStorage.getItem(STORAGE_KEY)
      if (!lastSent) return true
      
      const lastSentTime = parseInt(lastSent)
      const now = Date.now()
      const timeSinceLastSent = (now - lastSentTime) / 1000 // in seconds
      
      return timeSinceLastSent >= RESEND_DELAY
    } catch {
      return true // If localStorage fails, allow sending
    }
  }, [STORAGE_KEY, RESEND_DELAY])

  // Get remaining time before can resend
  const getRemainingTime = useCallback(() => {
    try {
      const lastSent = localStorage.getItem(STORAGE_KEY)
      if (!lastSent) return 0
      
      const lastSentTime = parseInt(lastSent)
      const now = Date.now()
      const timeSinceLastSent = (now - lastSentTime) / 1000
      
      return Math.max(0, RESEND_DELAY - timeSinceLastSent)
    } catch {
      return 0
    }
  }, [STORAGE_KEY, RESEND_DELAY])

  // Update localStorage when code is sent
  const updateLastSentTime = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, Date.now().toString())
    } catch {
      // Ignore localStorage errors
    }
  }, [STORAGE_KEY])

  // Initialize component state and check rate limiting on mount
  useEffect(() => {
    if (!email) return

    const canSend = canSendCode()
    if (canSend) {
      // Can send immediately
      setState("sending")
      handleSendCode()
    } else {
      // Need to wait, show sent state and start countdown
      setState("sent")
      const remaining = getRemainingTime()
      setTimeLeft(Math.ceil(remaining))
      setCanResend(false)
    }
  }, [email, canSendCode, getRemainingTime])

  // Countdown timer for resend functionality
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setCanResend(true)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [timeLeft])

  // Auto-verify when PIN is complete
  useEffect(() => {
    if (pin.length === 6 && state === "sent") {
      handleVerifyPIN()
    }
  }, [pin, state])

  const handleSendCode = useCallback(async () => {
    if (!email) {
      setError("Email address is required")
      setState("error")
      return
    }

    // Check rate limiting
    if (!canSendCode()) {
      const remaining = getRemainingTime()
      setError(`Please wait ${Math.ceil(remaining)} seconds before requesting a new code`)
      return
    }

    setState("sending")
    setError("")
    setAttempts(0)

    try {
      const result = await sendVerificationCode(email)

      if (result.success) {
        // Update localStorage with current time
        updateLastSentTime()
        
        setState("sent")
        setCanResend(false)
        setTimeLeft(RESEND_DELAY)
      } else {
        setState("error")
        setError(result.error || "Failed to send verification code")
      }
    } catch (error) {
      setState("error")
      setError(error instanceof Error ? error.message : "An unexpected error occurred. Please try again.")
    }
  }, [email, canSendCode, getRemainingTime, updateLastSentTime, RESEND_DELAY])

  const handleVerifyPIN = useCallback(async () => {
    if (pin.length !== 6) {
      setError("Please enter the complete 6-digit code")
      return
    }

    if (attempts >= maxAttempts) {
      setError("Too many incorrect attempts. Please request a new code.")
      setState("error")
      setPin("")
      return
    }

    setState("verifying")
    setError("")

    try {
      const response = await fetch("/api/auth/verify-email-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          email, 
          code: pin 
        }),
      })
      
      const data = await response.json()

      if (response.ok && data.success) {
        setState("verified")
        onVerified?.(pin) // Pass the verification code
      } else {
        setState("sent")
        setAttempts(prev => prev + 1)
        const remainingAttempts = maxAttempts - attempts - 1
        setError(data.error || `Invalid verification code. ${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining.`)
        setPin("")
      }
    } catch (error) {
      setState("error")
      setError("Verification failed. Please try again.")
    }
  }, [pin, email, onVerified, attempts, maxAttempts])

  const handleResendCode = useCallback(() => {
    if (!canSendCode()) {
      const remaining = getRemainingTime()
      setError(`Please wait ${Math.ceil(remaining)} seconds before requesting a new code`)
      return
    }

    if (canResend) {
      setPin("")
      setAttempts(0)
      setState("sending")
      handleSendCode()
    }
  }, [canSendCode, getRemainingTime, canResend, handleSendCode])

  const resetFlow = useCallback(() => {
    setPin("")
    setState("initial")
    setError("")
    setAttempts(0)
    setCanResend(true)
    setTimeLeft(0)
  }, [])

  const isEmailLocked = ["sending", "sent", "verifying", "verified"].includes(state)
  const showPinInput = ["sent", "verifying"].includes(state)
  const isLoading = ["sending", "verifying"].includes(state)
  const showEmailInput = false // Never show email input
  const showInitialState = state === "initial"

  return (
    <div className={cn("max-w-md mx-auto space-y-6 p-6", className)}>
      {/* Header */}
      <div className="text-center space-y-3">
        <div
          className={cn(
            "mx-auto w-16 h-16 rounded-full flex items-center justify-center transition-all duration-500 shadow-lg",
            {
              "bg-green-100 text-green-600 shadow-green-200": state === "verified",
              "bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-blue-200": state !== "verified",
              "animate-pulse": isLoading,
            }
          )}
        >
          {state === "verified" ? (
            <Check className="h-8 w-8" />
          ) : state === "error" ? (
            <AlertCircle className="h-8 w-8" />
          ) : (
            <Mail className="h-8 w-8" />
          )}
        </div>
        
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-gray-900">
            {state === "verified" ? "Email Verified!" : title}
          </h2>
          <p className="text-gray-600">
            {state === "verified"
              ? "Your email address has been successfully verified."
              : state === "sending"
              ? `Sending verification code to ${email}...`
              : state === "sent"
              ? `We've sent a 6-digit code to ${email}`
              : state === "initial"
              ? `Ready to send verification code to ${email}`
              : description}
          </p>
        </div>
      </div>

      {/* Initial State - Manual Send Button */}
      {showInitialState && (
        <div className="flex justify-center">
          <Button
            onClick={handleSendCode}
            disabled={!canSendCode() || isLoading}
            className="w-full max-w-sm h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-medium"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending Code...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Send Verification Code
              </>
            )}
          </Button>
        </div>
      )}

      {/* Sending Code Loading State */}
      {state === "sending" && (
        <div className="flex justify-center items-center space-x-2 text-blue-600 py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-sm font-medium">Sending verification code...</span>
        </div>
      )}

      {/* PIN Input */}
      {showPinInput && (
        <div className="space-y-4 animate-in slide-in-from-top-4 duration-300">
          <div className="text-center space-y-2">
            <Label className="text-sm font-medium">Enter Verification Code</Label>
            <p className="text-xs text-gray-500">
              Code expires in 10 minutes
            </p>
          </div>

          <div className="flex justify-center">
            <InputOTP 
              maxLength={6} 
              value={pin} 
              onChange={(value) => setPin(value)}
              disabled={state === "verifying"}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} className={cn(state === "verifying" && "opacity-50")} />
                <InputOTPSlot index={1} className={cn(state === "verifying" && "opacity-50")} />
                <InputOTPSlot index={2} className={cn(state === "verifying" && "opacity-50")} />
              </InputOTPGroup>
              <InputOTPSeparator />
              <InputOTPGroup>
                <InputOTPSlot index={3} className={cn(state === "verifying" && "opacity-50")} />
                <InputOTPSlot index={4} className={cn(state === "verifying" && "opacity-50")} />
                <InputOTPSlot index={5} className={cn(state === "verifying" && "opacity-50")} />
              </InputOTPGroup>
            </InputOTP>
          </div>

          {/* Loading indicator during auto-verification */}
          {state === "verifying" && (
            <div className="flex justify-center items-center space-x-2 text-blue-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Verifying code...</span>
            </div>
          )}

          {/* Manual Verify Button - only show if not auto-verifying */}
          {pin.length === 6 && ["sent", "verifying"].includes(state) && (
            <div className="flex justify-center">
              <Button
                onClick={handleVerifyPIN}
                disabled={state === "verifying"}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
              >
                {state === "verifying" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Verify Code
                  </>
                )}
              </Button>
            </div>
          )}

          {attempts > 0 && attempts < maxAttempts && (
            <div className="text-center">
              <p className="text-sm text-amber-600">
                {maxAttempts - attempts} attempt{maxAttempts - attempts !== 1 ? 's' : ''} remaining
              </p>
            </div>
          )}
        </div>
      )}

      {/* Resend Code */}
      {(state === "sent" || state === "error") && (
        <div className="text-center space-y-3 border-t pt-4">
          <p className="text-sm text-gray-600">Didn't receive the code?</p>
          <div className="flex justify-center">
            {canResend ? (
              <Button 
                variant="outline" 
                onClick={handleResendCode}
                className="text-blue-600 border-blue-200 hover:bg-blue-50"
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                Resend Code
              </Button>
            ) : (
              <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
                <Clock className="h-4 w-4" />
                <span>Resend in {timeLeft}s</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <Alert variant="destructive" className="animate-in slide-in-from-top-2 duration-200">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Success Message */}
      {state === "verified" && (
        <Alert className="border-green-200 bg-green-50 animate-in slide-in-from-top-2 duration-200">
          <Check className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Your email has been successfully verified! You can now proceed with confidence.
          </AlertDescription>
        </Alert>
      )}

      {/* Progress indicator */}
      <div className="flex justify-center space-x-2 pt-2">
        {["initial", "sent", "verified"].map((step, index) => (
          <div
            key={step}
            className={cn(
              "w-2 h-2 rounded-full transition-all duration-300",
              {
                "bg-blue-500": 
                  (step === "initial" && ["initial", "sending"].includes(state)) ||
                  (step === "sent" && ["sent", "verifying"].includes(state)) ||
                  (step === "verified" && state === "verified"),
                "bg-gray-300": 
                  (step === "initial" && !["initial", "sending"].includes(state)) ||
                  (step === "sent" && !["sent", "verifying"].includes(state)) ||
                  (step === "verified" && state !== "verified"),
              }
            )}
          />
        ))}
      </div>
    </div>
  )
}