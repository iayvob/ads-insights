/**
 * TikTok Media Upload Service
 * 
 * Handles TikTok-specific media validation, upload preparation, and processing
 * with support for TikTok Business API requirements and constraints
 */

import {
    TikTokVideoUpload,
    TikTokUploadUrlResponse,
    TikTokVideoProperties,
    PostingErrorCodes
} from '@/validations/posting-types'
import TikTokPostingClient from './tiktok-posting-client'

// TikTok media constraints based on official documentation
export const TIKTOK_MEDIA_CONSTRAINTS = {
    video: {
        maxSize: 500 * 1024 * 1024, // 500MB
        minSize: 1024, // 1KB minimum
        maxDuration: 180, // 3 minutes for business accounts
        minDuration: 3, // 3 seconds minimum
        allowedTypes: ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo'],
        allowedExtensions: ['.mp4', '.mov', '.webm', '.avi'],
        supportedCodecs: ['H.264', 'H.265', 'VP9'],
        maxWidth: 1920,
        maxHeight: 1920,
        minWidth: 540,
        minHeight: 960,
        recommendedResolution: {
            width: 1080,
            height: 1920 // 9:16 aspect ratio
        },
        aspectRatios: {
            portrait: { min: 0.5625, max: 1.778 }, // 9:16 to 16:9
            square: { min: 1, max: 1 }, // 1:1
            landscape: { min: 1.778, max: 1.778 } // 16:9
        },
        maxFrameRate: 60,
        recommendedFrameRate: 30,
        maxBitrate: 20000, // 20 Mbps
        recommendedBitrate: 8000, // 8 Mbps
    }
} as const

export interface TikTokVideoValidationResult {
    isValid: boolean
    errors: string[]
    warnings: string[]
    videoInfo?: {
        duration?: number
        dimensions?: { width: number; height: number }
        fileSize: number
        format: string
        aspectRatio: number
    }
}

export interface TikTokUploadProgress {
    uploadId: string
    status: 'preparing' | 'uploading' | 'processing' | 'completed' | 'failed'
    progress: number // 0-100
    bytesUploaded: number
    totalBytes: number
    error?: string
    videoId?: string
    estimatedTimeRemaining?: number
}

export class TikTokMediaUploadService {
    private static client = new TikTokPostingClient()

    /**
     * Validate video file against TikTok constraints
     */
    static validateVideoFile(
        file: File,
        businessAccount = true
    ): TikTokVideoValidationResult {
        const errors: string[] = []
        const warnings: string[] = []
        const constraints = TIKTOK_MEDIA_CONSTRAINTS.video

        // Basic file validation
        if (!file || file.size === 0) {
            errors.push('No file provided or file is empty')
            return { isValid: false, errors, warnings }
        }

        // File size validation
        if (file.size > constraints.maxSize) {
            errors.push(`File size exceeds ${constraints.maxSize / (1024 * 1024)}MB limit`)
        }

        if (file.size < constraints.minSize) {
            errors.push(`File size below ${constraints.minSize}B minimum`)
        }

        // File type validation
        if (!constraints.allowedTypes.includes(file.type as any)) {
            errors.push(`File type ${file.type} not supported. Allowed types: ${constraints.allowedTypes.join(', ')}`)
        }

        // File extension validation
        const fileName = file.name.toLowerCase()
        const fileExtension = fileName.substring(fileName.lastIndexOf('.'))
        if (!constraints.allowedExtensions.includes(fileExtension as any)) {
            errors.push(`File extension ${fileExtension} not supported. Allowed extensions: ${constraints.allowedExtensions.join(', ')}`)
        }

        // Get basic video info
        const videoInfo = {
            fileSize: file.size,
            format: fileExtension.replace('.', '').toUpperCase(),
            aspectRatio: 0 // Will be calculated if dimensions are available
        }

        // Add warnings for optimization
        if (file.size > 100 * 1024 * 1024) { // Over 100MB
            warnings.push('Large file size may result in slower upload and processing times')
        }

        if (!file.type.includes('mp4')) {
            warnings.push('MP4 format is recommended for best compatibility and performance')
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            videoInfo
        }
    }

    /**
     * Validate video dimensions and properties
     */
    static async validateVideoConstraints(
        file: File,
        businessAccount = true
    ): Promise<TikTokVideoValidationResult> {
        const basicValidation = this.validateVideoFile(file, businessAccount)

        if (!basicValidation.isValid) {
            return basicValidation
        }

        try {
            // Create video element to get metadata
            const videoElement = document.createElement('video')
            const videoUrl = URL.createObjectURL(file)
            videoElement.src = videoUrl

            return new Promise((resolve) => {
                videoElement.onloadedmetadata = () => {
                    const errors = [...basicValidation.errors]
                    const warnings = [...basicValidation.warnings]
                    const constraints = TIKTOK_MEDIA_CONSTRAINTS.video

                    const width = videoElement.videoWidth
                    const height = videoElement.videoHeight
                    const duration = videoElement.duration
                    const aspectRatio = width / height

                    // Duration validation
                    if (duration > constraints.maxDuration) {
                        errors.push(`Video duration exceeds ${constraints.maxDuration} seconds limit`)
                    }

                    if (duration < constraints.minDuration) {
                        errors.push(`Video duration below ${constraints.minDuration} seconds minimum`)
                    }

                    // Resolution validation
                    if (width > constraints.maxWidth || height > constraints.maxHeight) {
                        errors.push(`Video resolution ${width}x${height} exceeds maximum ${constraints.maxWidth}x${constraints.maxHeight}`)
                    }

                    if (width < constraints.minWidth || height < constraints.minHeight) {
                        errors.push(`Video resolution ${width}x${height} below minimum ${constraints.minWidth}x${constraints.minHeight}`)
                    }

                    // Aspect ratio validation
                    const isValidAspectRatio = Object.values(constraints.aspectRatios).some(range =>
                        aspectRatio >= range.min && aspectRatio <= range.max
                    )

                    if (!isValidAspectRatio) {
                        warnings.push(`Aspect ratio ${aspectRatio.toFixed(2)} may not be optimal for TikTok. Recommended: 9:16 (0.56)`)
                    }

                    // Recommendations
                    if (aspectRatio !== 0.5625) { // Not 9:16
                        warnings.push('9:16 (vertical) aspect ratio is recommended for best TikTok performance')
                    }

                    if (width !== constraints.recommendedResolution.width || height !== constraints.recommendedResolution.height) {
                        warnings.push(`Recommended resolution: ${constraints.recommendedResolution.width}x${constraints.recommendedResolution.height}`)
                    }

                    URL.revokeObjectURL(videoUrl)

                    resolve({
                        isValid: errors.length === 0,
                        errors,
                        warnings,
                        videoInfo: {
                            duration,
                            dimensions: { width, height },
                            fileSize: file.size,
                            format: file.type,
                            aspectRatio
                        }
                    })
                }

                videoElement.onerror = () => {
                    URL.revokeObjectURL(videoUrl)
                    resolve({
                        isValid: false,
                        errors: [...basicValidation.errors, 'Unable to read video metadata'],
                        warnings: basicValidation.warnings
                    })
                }
            })
        } catch (error) {
            return {
                isValid: basicValidation.isValid,
                errors: basicValidation.errors,
                warnings: [...basicValidation.warnings, 'Could not validate video constraints']
            }
        }
    }

    /**
     * Prepare video for TikTok upload
     */
    static async prepareVideoUpload(
        file: File,
        videoProperties?: TikTokVideoProperties
    ): Promise<{
        isReady: boolean
        errors: string[]
        uploadInfo?: {
            fileSize: number
            format: string
            estimatedUploadTime: number
            compressionNeeded: boolean
        }
    }> {
        const validation = await this.validateVideoConstraints(file)

        if (!validation.isValid) {
            return {
                isReady: false,
                errors: validation.errors
            }
        }

        const fileSize = file.size
        const format = file.type

        // Estimate upload time based on file size (assuming average connection)
        const averageUploadSpeed = 5 * 1024 * 1024 // 5 MB/s average
        const estimatedUploadTime = Math.ceil(fileSize / averageUploadSpeed)

        // Check if compression might be needed
        const compressionNeeded = fileSize > 100 * 1024 * 1024 || // Over 100MB
            (validation.videoInfo?.dimensions &&
                (validation.videoInfo.dimensions.width > 1080 ||
                    validation.videoInfo.dimensions.height > 1920))

        return {
            isReady: true,
            errors: [],
            uploadInfo: {
                fileSize,
                format,
                estimatedUploadTime,
                compressionNeeded: compressionNeeded || false
            }
        }
    }

    /**
     * Upload video to TikTok with progress tracking
     */
    static async uploadVideoWithProgress(
        file: File,
        advertiserId: string,
        onProgress?: (progress: TikTokUploadProgress) => void
    ): Promise<TikTokVideoUpload> {
        const uploadId = `tiktok_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

        try {
            // Initialize progress
            onProgress?.({
                uploadId,
                status: 'preparing',
                progress: 0,
                bytesUploaded: 0,
                totalBytes: file.size
            })

            // Validate file first
            const validation = await this.validateVideoConstraints(file)
            if (!validation.isValid) {
                throw new Error(`Video validation failed: ${validation.errors.join(', ')}`)
            }

            // Set up client authentication
            this.client.setAuth({
                accessToken: process.env.TIKTOK_ACCESS_TOKEN || '',
                advertiserId
            })

            onProgress?.({
                uploadId,
                status: 'preparing',
                progress: 10,
                bytesUploaded: 0,
                totalBytes: file.size
            })

            // Step 1: Request upload URL
            const uploadDestination = await this.client.requestUploadUrl(file.size, 'mp4')

            onProgress?.({
                uploadId,
                status: 'uploading',
                progress: 20,
                bytesUploaded: 0,
                totalBytes: file.size,
                videoId: uploadDestination.videoId
            })

            // Step 2: Upload video file
            const fileBuffer = await file.arrayBuffer()
            const uploadResult = await this.client.uploadVideo(
                Buffer.from(fileBuffer),
                uploadDestination,
                file.name
            )

            onProgress?.({
                uploadId,
                status: 'processing',
                progress: 80,
                bytesUploaded: file.size,
                totalBytes: file.size,
                videoId: uploadResult.videoId
            })

            // Step 3: Check upload status
            let attempts = 0
            const maxAttempts = 10

            while (attempts < maxAttempts) {
                try {
                    const status = await this.client.checkUploadStatus(uploadResult.videoId)

                    if (status.status === 'UPLOADED') {
                        onProgress?.({
                            uploadId,
                            status: 'completed',
                            progress: 100,
                            bytesUploaded: file.size,
                            totalBytes: file.size,
                            videoId: uploadResult.videoId
                        })
                        break
                    } else if (status.status === 'FAILED') {
                        throw new Error('Video processing failed on TikTok servers')
                    }

                    // Update progress during processing
                    const processingProgress = 80 + (attempts / maxAttempts) * 15
                    onProgress?.({
                        uploadId,
                        status: 'processing',
                        progress: processingProgress,
                        bytesUploaded: file.size,
                        totalBytes: file.size,
                        videoId: uploadResult.videoId,
                        estimatedTimeRemaining: (maxAttempts - attempts) * 3 // 3 seconds per attempt
                    })

                    // Wait before next check
                    await new Promise(resolve => setTimeout(resolve, 3000))
                    attempts++
                } catch (statusError) {
                    console.warn('Upload status check failed, continuing...', statusError)
                    attempts++
                    await new Promise(resolve => setTimeout(resolve, 3000))
                }
            }

            return uploadResult
        } catch (error) {
            onProgress?.({
                uploadId,
                status: 'failed',
                progress: 0,
                bytesUploaded: 0,
                totalBytes: file.size,
                error: error instanceof Error ? error.message : 'Upload failed'
            })

            console.error('TikTok video upload failed:', error)
            throw error
        }
    }

    /**
     * Get optimal video settings for TikTok
     */
    static getOptimalVideoSettings(): {
        resolution: { width: number; height: number }
        aspectRatio: number
        frameRate: number
        bitrate: number
        format: string
    } {
        const constraints = TIKTOK_MEDIA_CONSTRAINTS.video

        return {
            resolution: constraints.recommendedResolution,
            aspectRatio: 0.5625, // 9:16
            frameRate: constraints.recommendedFrameRate,
            bitrate: constraints.recommendedBitrate,
            format: 'MP4'
        }
    }

    /**
     * Get video compression recommendations
     */
    static getCompressionRecommendations(file: File): {
        shouldCompress: boolean
        recommendations: string[]
        estimatedSizeReduction: number
    } {
        const recommendations: string[] = []
        let estimatedSizeReduction = 0

        if (file.size > 200 * 1024 * 1024) { // Over 200MB
            recommendations.push('Reduce video bitrate to 8 Mbps or lower')
            estimatedSizeReduction += 40
        }

        if (file.size > 100 * 1024 * 1024) { // Over 100MB
            recommendations.push('Consider reducing video duration if possible')
            recommendations.push('Use H.264 codec for better compression')
            estimatedSizeReduction += 20
        }

        if (!file.type.includes('mp4')) {
            recommendations.push('Convert to MP4 format for better compatibility')
            estimatedSizeReduction += 15
        }

        return {
            shouldCompress: recommendations.length > 0,
            recommendations,
            estimatedSizeReduction
        }
    }
}

export default TikTokMediaUploadService