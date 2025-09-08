"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { FileText, Users, Shield, AlertTriangle, Scale, Gavel, CheckCircle, XCircle, Globe } from "lucide-react"
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

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-12 px-4">
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div variants={itemVariants} className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-gray-700 to-gray-900 rounded-2xl mb-6">
            <FileText className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent mb-4">
            Terms of Service
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            These terms govern your use of our social media analytics platform. Please read them carefully.
          </p>
          <div className="mt-4 text-sm text-gray-500">Last updated: January 24, 2024</div>
        </motion.div>

        {/* Quick Overview */}
        <motion.div variants={itemVariants} className="mb-8">
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-blue-600" />
                Key Terms Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <h3 className="font-semibold text-blue-800">Your Responsibilities</h3>
                  <p className="text-sm text-blue-600">Use service appropriately</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-xl border border-green-200">
                  <Shield className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <h3 className="font-semibold text-green-800">Our Commitments</h3>
                  <p className="text-sm text-green-600">Reliable service delivery</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-xl border border-purple-200">
                  <Gavel className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                  <h3 className="font-semibold text-purple-800">Dispute Resolution</h3>
                  <p className="text-sm text-purple-600">Fair resolution process</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Content */}
        <div className="space-y-8">
          {/* Acceptance of Terms */}
          <motion.div variants={itemVariants}>
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Acceptance of Terms
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700">
                  By accessing or using Social Media Analytics Hub ("the Service"), you agree to be bound by these Terms
                  of Service ("Terms"). If you disagree with any part of these terms, you may not access the Service.
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-800 mb-2">What This Means</h4>
                  <ul className="text-blue-700 text-sm space-y-1">
                    <li>• Creating an account means you accept these terms</li>
                    <li>• Using any part of our service constitutes agreement</li>
                    <li>• You must be at least 18 years old to use our service</li>
                    <li>• You must have the authority to enter into this agreement</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Service Description */}
          <motion.div variants={itemVariants}>
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-blue-600" />
                  Description of Service
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-gray-700">
                  Social Media Analytics Hub is a Software-as-a-Service (SaaS) platform that provides social media
                  management tools, analytics, and AI-powered content suggestions.
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                    <h4 className="font-semibold text-green-800 mb-2">Core Features</h4>
                    <ul className="text-green-700 text-sm space-y-1">
                      <li>• Social media account integration</li>
                      <li>• Post scheduling and management</li>
                      <li>• Analytics and performance tracking</li>
                      <li>• AI-powered content suggestions</li>
                      <li>• Audience insights and demographics</li>
                    </ul>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <h4 className="font-semibold text-blue-800 mb-2">Service Availability</h4>
                    <ul className="text-blue-700 text-sm space-y-1">
                      <li>• 99.9% uptime commitment</li>
                      <li>• 24/7 platform availability</li>
                      <li>• Regular maintenance windows</li>
                      <li>• Feature updates and improvements</li>
                      <li>• Customer support during business hours</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* User Accounts */}
          <motion.div variants={itemVariants}>
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-600" />
                  User Accounts & Responsibilities
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Account Creation & Security</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                      <h4 className="font-semibold text-blue-800 mb-2">Your Obligations</h4>
                      <ul className="text-blue-700 text-sm space-y-1">
                        <li>• Provide accurate registration information</li>
                        <li>• Maintain the security of your account</li>
                        <li>• Keep your password confidential</li>
                        <li>• Notify us of unauthorized access</li>
                        <li>• Update your information when it changes</li>
                      </ul>
                    </div>
                    <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                      <h4 className="font-semibold text-green-800 mb-2">Account Types</h4>
                      <ul className="text-green-700 text-sm space-y-1">
                        <li>• Individual accounts for personal use</li>
                        <li>• Business accounts for organizations</li>
                        <li>• Team accounts with multiple users</li>
                        <li>• Different subscription tiers available</li>
                        <li>• Upgrade or downgrade anytime</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Account Termination</h3>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-yellow-800 mb-1">
                          We may suspend or terminate your account if:
                        </h4>
                        <ul className="text-yellow-700 text-sm space-y-1">
                          <li>• You violate these Terms of Service</li>
                          <li>• You engage in fraudulent or illegal activities</li>
                          <li>• Your account remains inactive for extended periods</li>
                          <li>• You fail to pay subscription fees</li>
                          <li>• You abuse our support systems</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Acceptable Use Policy */}
          <motion.div variants={itemVariants}>
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-red-600" />
                  Acceptable Use Policy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Permitted Uses</h3>
                  <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-green-800 mb-1">You may use our service to:</h4>
                        <ul className="text-green-700 text-sm space-y-1">
                          <li>• Manage your legitimate social media accounts</li>
                          <li>• Schedule and publish original content</li>
                          <li>• Analyze performance metrics and insights</li>
                          <li>• Generate content suggestions for your brand</li>
                          <li>• Collaborate with team members on social media strategy</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Prohibited Activities</h3>
                  <div className="space-y-4">
                    <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                      <div className="flex items-start gap-3">
                        <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <h4 className="font-semibold text-red-800 mb-1">Content Violations</h4>
                          <ul className="text-red-700 text-sm space-y-1">
                            <li>• Publishing spam, misleading, or deceptive content</li>
                            <li>• Sharing illegal, harmful, or offensive material</li>
                            <li>• Violating intellectual property rights</li>
                            <li>• Impersonating others or creating fake accounts</li>
                            <li>• Distributing malware or malicious links</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 bg-orange-50 rounded-xl border border-orange-200">
                      <div className="flex items-start gap-3">
                        <XCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <h4 className="font-semibold text-orange-800 mb-1">Technical Violations</h4>
                          <ul className="text-orange-700 text-sm space-y-1">
                            <li>• Attempting to hack, disrupt, or damage our systems</li>
                            <li>• Using automated tools to abuse our service</li>
                            <li>• Reverse engineering or copying our software</li>
                            <li>• Exceeding rate limits or usage quotas</li>
                            <li>• Interfering with other users' access to the service</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Intellectual Property */}
          <motion.div variants={itemVariants}>
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scale className="h-5 w-5 text-purple-600" />
                  Intellectual Property Rights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <h4 className="font-semibold text-blue-800 mb-2">Our Rights</h4>
                    <p className="text-blue-700 text-sm mb-2">We own all rights to our platform, including:</p>
                    <ul className="text-blue-700 text-sm space-y-1">
                      <li>• Software code and algorithms</li>
                      <li>• User interface and design</li>
                      <li>• Trademarks and branding</li>
                      <li>• Analytics methodologies</li>
                      <li>• AI models and suggestions</li>
                    </ul>
                  </div>
                  <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                    <h4 className="font-semibold text-green-800 mb-2">Your Rights</h4>
                    <p className="text-green-700 text-sm mb-2">You retain ownership of your content:</p>
                    <ul className="text-green-700 text-sm space-y-1">
                      <li>• Your social media posts and content</li>
                      <li>• Your brand assets and materials</li>
                      <li>• Your customer data and insights</li>
                      <li>• Your account information</li>
                      <li>• Your creative works and campaigns</li>
                    </ul>
                  </div>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h4 className="font-semibold text-purple-800 mb-2">License Grant</h4>
                  <p className="text-purple-700 text-sm">
                    By using our service, you grant us a limited, non-exclusive license to process your content for the
                    purpose of providing our services. This includes analyzing your social media data, generating
                    insights, and providing AI-powered suggestions. We will not use your content for any other purpose
                    without your explicit consent.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Payment Terms */}
          <motion.div variants={itemVariants}>
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scale className="h-5 w-5 text-green-600" />
                  Payment Terms & Billing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <h4 className="font-semibold text-blue-800 mb-2">Subscription Plans</h4>
                    <ul className="text-blue-700 text-sm space-y-1">
                      <li>• Free tier with limited features</li>
                      <li>• Monthly premium subscriptions</li>
                      <li>• Annual subscriptions with discounts</li>
                      <li>• Enterprise plans for large organizations</li>
                      <li>• Custom pricing for special requirements</li>
                    </ul>
                  </div>
                  <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                    <h4 className="font-semibold text-green-800 mb-2">Billing Policies</h4>
                    <ul className="text-green-700 text-sm space-y-1">
                      <li>• Automatic recurring billing</li>
                      <li>• Secure payment processing via Stripe</li>
                      <li>• Prorated charges for plan changes</li>
                      <li>• 30-day refund policy for new subscriptions</li>
                      <li>• Invoice history available in your account</li>
                    </ul>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-yellow-800 mb-1">Payment Failures</h4>
                      <p className="text-yellow-700 text-sm">
                        If payment fails, we'll attempt to collect payment for up to 7 days. After this period, your
                        account may be suspended until payment is resolved. We'll notify you via email before any
                        suspension occurs.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Limitation of Liability */}
          <motion.div variants={itemVariants}>
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-orange-600" />
                  Limitation of Liability
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-orange-800 mb-2">Service Limitations</h4>
                      <p className="text-orange-700 text-sm mb-2">
                        Our service is provided "as is" and we make no warranties about:
                      </p>
                      <ul className="text-orange-700 text-sm space-y-1">
                        <li>• Uninterrupted or error-free operation</li>
                        <li>• Accuracy of analytics or AI suggestions</li>
                        <li>• Compatibility with all social media platforms</li>
                        <li>• Results from using our recommendations</li>
                        <li>• Third-party service availability</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                    <h4 className="font-semibold text-red-800 mb-2">Liability Limits</h4>
                    <p className="text-red-700 text-sm mb-2">Our total liability is limited to:</p>
                    <ul className="text-red-700 text-sm space-y-1">
                      <li>• The amount you paid in the last 12 months</li>
                      <li>• $100 maximum for free accounts</li>
                      <li>• No liability for indirect damages</li>
                      <li>• No liability for lost profits or data</li>
                    </ul>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <h4 className="font-semibold text-blue-800 mb-2">Your Responsibilities</h4>
                    <p className="text-blue-700 text-sm mb-2">You are responsible for:</p>
                    <ul className="text-blue-700 text-sm space-y-1">
                      <li>• Backing up your important data</li>
                      <li>• Complying with social media platform terms</li>
                      <li>• Monitoring your account activity</li>
                      <li>• Reporting issues promptly</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Dispute Resolution */}
          <motion.div variants={itemVariants}>
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gavel className="h-5 w-5 text-purple-600" />
                  Dispute Resolution
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="text-center p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-bold">
                      1
                    </div>
                    <h4 className="font-semibold text-blue-800 mb-1">Direct Resolution</h4>
                    <p className="text-xs text-blue-600">Contact our support team first</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-xl border border-green-200">
                    <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-bold">
                      2
                    </div>
                    <h4 className="font-semibold text-green-800 mb-1">Mediation</h4>
                    <p className="text-xs text-green-600">Neutral third-party mediation</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-xl border border-purple-200">
                    <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-bold">
                      3
                    </div>
                    <h4 className="font-semibold text-purple-800 mb-1">Arbitration</h4>
                    <p className="text-xs text-purple-600">Binding arbitration if needed</p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-800 mb-2">Arbitration Agreement</h4>
                  <p className="text-gray-700 text-sm mb-2">
                    By using our service, you agree that disputes will be resolved through binding arbitration rather
                    than in court, except for:
                  </p>
                  <ul className="text-gray-700 text-sm space-y-1">
                    <li>• Small claims court matters (under $10,000)</li>
                    <li>• Intellectual property disputes</li>
                    <li>• Injunctive relief requests</li>
                    <li>• Class action waivers apply</li>
                  </ul>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-800 mb-2">Governing Law</h4>
                  <p className="text-blue-700 text-sm">
                    These terms are governed by the laws of Delaware, United States, without regard to conflict of law
                    principles. Any arbitration will be conducted in Delaware or via online arbitration platforms.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Termination */}
          <motion.div variants={itemVariants}>
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-600" />
                  Termination
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <h4 className="font-semibold text-blue-800 mb-2">Your Right to Terminate</h4>
                    <ul className="text-blue-700 text-sm space-y-1">
                      <li>• Cancel your subscription anytime</li>
                      <li>• Delete your account from settings</li>
                      <li>• Export your data before termination</li>
                      <li>• No cancellation fees</li>
                      <li>• Access continues until period end</li>
                    </ul>
                  </div>
                  <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                    <h4 className="font-semibold text-red-800 mb-2">Our Right to Terminate</h4>
                    <ul className="text-red-700 text-sm space-y-1">
                      <li>• Violation of these terms</li>
                      <li>• Non-payment of fees</li>
                      <li>• Fraudulent or illegal activity</li>
                      <li>• Abuse of our systems or support</li>
                      <li>• Extended inactivity</li>
                    </ul>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-yellow-800 mb-1">Data Retention After Termination</h4>
                      <p className="text-yellow-700 text-sm">
                        After account termination, we will retain your data for 30 days to allow for account recovery.
                        After this period, all data will be permanently deleted, except as required by law or for
                        legitimate business purposes.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Changes to Terms */}
          <motion.div variants={itemVariants}>
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader>
                <CardTitle>Changes to These Terms</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700">
                  We may update these Terms of Service from time to time to reflect changes in our service, legal
                  requirements, or business practices.
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <h4 className="font-semibold text-blue-800 mb-2">How We Notify You</h4>
                    <ul className="text-blue-700 text-sm space-y-1">
                      <li>• Email notification to all users</li>
                      <li>• In-app notification banner</li>
                      <li>• Updated "Last Modified" date</li>
                      <li>• 30-day notice for material changes</li>
                    </ul>
                  </div>
                  <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                    <h4 className="font-semibold text-green-800 mb-2">Your Options</h4>
                    <ul className="text-green-700 text-sm space-y-1">
                      <li>• Continue using the service (acceptance)</li>
                      <li>• Cancel your subscription</li>
                      <li>• Contact us with concerns</li>
                      <li>• Export your data before leaving</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Contact Information */}
          <motion.div variants={itemVariants}>
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 mb-4">
                  If you have any questions about these Terms of Service, please contact us:
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <h4 className="font-semibold text-blue-800 mb-2">Legal Department</h4>
                    <p className="text-blue-700 text-sm">legal@socialmediaanalytics.com</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                    <h4 className="font-semibold text-green-800 mb-2">General Support</h4>
                    <p className="text-green-700 text-sm">support@socialmediaanalytics.com</p>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                  <h4 className="font-semibold text-gray-800 mb-2">Mailing Address</h4>
                  <p className="text-gray-700 text-sm">
                    Social Media Analytics Hub, Inc.
                    <br />
                    123 Tech Street, Suite 100
                    <br />
                    San Francisco, CA 94105
                    <br />
                    United States
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Footer */}
        <motion.div variants={itemVariants} className="mt-12 text-center">
          <p className="text-gray-600 mb-4">
            These terms should be read in conjunction with our{" "}
            <Link href="/privacy-policy" className="text-blue-600 hover:underline">
              Privacy Policy
            </Link>{" "}
            and{" "}
            <Link href="/refund-policy" className="text-blue-600 hover:underline">
              Refund Policy
            </Link>
            .
          </p>
          <div className="text-sm text-gray-500">Last updated: January 24, 2024 | Effective Date: January 24, 2024</div>
        </motion.div>
      </motion.div>
    </div>
  )
}
