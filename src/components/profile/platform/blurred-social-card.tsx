'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Facebook,
  Instagram,
  Music,
  ShoppingBag,
  Youtube,
  Linkedin,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';

export function BlurredSocialCard() {
  const socialIcons = [
    {
      icon: Facebook,
      color: 'text-white',
      bgColor: 'bg-blue-600',
      name: 'Facebook',
      position: 'left-8',
    },
    {
      icon: Instagram,
      color: 'text-white',
      bgColor: 'bg-gradient-to-br from-purple-500 to-pink-500',
      name: 'Instagram',
      position: 'left-16',
    },
    {
      icon: Music,
      color: 'text-white',
      bgColor: 'bg-black',
      name: 'TikTok',
      position: 'left-24',
    },
    {
      icon: ShoppingBag,
      color: 'text-white',
      bgColor: 'bg-orange-500',
      name: 'Amazon',
      position: 'left-32',
    },
  ];

  return (
    <motion.aside
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      role="region"
      aria-labelledby="social-kit-title"
      className="relative"
    >
      <Card className="h-full bg-white shadow-lg border-0 rounded-2xl overflow-hidden relative">
        {/* Colorful top gradient bar */}
        <div className="h-2 bg-gradient-to-r from-purple-500 via-blue-500 to-pink-500"></div>

        <CardContent className="p-0 relative min-h-[400px] flex flex-col">
          {/* Full card blur overlay */}
          <div className="absolute inset-0 bg-white/60 backdrop-blur-sm"></div>

          {/* Main content area with centered social icons */}
          <div className="relative z-20 flex-1 flex flex-col items-center justify-center p-6">
            {/* Central clustered social icons */}
            <div className="relative flex items-center justify-center mb-8">
              {socialIcons.map((social, index) => {
                const IconComponent = social.icon;
                return (
                  <motion.div
                    key={index}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{
                      duration: 0.5,
                      delay: 0.2 + index * 0.1,
                      type: 'spring',
                      stiffness: 120,
                    }}
                    className={`w-16 h-16 ${social.bgColor} rounded-full flex items-center justify-center shadow-lg border-4 border-white`}
                    style={{
                      marginLeft: index > 0 ? '-8px' : '0',
                      zIndex: 10 + index,
                    }}
                  >
                    <IconComponent className={`h-8 w-8 ${social.color}`} />
                  </motion.div>
                );
              })}
            </div>

            {/* Upgrade text */}
            <div className="text-center space-y-2 mb-6">
              <p className="text-gray-800 font-medium text-lg">
                to{' '}
                <span className="font-bold">
                  Unlock the whole social media kit
                </span>
              </p>
              <Link
                href="/subscription"
                className="text-blue-600 hover:text-blue-700 font-medium text-sm underline transition-colors duration-200"
                aria-label="Upgrade to premium plan"
              >
                Upgrade <ExternalLink className="inline h-3 w-3 ml-1" />
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.aside>
  );
}
