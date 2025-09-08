import { AnalyticsAdapter } from '@/services/analytics-adapter'
import { FacebookApiClient } from '@/services/api-clients/facebook-client'
import { InstagramApiClient } from '@/services/api-clients/instagram-client'
import { TwitterApiClient } from '@/services/api-clients/twitter-client'
import { AnalyticsDashboardService } from '@/services/analytics-dashboard'
import { logger } from '@/config/logger'

/**
 * Provider Validation Script
 * Tests that all providers are correctly configured and can transform data
 */
export class ProviderValidator {
  
  static async validateProviders() {
    logger.info('Starting provider validation...')
    
    try {
      // Test 1: Validate data transformations
      await this.validateDataTransformations()
      
      // Test 2: Validate type consistency
      await this.validateTypeConsistency()
      
      // Test 3: Validate freemium model
      await this.validateFreemiumModel()
      
      logger.info('✅ All provider validations passed!')
      
    } catch (error) {
      logger.error('❌ Provider validation failed:', error)
      throw error
    }
  }

  private static async validateDataTransformations() {
    logger.info('🔄 Testing data transformations...')
    
    // Test Facebook data transformation
    const facebookMockData = FacebookApiClient.generateMockData()
    const facebookAnalytics = AnalyticsAdapter.transformFacebookData(facebookMockData, true)
    
    this.assertValidAnalytics('Facebook', facebookAnalytics)
    
    // Test Instagram data transformation
    const instagramMockData = InstagramApiClient.generateMockData()
    const instagramAnalytics = AnalyticsAdapter.transformInstagramData(instagramMockData, true)
    
    this.assertValidAnalytics('Instagram', instagramAnalytics)
    
    // Test Twitter data transformation
    const twitterMockData = TwitterApiClient.generateMockData()
    const twitterAnalytics = AnalyticsAdapter.transformTwitterData(twitterMockData, true)
    
    this.assertValidAnalytics('Twitter', twitterAnalytics)
    
    logger.info('✅ Data transformations validated')
  }

  private static async validateTypeConsistency() {
    logger.info('🔄 Testing type consistency...')
    
    // Validate that transformed data matches expected types
    const facebookMockData = FacebookApiClient.generateMockData()
    const facebookAnalytics = AnalyticsAdapter.transformFacebookData(facebookMockData, true)
    
    // Check required properties exist
    this.assertProperty(facebookAnalytics, 'posts', 'Facebook analytics')
    this.assertProperty(facebookAnalytics, 'ads', 'Facebook analytics')
    this.assertProperty(facebookAnalytics, 'lastUpdated', 'Facebook analytics')
    this.assertProperty(facebookAnalytics, 'pageData', 'Facebook analytics')
    
    // Check posts structure
    this.assertProperty(facebookAnalytics.posts, 'totalPosts', 'Facebook posts analytics')
    this.assertProperty(facebookAnalytics.posts, 'avgEngagement', 'Facebook posts analytics')
    this.assertProperty(facebookAnalytics.posts, 'engagementTrend', 'Facebook posts analytics')
    
    // Check ads structure (should exist for premium)
    if (facebookAnalytics.ads) {
      this.assertProperty(facebookAnalytics.ads, 'totalSpend', 'Facebook ads analytics')
      this.assertProperty(facebookAnalytics.ads, 'cpm', 'Facebook ads analytics')
      this.assertProperty(facebookAnalytics.ads, 'audienceInsights', 'Facebook ads analytics')
    }
    
    logger.info('✅ Type consistency validated')
  }

  private static async validateFreemiumModel() {
    logger.info('🔄 Testing freemium model...')
    
    // Test with ads enabled (premium)
    const facebookDataPremium = AnalyticsAdapter.transformFacebookData(
      FacebookApiClient.generateMockData(), 
      true
    )
    
    if (!facebookDataPremium.ads) {
      throw new Error('Premium users should have ads data')
    }
    
    // Test with ads disabled (free)
    const facebookDataFree = AnalyticsAdapter.transformFacebookData(
      FacebookApiClient.generateMockData(), 
      false
    )
    
    if (facebookDataFree.ads !== null) {
      throw new Error('Free users should not have ads data')
    }
    
    logger.info('✅ Freemium model validated')
  }

  private static assertValidAnalytics(platform: string, analytics: any) {
    if (!analytics) {
      throw new Error(`${platform} analytics transformation returned null/undefined`)
    }
    
    if (!analytics.posts) {
      throw new Error(`${platform} analytics missing posts data`)
    }
    
    if (typeof analytics.posts.totalPosts !== 'number') {
      throw new Error(`${platform} posts analytics missing or invalid totalPosts`)
    }
    
    if (!analytics.lastUpdated) {
      throw new Error(`${platform} analytics missing lastUpdated`)
    }
    
    logger.info(`✅ ${platform} analytics structure validated`)
  }

  private static assertProperty(obj: any, prop: string, context: string) {
    if (!(prop in obj)) {
      throw new Error(`Missing property '${prop}' in ${context}`)
    }
  }

  static async validateApiClientCompatibility() {
    logger.info('🔄 Testing API client compatibility...')
    
    // Test that existing API clients can be called without breaking
    try {
      // These should not throw errors
      const facebookData = FacebookApiClient.generateMockData()
      const instagramData = InstagramApiClient.generateMockData()
      const twitterData = TwitterApiClient.generateMockData()
      
      // Verify data structures are as expected
      this.assertProperty(facebookData, 'pageData', 'Facebook API client')
      this.assertProperty(facebookData, 'insights', 'Facebook API client')
      this.assertProperty(facebookData, 'posts', 'Facebook API client')
      
      this.assertProperty(instagramData, 'profile', 'Instagram API client')
      this.assertProperty(instagramData, 'insights', 'Instagram API client')
      this.assertProperty(instagramData, 'media', 'Instagram API client')
      
      this.assertProperty(twitterData, 'profile', 'Twitter API client')
      this.assertProperty(twitterData, 'analytics', 'Twitter API client')
      this.assertProperty(twitterData, 'tweets', 'Twitter API client')
      
      logger.info('✅ API client compatibility validated')
      
    } catch (error) {
      logger.error('❌ API client compatibility failed:', error)
      throw error
    }
  }

  static async runFullValidation() {
    try {
      await this.validateProviders()
      await this.validateApiClientCompatibility()
      
      logger.info('🎉 All validations completed successfully!')
      return {
        success: true,
        message: 'All providers are properly configured and working'
      }
      
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
        error
      }
    }
  }
}

// Export for easy testing
export { AnalyticsAdapter, AnalyticsDashboardService }
