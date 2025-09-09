/**
 * Posting health monitoring service
 * Tracks success rates, errors, and performance of posting across platforms
 */

import { SocialPlatform } from "@/validations/posting-types";

interface PlatformHealthMetrics {
    successCount: number;
    failureCount: number;
    averageResponseTime: number;
    lastError: {
        timestamp: Date;
        message: string;
    } | null;
    lastSuccess: Date | null;
}

interface ErrorRecord {
    platform: SocialPlatform;
    timestamp: Date;
    errorCode: string;
    message: string;
    details?: any;
}

class PostingHealthMonitor {
    private platformMetrics: Record<SocialPlatform, PlatformHealthMetrics> = {
        facebook: this.createDefaultMetrics(),
        instagram: this.createDefaultMetrics(),
        twitter: this.createDefaultMetrics()
    };

    private errorLog: ErrorRecord[] = [];
    private readonly MAX_ERROR_LOG_SIZE = 100;

    private createDefaultMetrics(): PlatformHealthMetrics {
        return {
            successCount: 0,
            failureCount: 0,
            averageResponseTime: 0,
            lastError: null,
            lastSuccess: null
        };
    }

    /**
     * Record a successful post
     */
    recordSuccess(platform: SocialPlatform, responseTime: number): void {
        const metrics = this.platformMetrics[platform];

        // Update metrics
        metrics.successCount++;
        metrics.lastSuccess = new Date();

        // Update average response time
        const totalPosts = metrics.successCount + metrics.failureCount;
        metrics.averageResponseTime =
            (metrics.averageResponseTime * (totalPosts - 1) + responseTime) / totalPosts;

        console.log(`[Health] Successful post to ${platform}, response time: ${responseTime}ms`);
    }

    /**
     * Record a failed post
     */
    recordFailure(platform: SocialPlatform, error: string, errorCode?: string, details?: any): void {
        const metrics = this.platformMetrics[platform];

        // Update metrics
        metrics.failureCount++;
        metrics.lastError = {
            timestamp: new Date(),
            message: error
        };

        // Add to error log with limit
        this.errorLog.unshift({
            platform,
            timestamp: new Date(),
            errorCode: errorCode || 'UNKNOWN_ERROR',
            message: error,
            details
        });

        // Limit error log size
        if (this.errorLog.length > this.MAX_ERROR_LOG_SIZE) {
            this.errorLog.pop();
        }

        console.error(`[Health] Failed post to ${platform}: ${error}`);
    }

    /**
     * Get current health metrics for a specific platform
     */
    getPlatformHealth(platform: SocialPlatform): PlatformHealthMetrics {
        return this.platformMetrics[platform];
    }

    /**
     * Get success rate for a specific platform
     */
    getPlatformSuccessRate(platform: SocialPlatform): number {
        const metrics = this.platformMetrics[platform];
        const total = metrics.successCount + metrics.failureCount;

        if (total === 0) return 100; // No posts yet

        return (metrics.successCount / total) * 100;
    }

    /**
     * Get overall posting health across all platforms
     */
    getOverallHealth(): {
        successRate: number;
        platformMetrics: Record<SocialPlatform, PlatformHealthMetrics>;
        recentErrors: ErrorRecord[];
    } {
        // Calculate total success rate across all platforms
        let totalSuccess = 0;
        let totalPosts = 0;

        Object.values(this.platformMetrics).forEach(metrics => {
            totalSuccess += metrics.successCount;
            totalPosts += metrics.successCount + metrics.failureCount;
        });

        const successRate = totalPosts === 0 ? 100 : (totalSuccess / totalPosts) * 100;

        return {
            successRate,
            platformMetrics: this.platformMetrics,
            recentErrors: this.errorLog.slice(0, 10) // Return only 10 most recent errors
        };
    }

    /**
     * Reset metrics (for testing)
     */
    resetMetrics(): void {
        this.platformMetrics = {
            facebook: this.createDefaultMetrics(),
            instagram: this.createDefaultMetrics(),
            twitter: this.createDefaultMetrics()
        };
        this.errorLog = [];
    }
}

// Export singleton instance
export const postingHealthMonitor = new PostingHealthMonitor();
