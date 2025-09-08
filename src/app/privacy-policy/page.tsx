"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Shield, Eye, Lock, Database, Cookie, Globe, UserCheck, Settings, AlertTriangle } from "lucide-react"
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

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-12 px-4">
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div variants={itemVariants} className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl mb-6">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent mb-4">
            Privacy Policy
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Your privacy is important to us. This policy explains how we collect, use, and protect your personal
            information.
          </p>
          <div className="mt-4 text-sm text-gray-500">Last updated: January 24, 2024</div>
        </motion.div>

        {/* Quick Overview */}
        <motion.div variants={itemVariants} className="mb-8">
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-blue-600" />
                Privacy at a Glance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center p-4 bg-green-50 rounded-xl border border-green-200">
                  <Lock className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <h3 className="font-semibold text-green-800">Data Protection</h3>
                  <p className="text-sm text-green-600">Enterprise-grade security</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <UserCheck className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <h3 className="font-semibold text-blue-800">Your Rights</h3>
                  <p className="text-sm text-blue-600">Full control over your data</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-xl border border-purple-200">
                  <Globe className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                  <h3 className="font-semibold text-purple-800">GDPR & CCPA</h3>
                  <p className="text-sm text-purple-600">Fully compliant</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Content */}
        <div className="space-y-8">
          {/* Information We Collect */}
          <motion.div variants={itemVariants}>
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-blue-600" />
                  Information We Collect
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Personal Information You Provide</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                      <h4 className="font-semibold text-blue-800 mb-2">Account Information</h4>
                      <ul className="text-blue-700 text-sm space-y-1">
                        <li>• Name and email address</li>
                        <li>• Username and password</li>
                        <li>• Profile information</li>
                        <li>• Billing and payment details</li>
                      </ul>
                    </div>
                    <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                      <h4 className="font-semibold text-green-800 mb-2">Social Media Data</h4>
                      <ul className="text-green-700 text-sm space-y-1">
                        <li>• Connected account information</li>
                        <li>• Posts and content data</li>
                        <li>• Analytics and metrics</li>
                        <li>• Audience insights</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Information We Collect Automatically</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
                      <h4 className="font-semibold text-purple-800 mb-2">Usage Information</h4>
                      <ul className="text-purple-700 text-sm space-y-1">
                        <li>• Pages visited and features used</li>
                        <li>• Time spent on the platform</li>
                        <li>• Click patterns and interactions</li>
                        <li>• Search queries and filters</li>
                      </ul>
                    </div>
                    <div className="p-4 bg-orange-50 rounded-xl border border-orange-200">
                      <h4 className="font-semibold text-orange-800 mb-2">Technical Information</h4>
                      <ul className="text-orange-700 text-sm space-y-1">
                        <li>• IP address and location</li>
                        <li>• Device and browser information</li>
                        <li>• Operating system details</li>
                        <li>• Referral sources</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* How We Use Information */}
          <motion.div variants={itemVariants}>
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-green-600" />
                  How We Use Your Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                      <h4 className="font-semibold text-blue-800 mb-2">Service Delivery</h4>
                      <ul className="text-blue-700 text-sm space-y-1">
                        <li>• Provide and maintain our services</li>
                        <li>• Process your social media data</li>
                        <li>• Generate analytics and insights</li>
                        <li>• Enable post scheduling and management</li>
                      </ul>
                    </div>
                    <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                      <h4 className="font-semibold text-green-800 mb-2">Account Management</h4>
                      <ul className="text-green-700 text-sm space-y-1">
                        <li>• Create and manage your account</li>
                        <li>• Process payments and billing</li>
                        <li>• Provide customer support</li>
                        <li>• Send important account notifications</li>
                      </ul>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
                      <h4 className="font-semibold text-purple-800 mb-2">Improvement & Personalization</h4>
                      <ul className="text-purple-700 text-sm space-y-1">
                        <li>• Improve our services and features</li>
                        <li>• Personalize your experience</li>
                        <li>• Develop AI-powered suggestions</li>
                        <li>• Analyze usage patterns</li>
                      </ul>
                    </div>
                    <div className="p-4 bg-orange-50 rounded-xl border border-orange-200">
                      <h4 className="font-semibold text-orange-800 mb-2">Legal & Security</h4>
                      <ul className="text-orange-700 text-sm space-y-1">
                        <li>• Comply with legal obligations</li>
                        <li>• Prevent fraud and abuse</li>
                        <li>• Protect user safety</li>
                        <li>• Enforce our terms of service</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Data Sharing */}
          <motion.div variants={itemVariants}>
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-purple-600" />
                  Information Sharing & Disclosure
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Lock className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-green-800 mb-1">We Do NOT Sell Your Data</h3>
                      <p className="text-green-700 text-sm">
                        We never sell, rent, or trade your personal information to third parties for marketing purposes.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    We may share information in these limited circumstances:
                  </h3>
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                      <h4 className="font-semibold text-blue-800 mb-2">Service Providers</h4>
                      <p className="text-blue-700 text-sm mb-2">
                        We work with trusted third-party service providers who help us operate our platform:
                      </p>
                      <ul className="text-blue-700 text-sm space-y-1">
                        <li>• Cloud hosting providers (AWS, Google Cloud)</li>
                        <li>• Payment processors (Stripe)</li>
                        <li>• Email service providers</li>
                        <li>• Analytics services (anonymized data only)</li>
                      </ul>
                    </div>
                    <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                      <h4 className="font-semibold text-yellow-800 mb-2">Legal Requirements</h4>
                      <p className="text-yellow-700 text-sm">
                        We may disclose information when required by law, court order, or to protect our rights and the
                        safety of our users.
                      </p>
                    </div>
                    <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                      <h4 className="font-semibold text-red-800 mb-2">Business Transfers</h4>
                      <p className="text-red-700 text-sm">
                        In the event of a merger, acquisition, or sale of assets, user information may be transferred as
                        part of the transaction.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Cookies and Tracking */}
          <motion.div variants={itemVariants}>
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cookie className="h-5 w-5 text-orange-600" />
                  Cookies & Tracking Technologies
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <h4 className="font-semibold text-blue-800 mb-2">Essential Cookies</h4>
                    <p className="text-blue-700 text-sm mb-2">Required for basic functionality:</p>
                    <ul className="text-blue-700 text-sm space-y-1">
                      <li>• Authentication and security</li>
                      <li>• Session management</li>
                      <li>• Load balancing</li>
                      <li>• CSRF protection</li>
                    </ul>
                    <Badge className="bg-blue-100 text-blue-800 border-blue-200 mt-2">Always Active</Badge>
                  </div>
                  <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                    <h4 className="font-semibold text-green-800 mb-2">Analytics Cookies</h4>
                    <p className="text-green-700 text-sm mb-2">Help us improve our service:</p>
                    <ul className="text-green-700 text-sm space-y-1">
                      <li>• Usage statistics</li>
                      <li>• Performance monitoring</li>
                      <li>• Feature usage tracking</li>
                      <li>• Error reporting</li>
                    </ul>
                    <Badge className="bg-green-100 text-green-800 border-green-200 mt-2">Optional</Badge>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-800 mb-2">Cookie Management</h4>
                  <p className="text-gray-700 text-sm mb-2">
                    You can control cookies through your browser settings or our cookie preferences center:
                  </p>
                  <ul className="text-gray-700 text-sm space-y-1">
                    <li>• Accept or reject non-essential cookies</li>
                    <li>• View detailed cookie information</li>
                    <li>• Update preferences at any time</li>
                    <li>• Clear existing cookies</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Data Security */}
          <motion.div variants={itemVariants}>
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-green-600" />
                  Data Security & Storage
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                    <h4 className="font-semibold text-green-800 mb-2">Security Measures</h4>
                    <ul className="text-green-700 text-sm space-y-1">
                      <li>• End-to-end encryption</li>
                      <li>• Regular security audits</li>
                      <li>• Multi-factor authentication</li>
                      <li>• Secure data centers</li>
                      <li>• Employee background checks</li>
                    </ul>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <h4 className="font-semibold text-blue-800 mb-2">Data Storage</h4>
                    <ul className="text-blue-700 text-sm space-y-1">
                      <li>• Encrypted databases</li>
                      <li>• Regular backups</li>
                      <li>• Geographic redundancy</li>
                      <li>• Access controls</li>
                      <li>• Audit logging</li>
                    </ul>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-yellow-800 mb-1">Data Breach Notification</h4>
                      <p className="text-yellow-700 text-sm">
                        In the unlikely event of a data breach, we will notify affected users within 72 hours and
                        provide detailed information about the incident and steps being taken.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Your Rights */}
          <motion.div variants={itemVariants}>
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-purple-600" />
                  Your Privacy Rights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                      <h4 className="font-semibold text-blue-800 mb-2">Access & Portability</h4>
                      <ul className="text-blue-700 text-sm space-y-1">
                        <li>• Request a copy of your data</li>
                        <li>• Export your information</li>
                        <li>• View data processing activities</li>
                      </ul>
                    </div>
                    <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                      <h4 className="font-semibold text-green-800 mb-2">Correction & Updates</h4>
                      <ul className="text-green-700 text-sm space-y-1">
                        <li>• Update your profile information</li>
                        <li>• Correct inaccurate data</li>
                        <li>• Modify account settings</li>
                      </ul>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                      <h4 className="font-semibold text-red-800 mb-2">Deletion & Restriction</h4>
                      <ul className="text-red-700 text-sm space-y-1">
                        <li>• Delete your account and data</li>
                        <li>• Restrict data processing</li>
                        <li>• Object to certain uses</li>
                      </ul>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
                      <h4 className="font-semibold text-purple-800 mb-2">Consent & Preferences</h4>
                      <ul className="text-purple-700 text-sm space-y-1">
                        <li>• Withdraw consent</li>
                        <li>• Manage communication preferences</li>
                        <li>• Control data sharing</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-800 mb-2">How to Exercise Your Rights</h4>
                  <p className="text-blue-700 text-sm mb-2">To exercise any of these rights, contact us at:</p>
                  <ul className="text-blue-700 text-sm space-y-1">
                    <li>• Email: privacy@socialmediaanalytics.com</li>
                    <li>• Account Settings: Manage preferences directly</li>
                    <li>• Response Time: Within 30 days</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* International Transfers */}
          <motion.div variants={itemVariants}>
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-blue-600" />
                  International Data Transfers
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700">
                  Our services are hosted in the United States and European Union. When you use our service, your
                  information may be transferred to and processed in these regions.
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <h4 className="font-semibold text-blue-800 mb-2">EU Users</h4>
                    <p className="text-blue-700 text-sm">
                      We use Standard Contractual Clauses and ensure adequate protection for transfers outside the EU.
                    </p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                    <h4 className="font-semibold text-green-800 mb-2">US Users</h4>
                    <p className="text-green-700 text-sm">
                      We comply with applicable US privacy laws including CCPA and state privacy regulations.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Children's Privacy */}
          <motion.div variants={itemVariants}>
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader>
                <CardTitle>Children's Privacy</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-red-800 mb-1">Age Restriction</h4>
                      <p className="text-red-700 text-sm">
                        Our service is not intended for children under 13 years of age. We do not knowingly collect
                        personal information from children under 13. If you believe we have collected information from a
                        child under 13, please contact us immediately.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Changes to Policy */}
          <motion.div variants={itemVariants}>
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader>
                <CardTitle>Changes to This Privacy Policy</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 mb-4">
                  We may update this privacy policy from time to time to reflect changes in our practices or for legal,
                  operational, or regulatory reasons.
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-800 mb-2">How We Notify You</h4>
                  <ul className="text-blue-700 text-sm space-y-1">
                    <li>• Email notification for material changes</li>
                    <li>• In-app notifications</li>
                    <li>• Updated "Last Modified" date</li>
                    <li>• 30-day notice period for significant changes</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Contact Information */}
          <motion.div variants={itemVariants}>
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader>
                <CardTitle>Contact Us</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 mb-4">
                  If you have any questions about this privacy policy or our privacy practices, please contact us:
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <h4 className="font-semibold text-blue-800 mb-2">Privacy Officer</h4>
                    <p className="text-blue-700 text-sm">privacy@socialmediaanalytics.com</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                    <h4 className="font-semibold text-green-800 mb-2">Data Protection Officer (EU)</h4>
                    <p className="text-green-700 text-sm">dpo@socialmediaanalytics.com</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Footer */}
        <motion.div variants={itemVariants} className="mt-12 text-center">
          <p className="text-gray-600 mb-4">
            This privacy policy is part of our{" "}
            <Link href="/terms-of-service" className="text-blue-600 hover:underline">
              Terms of Service
            </Link>{" "}
            and should be read in conjunction with our{" "}
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
