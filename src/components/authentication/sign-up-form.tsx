"use client";

import type React from "react";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { User, Mail, Lock, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { Checkbox } from "../ui/checkbox";
import EmailVerification from "./email-verification";
import { PasswordStrength } from "./password-strength";
import axios from "axios";
import { toast } from "../ui/use-toast";

export function SignUpForm() {
  const [step, setStep] = useState<"form" | "verification">("form");
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long");
      setIsLoading(false);
      return;
    }

    // Just proceed to verification step without sending code here
    // The EmailVerification component will handle sending the code
    setStep("verification");
    setIsLoading(false);
  };

  const handleVerification = async (code: string) => {
    setIsLoading(true);
    setError("");

    try {
      const verifyResult = await axios.post(
        "/api/auth/verify-email-code",
        {
          email: formData.email,
          code,
        },
        {
          withCredentials: true,
        }
      );
      if (verifyResult.data.success) {
        if(formData.username.length < 3 || formData.username.length > 30) {
          setError("Username must be between 3 and 30 characters");
          setIsLoading(false);
          return;
        }

        if(formData.password !== formData.confirmPassword) {
          setError("Passwords do not match");
          setIsLoading(false);
          return;
        }

        if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
          setError("Username can only contain letters, numbers, and underscores");
          setIsLoading(false);
          return;
        }

        const endData = {
          email: formData.email,
          username: formData.username,
          password: formData.password,
        };

        const result = await axios.post("/api/auth/signup", endData, {
          withCredentials: true,
        });

        if (result.data.success) {
          toast({
            title: "Account Created Successfully",
            description: "Your account has been created. Redirecting to profile setup...",
            variant: "default",
          });
          
          // Redirect to profile connections tab after 2 seconds
          setTimeout(() => {
            window.location.href = "/profile?tab=connections";
          }, 2000);
        } else {
          setError(result.data.error || "Failed to create account");
        }
      } else {
        setError(verifyResult.data.error || "Invalid verification code");
      }
    } catch (error: any) {
      if (axios.isAxiosError(error) && error.response) {
        const statusCode = error.response.status;
        const errorMessage = error.response.data?.error || "An error occurred";
        
        if (statusCode === 409) {
          setError("This email or username is already taken. Please try a different one.");
        } else if (statusCode === 422) {
          setError("Please check your information and try again.");
        } else if (statusCode === 429) {
          setError("Too many signup attempts. Please try again later.");
        } else {
          setError(errorMessage);
        }
      } else {
        setError(error?.message || "An unexpected error occurred while creating your account");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (step === "verification") {
    return (
      <EmailVerification 
        initialEmail={formData.email}
        onVerified={(code: string) => handleVerification(code)} 
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <div className="relative">
          <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            id="username"
            type="text"
            placeholder="Enter your username"
            value={formData.username}
            onChange={(e) => handleInputChange("username", e.target.value)}
            className="pl-10"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            id="email"
            type="email"
            placeholder="Enter your email"
            value={formData.email}
            onChange={(e) => handleInputChange("email", e.target.value)}
            className="pl-10"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            id="password"
            type="password"
            placeholder="Create a password"
            value={formData.password}
            onChange={(e) => handleInputChange("password", e.target.value)}
            className="pl-10"
            required
          />
        </div>
      </div>

      {formData.password && <PasswordStrength password={formData.password} />}

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            id="confirmPassword"
            type="password"
            placeholder="Confirm your password"
            value={formData.confirmPassword}
            onChange={(e) =>
              handleInputChange("confirmPassword", e.target.value)
            }
            className="pl-10"
            required
          />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox required className="accent-blue-600" />
        <Label htmlFor="privacyPolicy" className="text-sm">
          I agree to the{" "}
          <a
            href="/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-blue-600 hover:text-blue-800"
          >
            Privacy Policy
          </a>{" "}
          and{" "}
          <a
            href="/terms-of-service"
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-blue-600 hover:text-blue-800"
          >
            Terms of Service
          </a>{" "}
          and{" "}
          <a
            href="/refund-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-blue-600 hover:text-blue-800"
          >
            Refund Policy
          </a>
        </Label>
      </div>

      <Button
        type="submit"
        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
        disabled={isLoading}
      >
        {isLoading ? "Creating Account..." : "Create Account"}
      </Button>
    </form>
  );
}
