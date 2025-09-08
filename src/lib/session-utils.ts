import axios from "axios";
import { logger } from "@/config/logger";

export interface SessionUpdateResult {
  success: boolean;
  error?: string;
  plan?: string;
}

/**
 * Update the user's plan in the session cookies
 * This should be called after successful payment verification
 */
export async function updateSessionPlan(plan: 'FREEMIUM' | 'PREMIUM_MONTHLY' | 'PREMIUM_YEARLY'): Promise<SessionUpdateResult> {
  try {
    const response = await axios.post("/api/payments/update-session", {
      plan,
    });

    if (response.data.success) {
      logger.info("Session plan updated successfully", { plan });
      return {
        success: true,
        plan,
      };
    } else {
      logger.error("Failed to update session plan", { 
        plan, 
        error: response.data.error 
      });
      return {
        success: false,
        error: response.data.error || "Failed to update session",
      };
    }
  } catch (error) {
    logger.error("Session plan update request failed", { plan, error });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

/**
 * Map payment plan IDs to subscription plan types
 */
export function mapPaymentPlanToSubscriptionPlan(paymentPlanId: string): 'FREEMIUM' | 'PREMIUM_MONTHLY' | 'PREMIUM_YEARLY' {
  const planMapping: { [key: string]: 'FREEMIUM' | 'PREMIUM_MONTHLY' | 'PREMIUM_YEARLY' } = {
    'monthly': 'PREMIUM_MONTHLY',
    'yearly': 'PREMIUM_YEARLY',
    'premium_monthly': 'PREMIUM_MONTHLY',
    'premium_yearly': 'PREMIUM_YEARLY',
    'freemium': 'FREEMIUM',
  };

  return planMapping[paymentPlanId?.toLowerCase()] || 'PREMIUM_MONTHLY';
}

/**
 * Update session after successful payment
 * Combines payment plan mapping and session update
 */
export async function updateSessionAfterPayment(paymentPlanId: string): Promise<SessionUpdateResult> {
  const plan = mapPaymentPlanToSubscriptionPlan(paymentPlanId);
  return updateSessionPlan(plan);
}
