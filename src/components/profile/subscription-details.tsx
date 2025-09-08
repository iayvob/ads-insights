"use client";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Crown,
  CreditCard,
  Download,
  ExternalLink,
  Calendar,
  DollarSign,
  TrendingUp,
  Sparkles,
  AlertCircle,
  CheckCircle,
  X,
  RefreshCw,
} from "lucide-react";
import { Subscription, Invoice } from "@/hooks/use-profile";
import { useState } from "react";

interface SubscriptionDetailsProps {
  subscription: Subscription | null;
  invoices: Invoice[];
  isPremium: boolean;
  loading?: boolean;
  error?: string | null;
  onManageSubscription?: (action: 'cancel' | 'reactivate', subscriptionId: string) => Promise<boolean>;
}

export function SubscriptionDetails({ 
  subscription, 
  invoices, 
  isPremium, 
  loading = false, 
  error = null,
  onManageSubscription 
}: SubscriptionDetailsProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "bg-green-100 text-green-800 border-green-200";
      case "canceled":
        return "bg-red-100 text-red-800 border-red-200";
      case "past_due":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "trialing":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const handleSubscriptionAction = async (action: 'cancel' | 'reactivate') => {
    if (!subscription?.id || !onManageSubscription) return;
    
    setActionLoading(action);
    try {
      await onManageSubscription(action, subscription.id);
    } finally {
      setActionLoading(null);
    }
  };

  const isNearExpiry = (dateString?: string) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    const now = new Date();
    const daysDiff = Math.ceil((date.getTime() - now.getTime()) / (1000 * 3600 * 24));
    return daysDiff <= 7 && daysDiff > 0;
  };

  const getPlanIcon = (plan: string) => {
    if (plan.includes("PREMIUM")) {
      return <Crown className="h-5 w-5 text-yellow-600" />;
    }
    return <Sparkles className="h-5 w-5 text-gray-600" />;
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15,
      },
    },
  };

  const premiumGradient = isPremium
    ? "bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-500"
    : "bg-gradient-to-r from-gray-500 to-gray-600";

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Subscription Overview */}
      <Card className={`relative overflow-hidden ${
        isPremium 
          ? "border-yellow-200 bg-gradient-to-br from-yellow-50 to-amber-50" 
          : "border-gray-200"
      }`}>
        <div className={`absolute top-0 left-0 right-0 h-1 ${premiumGradient}`} />
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getPlanIcon(subscription?.plan || "FREEMIUM")}
              <div>
                <CardTitle className={`text-xl ${
                  isPremium ? "text-yellow-800" : "text-gray-800"
                }`}>
                  Current Plan
                </CardTitle>
                <CardDescription>
                  Your subscription details and billing information
                </CardDescription>
              </div>
            </div>
            {subscription && (
              <Badge className={getStatusColor(subscription.status)}>
                {subscription.status.replace("_", " ")}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error}
              </AlertDescription>
            </Alert>
          )}

          {loading && !subscription ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              <span>Loading subscription data...</span>
            </div>
          ) : subscription ? (
            <>
              {/* Subscription Status Alerts */}
              {subscription.cancelAtPeriodEnd && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Your subscription will be canceled at the end of the current billing period
                    {subscription.currentPeriodEnd && ` on ${formatDate(subscription.currentPeriodEnd)}`}.
                  </AlertDescription>
                </Alert>
              )}
              
              {subscription.currentPeriodEnd && isNearExpiry(subscription.currentPeriodEnd) && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Your subscription renews in {Math.ceil((new Date(subscription.currentPeriodEnd).getTime() - new Date().getTime()) / (1000 * 3600 * 24))} days.
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={`p-4 rounded-lg ${
                  isPremium 
                    ? "bg-yellow-100 border border-yellow-200" 
                    : "bg-gray-100 border border-gray-200"
                }`}>
                  <div className="flex items-center space-x-2 mb-2">
                    <TrendingUp className={`h-4 w-4 ${
                      isPremium ? "text-yellow-600" : "text-gray-600"
                    }`} />
                    <span className="text-sm font-medium">Plan Type</span>
                  </div>
                  <p className={`text-lg font-bold ${
                    isPremium ? "text-yellow-800" : "text-gray-800"
                  }`}>
                    {subscription.plan.replace("_", " ")}
                  </p>
                </div>

                {subscription.currentPeriodStart && (
                  <div className={`p-4 rounded-lg ${
                    isPremium 
                      ? "bg-yellow-100 border border-yellow-200" 
                      : "bg-gray-100 border border-gray-200"
                  }`}>
                    <div className="flex items-center space-x-2 mb-2">
                      <Calendar className={`h-4 w-4 ${
                        isPremium ? "text-yellow-600" : "text-gray-600"
                      }`} />
                      <span className="text-sm font-medium">Current Period</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {formatDate(subscription.currentPeriodStart)}
                    </p>
                    {subscription.currentPeriodEnd && (
                      <p className="text-sm text-gray-500">
                        to {formatDate(subscription.currentPeriodEnd)}
                      </p>
                    )}
                  </div>
                )}

                <div className={`p-4 rounded-lg ${
                  isPremium 
                    ? "bg-yellow-100 border border-yellow-200" 
                    : "bg-gray-100 border border-gray-200"
                }`}>
                  <div className="flex items-center space-x-2 mb-2">
                    <CreditCard className={`h-4 w-4 ${
                      isPremium ? "text-yellow-600" : "text-gray-600"
                    }`} />
                    <span className="text-sm font-medium">Auto Renewal</span>
                  </div>
                  <p className={`text-sm ${
                    subscription.cancelAtPeriodEnd ? "text-red-600" : "text-green-600"
                  }`}>
                    {subscription.cancelAtPeriodEnd ? "Canceled" : "Active"}
                  </p>
                </div>
              </div>

              {/* Subscription Management */}
              {onManageSubscription && (
                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 mb-1">Subscription Management</h4>
                    <p className="text-sm text-gray-500">Manage your subscription settings</p>
                  </div>
                  <div className="flex gap-2">
                    {subscription.cancelAtPeriodEnd ? (
                      <Button
                        variant="outline"
                        onClick={() => handleSubscriptionAction('reactivate')}
                        disabled={actionLoading === 'reactivate'}
                        className="border-green-300 text-green-700 hover:bg-green-50"
                      >
                        {actionLoading === 'reactivate' ? (
                          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <CheckCircle className="h-4 w-4 mr-2" />
                        )}
                        Reactivate
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() => handleSubscriptionAction('cancel')}
                        disabled={actionLoading === 'cancel'}
                        className="border-red-300 text-red-700 hover:bg-red-50"
                      >
                        {actionLoading === 'cancel' ? (
                          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <X className="h-4 w-4 mr-2" />
                        )}
                        Cancel Subscription
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {!isPremium && (
                <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-blue-900">Upgrade to Premium</h4>
                      <p className="text-sm text-blue-700">
                        Unlock advanced analytics and unlimited connections
                      </p>
                    </div>
                    <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                      Upgrade Now
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <div className="text-gray-500 mb-4">
                <CreditCard className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No subscription information available</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Invoices */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <CardTitle>Recent Invoices</CardTitle>
            </div>
            <Button variant="outline" size="sm">
              View All
            </Button>
          </div>
          <CardDescription>
            Your recent billing history and payment details
          </CardDescription>
        </CardHeader>

        <CardContent>
          {invoices.length > 0 ? (
            <div className="space-y-4">
              {invoices.slice(0, 5).map((invoice, index) => (
                <motion.div
                  key={invoice.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-full ${
                      invoice.status === "paid" 
                        ? "bg-green-100 text-green-600" 
                        : "bg-orange-100 text-orange-600"
                    }`}>
                      <DollarSign className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {formatAmount(invoice.amount, invoice.currency)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatDate(invoice.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge 
                      variant={invoice.status === "paid" ? "default" : "secondary"}
                      className={
                        invoice.status === "paid" 
                          ? "bg-green-100 text-green-800" 
                          : "bg-orange-100 text-orange-800"
                      }
                    >
                      {invoice.status}
                    </Badge>
                    <div className="flex space-x-1">
                      {invoice.hostedInvoiceUrl && (
                        <Button variant="ghost" size="sm" asChild>
                          <a href={invoice.hostedInvoiceUrl} target="_blank" rel="noopener noreferrer" title="View Invoice">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      {invoice.invoicePdf && (
                        <Button variant="ghost" size="sm" asChild>
                          <a href={invoice.invoicePdf} target="_blank" rel="noopener noreferrer" title="Download PDF">
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-gray-500 mb-4">
                <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No invoices available</p>
                <p className="text-sm">Your billing history will appear here</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
