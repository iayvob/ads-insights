'use client';
import { motion } from 'framer-motion';
import { Progress } from '@/components/ui/progress';
import { Check, X } from 'lucide-react';

interface PasswordStrengthProps {
  password: string;
}

interface PasswordRule {
  label: string;
  test: (password: string) => boolean;
}

const passwordRules: PasswordRule[] = [
  {
    label: 'At least 8 characters',
    test: (password) => password.length >= 8,
  },
  {
    label: 'Contains uppercase letter',
    test: (password) => /[A-Z]/.test(password),
  },
  {
    label: 'Contains lowercase letter',
    test: (password) => /[a-z]/.test(password),
  },
  {
    label: 'Contains number',
    test: (password) => /\d/.test(password),
  },
  {
    label: 'Contains special character',
    test: (password) => /[!@#$%^&*(),.?":{}|<>]/.test(password),
  },
];

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const passedRules = passwordRules.filter((rule) => rule.test(password));
  const strength = (passedRules.length / passwordRules.length) * 100;

  const getStrengthLabel = () => {
    if (strength === 0) return 'No password';
    if (strength <= 20) return 'Very Weak';
    if (strength <= 40) return 'Weak';
    if (strength <= 60) return 'Fair';
    if (strength <= 80) return 'Good';
    return 'Strong';
  };

  const getStrengthColor = () => {
    if (strength <= 20) return 'bg-red-500';
    if (strength <= 40) return 'bg-orange-500';
    if (strength <= 60) return 'bg-yellow-500';
    if (strength <= 80) return 'bg-blue-500';
    return 'bg-green-500';
  };

  if (!password) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Password Strength</span>
          <span
            className={`text-sm font-medium ${
              strength <= 40
                ? 'text-red-600'
                : strength <= 80
                  ? 'text-yellow-600'
                  : 'text-green-600'
            }`}
          >
            {getStrengthLabel()}
          </span>
        </div>
        <div className="space-y-2">
          <Progress
            value={strength}
            className={`h-2 ${
              strength <= 40
                ? '[&>div]:bg-red-500'
                : strength <= 80
                  ? '[&>div]:bg-yellow-500'
                  : '[&>div]:bg-green-500'
            }`}
          />
        </div>
      </div>

      <div className="space-y-1">
        {passwordRules.map((rule, index) => {
          const passed = rule.test(password);
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`flex items-center space-x-2 text-sm ${
                passed ? 'text-green-600' : 'text-gray-500'
              }`}
            >
              {passed ? (
                <Check className="h-3 w-3" />
              ) : (
                <X className="h-3 w-3" />
              )}
              <span>{rule.label}</span>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
