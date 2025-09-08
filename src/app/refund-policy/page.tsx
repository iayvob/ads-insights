"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { RefreshCw, Clock, CheckCircle, XCircle, AlertTriangle, Mail, Calendar } from "lucide-react"
import Link from "next/link"

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
}

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 10,
    },
  },
}

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-12 px-4">
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div variants={itemVariants} className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl mb-6">
            <RefreshCw className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent mb-4">
            Refund Policy
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            We want you to be completely satisfied with our service. Here's our fair and transparent refund policy.
          </p>
          <div className="mt-4 text-sm text-gray-500">Last updated: January 24, 2024</div>
        </motion.div>

        {/* Quick Overview */}
        <motion.div variants={itemVariants} className="mb-8">
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Quick Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center p-4 bg-green-50 rounded-xl border border-green-200">
                  <Calendar className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <h3 className="font-semibold text-green-800">30-Day Guarantee</h3>
                  <p className="text-sm text-green-600">Full refund within 30 days</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <Clock className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <h3 className="font-semibold text-blue-800">Fast Processing</h3>
                  <p className="text-sm text-blue-600">5-7 business days</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-xl border border-purple-200">
                  <Mail className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                  <h3 className="font-semibold text-purple-800">Easy Process</h3>
                  <p className="text-sm text-purple-600">Simple email request</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Content */}
        <div className="space-y-8">
          {/* Refund Eligibility */}
          <motion.div variants={itemVariants}>
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Refund Eligibility
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">You are eligible for a full refund if:</h3>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">
                        You request a refund within <strong>30 days</strong> of your initial subscription purchase
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">
                        You experience technical issues that prevent you from using core features, and our support team
                        cannot resolve them within 7 business days
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">
                        We fail to deliver the service as described in our marketing materials or terms of service
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">
                        You accidentally purchased multiple subscriptions and notify us within 48 hours
                      </span>
                    </li>
                  </ul>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Partial refunds may be considered for:</h3>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">
                        Service outages lasting more than 24 consecutive hours (prorated refund)
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">
                        Significant feature changes that materially affect your ability to use the service
                      </span>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Refund Limitations */}
          <motion.div variants={itemVariants}>
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-600" />
                  Refund Limitations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-red-800 mb-3">Refunds are NOT available for:</h3>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-3">
                      <XCircle className="h-4 w-4 text-red-500 mt-1 flex-shrink-0" />
                      <span className="text-red-700">Subscription renewals after the initial 30-day period</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <XCircle className="h-4 w-4 text-red-500 mt-1 flex-shrink-0" />
                      <span className="text-red-700">
                        Accounts that have violated our Terms of Service or Acceptable Use Policy
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <XCircle className="h-4 w-4 text-red-500 mt-1 flex-shrink-0" />
                      <span className="text-red-700">
                        Requests made more than 30 days after the subscription purchase date
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <XCircle className="h-4 w-4 text-red-500 mt-1 flex-shrink-0" />
                      <span className="text-red-700">Change of mind or lack of usage without technical issues</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <XCircle className="h-4 w-4 text-red-500 mt-1 flex-shrink-0" />
                      <span className="text-red-700">
                        Third-party service integrations that become unavailable due to external factors
                      </span>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Refund Process */}
          <motion.div variants={itemVariants}>
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5 text-blue-600" />
                  How to Request a Refund
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="text-center p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-bold">
                      1
                    </div>
                    <h3 className="font-semibold text-blue-800 mb-1">Contact Support</h3>
                    <p className="text-xs text-blue-600">Email us with your request</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-xl border border-green-200">
                    <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-bold">
                      2
                    </div>
                    <h3 className="font-semibold text-green-800 mb-1">Provide Details</h3>
                    <p className="text-xs text-green-600">Include account info & reason</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-xl border border-purple-200">
                    <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-bold">
                      3
                    </div>
                    <h3 className="font-semibold text-purple-800 mb-1">Review Process</h3>
                    <p className="text-xs text-purple-600">We review within 2 business days</p>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-xl border border-orange-200">
                    <div className="w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-bold">
                      4
                    </div>
                    <h3 className="font-semibold text-orange-800 mb-1">Refund Issued</h3>
                    <p className="text-xs text-orange-600">Processed within 5-7 days</p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Required Information</h3>
                  <p className="text-gray-700 mb-4">
                    To process your refund request quickly, please include the following information in your email:
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-3">
                      <Badge variant="outline" className="mt-0.5">
                        Required
                      </Badge>
                      <span className="text-gray-700">Your account email address</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Badge variant="outline" className="mt-0.5">
                        Required
                      </Badge>
                      <span className="text-gray-700">Subscription purchase date</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Badge variant="outline" className="mt-0.5">
                        Required
                      </Badge>
                      <span className="text-gray-700">Reason for refund request</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Badge variant="secondary" className="mt-0.5">
                        Optional
                      </Badge>
                      <span className="text-gray-700">Screenshots or documentation of issues (if applicable)</span>
                    </li>
                  </ul>
                </div>

                <div className="text-center p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <Mail className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <h3 className="font-semibold text-blue-800 mb-1">Contact Information</h3>
                  <p className="text-blue-700">
                    Email:{" "}
                    <a href="mailto:refunds@socialmediaanalytics.com" className="underline">
                      refunds@socialmediaanalytics.com
                    </a>
                  </p>
                  <p className="text-sm text-blue-600 mt-1">Response time: Within 24 hours</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Processing Times */}
          <motion.div variants={itemVariants}>
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-orange-600" />
                  Processing Times & Methods
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                    <h3 className="font-semibold text-green-800 mb-2">Credit Card Refunds</h3>
                    <p className="text-green-700 text-sm mb-2">
                      Refunds to credit cards typically take 5-7 business days to appear on your statement.
                    </p>
                    <Badge className="bg-green-100 text-green-800 border-green-200">Most Common</Badge>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <h3 className="font-semibold text-blue-800 mb-2">PayPal Refunds</h3>
                    <p className="text-blue-700 text-sm mb-2">
                      PayPal refunds are usually processed within 3-5 business days.
                    </p>
                    <Badge className="bg-blue-100 text-blue-800 border-blue-200">Fast Processing</Badge>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-yellow-800 mb-1">Important Notes</h3>
                      <ul className="text-yellow-700 text-sm space-y-1">
                        <li>• Refunds are processed to the original payment method</li>
                        <li>• Bank processing times may vary and are outside our control</li>
                        <li>• You will receive an email confirmation when the refund is processed</li>
                        <li>• Annual subscriptions are refunded on a prorated basis if eligible</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Cancellation vs Refund */}
          <motion.div variants={itemVariants}>
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader>
                <CardTitle>Cancellation vs. Refund</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <h3 className="font-semibold text-blue-800 mb-2">Cancellation</h3>
                    <p className="text-blue-700 text-sm mb-3">
                      Stops future billing but you keep access until the end of your current billing period.
                    </p>
                    <Badge className="bg-blue-100 text-blue-800 border-blue-200">No Money Back</Badge>
                  </div>
                  <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                    <h3 className="font-semibold text-green-800 mb-2">Refund</h3>
                    <p className="text-green-700 text-sm mb-3">
                      Returns your money and immediately terminates your access to the service.
                    </p>
                    <Badge className="bg-green-100 text-green-800 border-green-200">Money Back</Badge>
                  </div>
                </div>
                <p className="text-gray-600 text-sm">
                  You can cancel your subscription at any time from your account settings. Refunds require a separate
                  request through our support team.
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Contact Information */}
          <motion.div variants={itemVariants}>
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader>
                <CardTitle>Questions About Refunds?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 mb-4">
                  If you have any questions about our refund policy or need assistance with a refund request, our
                  support team is here to help.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <h3 className="font-semibold text-blue-800 mb-1">Email Support</h3>
                    <p className="text-blue-700 text-sm">refunds@socialmediaanalytics.com</p>
                  </div>
                  <div className="flex-1 p-4 bg-green-50 rounded-xl border border-green-200">
                    <h3 className="font-semibold text-green-800 mb-1">Response Time</h3>
                    <p className="text-green-700 text-sm">Within 24 hours</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Footer */}
        <motion.div variants={itemVariants} className="mt-12 text-center">
          <p className="text-gray-600 mb-4">
            This refund policy is part of our{" "}
            <Link href="/terms-of-service" className="text-blue-600 hover:underline">
              Terms of Service
            </Link>{" "}
            and is subject to change with notice.
          </p>
          <div className="text-sm text-gray-500">Last updated: January 24, 2024 | Effective Date: January 24, 2024</div>
        </motion.div>
      </motion.div>
    </div>
  )
}
