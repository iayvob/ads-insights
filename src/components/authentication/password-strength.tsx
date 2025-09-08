import { Progress } from "@/components/ui/progress"
import { Check, X } from "lucide-react"

interface PasswordStrengthProps {
  password: string
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const requirements = [
    { label: "At least 8 characters", test: (pwd: string) => pwd.length >= 8 },
    { label: "Contains uppercase letter", test: (pwd: string) => /[A-Z]/.test(pwd) },
    { label: "Contains lowercase letter", test: (pwd: string) => /[a-z]/.test(pwd) },
    { label: "Contains number", test: (pwd: string) => /\d/.test(pwd) },
    { label: "Contains special character", test: (pwd: string) => /[!@#$%^&*(),.?":{}|<>]/.test(pwd) },
  ]

  const passedRequirements = requirements.filter((req) => req.test(password))
  const strength = (passedRequirements.length / requirements.length) * 100

  const getStrengthLabel = () => {
    if (strength === 0) return "Enter password"
    if (strength <= 40) return "Weak"
    if (strength <= 80) return "Good"
    return "Strong"
  }

  const getStrengthColor = () => {
    if (strength <= 40) return "bg-red-500"
    if (strength <= 80) return "bg-yellow-500"
    return "bg-green-500"
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">Password strength</span>
        <span
          className={`font-medium ${
            strength <= 40 ? "text-red-600" : strength <= 80 ? "text-yellow-600" : "text-green-600"
          }`}
        >
          {getStrengthLabel()}
        </span>
      </div>

      <div className="relative">
        <Progress value={strength} className="h-2" />
        <div
          className={`absolute top-0 left-0 h-2 rounded-full transition-all duration-300 ${getStrengthColor()} w-[${strength}%]`}
        />
      </div>

      <div className="space-y-1">
        {requirements.map((req, index) => (
          <div key={index} className="flex items-center gap-2 text-xs">
            {req.test(password) ? (
              <Check className="h-3 w-3 text-green-500" />
            ) : (
              <X className="h-3 w-3 text-gray-400" />
            )}
            <span className={req.test(password) ? "text-green-600" : "text-gray-500"}>{req.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
