'use client';

import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Lock,
  Crown,
  Sparkles,
  Zap,
  TrendingUp,
  Users,
  Calendar,
  Target,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

export function PremiumGate() {
  const features = [
    {
      icon: TrendingUp,
      title: 'Multi-Platform Publishing',
      description:
        'Post to Facebook, Instagram, Twitter, and LinkedIn simultaneously',
    },
    {
      icon: Calendar,
      title: 'Smart Scheduling',
      description: 'Schedule posts for optimal engagement times',
    },
    {
      icon: Target,
      title: 'AI-Powered Optimization',
      description: 'Get hashtag suggestions and content improvements',
    },
    {
      icon: Users,
      title: 'Advanced Analytics',
      description:
        'Track performance across all platforms with detailed insights',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      {/* Blurred Content Behind */}
      <div className="absolute inset-0 filter blur-sm">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-400">
              Social Media Publisher
            </h1>
            <p className="text-gray-400 text-lg mt-2">
              Create and schedule engaging content
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Card className="bg-gray-200 h-40"></Card>
              <Card className="bg-gray-200 h-32"></Card>
              <Card className="bg-gray-200 h-48"></Card>
            </div>
            <div className="space-y-6">
              <Card className="bg-gray-200 h-64"></Card>
              <Card className="bg-gray-200 h-32"></Card>
            </div>
          </div>
        </div>
      </div>

      {/* Premium Gate Overlay */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl w-full"
        >
          <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-lg">
            <CardContent className="p-8 text-center">
              {/* Lock Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="relative mb-6"
              >
                <div className="w-20 h-20 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto">
                  <Lock className="h-10 w-10 text-white" />
                </div>
                <div className="absolute -top-2 -right-2">
                  <Crown className="h-8 w-8 text-yellow-500" />
                </div>
              </motion.div>

              {/* Title */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mb-6"
              >
                <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
                  Premium Feature Locked
                </h2>
                <p className="text-gray-600 text-lg">
                  Upgrade your account to unlock powerful social media
                  publishing tools
                </p>
              </motion.div>

              {/* Features Grid */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8"
              >
                {features.map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                    className="flex items-start gap-3 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg"
                  >
                    <div className="flex-shrink-0">
                      <feature.icon className="h-5 w-5 text-purple-600 mt-1" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-gray-900 text-sm">
                        {feature.title}
                      </h3>
                      <p className="text-xs text-gray-600 mt-1">
                        {feature.description}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>

              {/* Premium Benefits */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg p-6 mb-6"
              >
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                  <h3 className="font-semibold text-gray-900">
                    Premium Benefits
                  </h3>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-green-600" />
                    <span>Unlimited Posts</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <span>Advanced Scheduling</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-purple-600" />
                    <span>AI Optimization</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-orange-600" />
                    <span>Performance Analytics</span>
                  </div>
                </div>
              </motion.div>

              {/* Pricing */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
                className="mb-6"
              >
                <div className="flex items-center justify-center gap-4 mb-4">
                  <Badge
                    variant="outline"
                    className="bg-yellow-100 border-yellow-300 text-yellow-800"
                  >
                    <Crown className="h-3 w-3 mr-1" />
                    Premium Monthly
                  </Badge>
                  <span className="text-2xl font-bold text-gray-900">
                    $29.99/mo
                  </span>
                </div>
                <p className="text-sm text-gray-500">
                  Or save 20% with yearly billing
                </p>
              </motion.div>

              {/* Action Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.0 }}
                className="space-y-3"
              >
                <Link href="/subscription">
                  <Button
                    size="lg"
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg group"
                  >
                    <Crown className="h-5 w-5 mr-2" />
                    Upgrade to Premium
                    <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>

                <Link href="/dashboard">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    Back to Dashboard
                  </Button>
                </Link>
              </motion.div>

              {/* Trial Info */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.1 }}
                className="mt-6 pt-6 border-t border-gray-200"
              >
                <p className="text-xs text-gray-500">
                  🎉 <strong>7-day free trial</strong> included with all premium
                  plans
                </p>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
