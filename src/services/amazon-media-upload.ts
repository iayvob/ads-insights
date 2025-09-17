/**
 * Amazon Media Upload Service
 * Handles media uploads specifically for Amazon Posts and brand content
 */

import { createHash } from 'crypto'
import {
    AmazonMediaAsset,
    AmazonUploadDestination,
    PostingErrorCodes
} from '@/validations/posting-types'
import { AmazonPostingClient } from './amazon-posting-client'

// Amazon media constraints
export const AMAZON_MEDIA_CONSTRAINTS = {
    image: {
        maxSize: 10 * 1024 * 1024, // 10MB
        maxWidth: 2048,
        maxHeight: 2048,
        minWidth: 400,
        minHeight: 400,
        allowedTypes: ['image/jpeg', 'image/png', 'image/webp'] as const,
        allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp'] as const,
    },
    video: {
        maxSize: 100 * 1024 * 1024, // 100MB
        maxWidth: 1920,
        maxHeight: 1080,
        minWidth: 640,
        minHeight: 480,
        maxDuration: 60, // 60 seconds
        allowedTypes: ['video/mp4', 'video/quicktime', 'video/x-msvideo'] as const,
        allowedExtensions: ['.mp4', '.mov', '.avi'] as const,
    },
    brandLogo: {
        maxSize: 2 * 1024 * 1024, // 2MB
        maxWidth: 500,
        maxHeight: 500,
        minWidth: 100,
        minHeight: 100,
        allowedTypes: ['image/jpeg', 'image/png'] as const,
        allowedExtensions: ['.jpg', '.jpeg', '.png'] as const,
        aspectRatio: 1, // Square logos preferred
    },
    postImage: {
        maxSize: 5 * 1024 * 1024, // 5MB
        maxWidth: 1200,
        maxHeight: 1200,
        minWidth: 400,
        minHeight: 400,
        allowedTypes: ['image/jpeg', 'image/png', 'image/webp'] as const,
        allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp'] as const,
    }
} as const

interface MediaProcessingOptions {
    userId: string
    mediaType: 'image' | 'video' | 'brandLogo' | 'postImage'
    amazonClient: AmazonPostingClient
    generateThumbnail?: boolean
    optimizeForAmazon?: boolean
}

interface ProcessedMediaResult {
    asset: AmazonMediaAsset
    uploadDestination: AmazonUploadDestination
    processingMetadata: {
        originalSize: number
        processedSize: number
        compressionRatio: number
        dimensions: { width: number; height: number }
        duration?: number
    }
}

export class AmazonMediaUploadService {
    /**
     * Validate media file against Amazon constraints
     */
    static validateMediaFile(
        file: File,
        mediaType: keyof typeof AMAZON_MEDIA_CONSTRAINTS
    ): { isValid: boolean; errors: string[] } {
        const constraints = AMAZON_MEDIA_CONSTRAINTS[mediaType]
        const errors: string[] = []

        // Check file size
        if (file.size > constraints.maxSize) {
            errors.push(`File size exceeds ${constraints.maxSize / (1024 * 1024)}MB limit`)
        }

        // Check file type
        const allowedTypes = constraints.allowedTypes as readonly string[];
        if (!allowedTypes.includes(file.type)) {
            errors.push(`File type ${file.type} not supported. Allowed types: ${constraints.allowedTypes.join(', ')}`)
        }

        // Check file extension
        const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
        const allowedExtensions = constraints.allowedExtensions as readonly string[];
        if (!allowedExtensions.includes(fileExtension)) {
            errors.push(`File extension ${fileExtension} not supported. Allowed extensions: ${constraints.allowedExtensions.join(', ')}`)
        }

        return {
            isValid: errors.length === 0,
            errors
        }
    }

    /**
     * Get image dimensions from file
     */
    static async getImageDimensions(file: File): Promise<{ width: number; height: number }> {
        return new Promise((resolve, reject) => {
            const img = new Image()
            img.onload = () => {
                resolve({ width: img.width, height: img.height })
            }
            img.onerror = () => {
                reject(new Error('Failed to load image for dimension calculation'))
            }
            img.src = URL.createObjectURL(file)
        })
    }

    /**
     * Get video metadata from file
     */
    static async getVideoMetadata(file: File): Promise<{
        width: number;
        height: number;
        duration: number
    }> {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video')
            video.onloadedmetadata = () => {
                resolve({
                    width: video.videoWidth,
                    height: video.videoHeight,
                    duration: video.duration
                })
                URL.revokeObjectURL(video.src)
            }
            video.onerror = () => {
                reject(new Error('Failed to load video for metadata extraction'))
                URL.revokeObjectURL(video.src)
            }
            video.src = URL.createObjectURL(file)
        })
    }

    /**
     * Validate media dimensions and duration
     */
    static async validateMediaConstraints(
        file: File,
        mediaType: keyof typeof AMAZON_MEDIA_CONSTRAINTS
    ): Promise<{ isValid: boolean; errors: string[] }> {
        const constraints = AMAZON_MEDIA_CONSTRAINTS[mediaType]
        const errors: string[] = []

        try {
            if (file.type.startsWith('image/')) {
                const dimensions = await this.getImageDimensions(file)

                if (dimensions.width < constraints.minWidth || dimensions.height < constraints.minHeight) {
                    errors.push(`Image dimensions too small. Minimum: ${constraints.minWidth}x${constraints.minHeight}px`)
                }

                if (dimensions.width > constraints.maxWidth || dimensions.height > constraints.maxHeight) {
                    errors.push(`Image dimensions too large. Maximum: ${constraints.maxWidth}x${constraints.maxHeight}px`)
                }

                // Check aspect ratio for brand logos
                if (mediaType === 'brandLogo' && 'aspectRatio' in constraints) {
                    const aspectRatio = dimensions.width / dimensions.height
                    const targetRatio = (constraints as any).aspectRatio
                    if (Math.abs(aspectRatio - targetRatio) > 0.1) {
                        errors.push(`Brand logo should be square (1:1 aspect ratio)`)
                    }
                }
            } else if (file.type.startsWith('video/')) {
                const metadata = await this.getVideoMetadata(file)

                if (metadata.width < constraints.minWidth || metadata.height < constraints.minHeight) {
                    errors.push(`Video dimensions too small. Minimum: ${constraints.minWidth}x${constraints.minHeight}px`)
                }

                if (metadata.width > constraints.maxWidth || metadata.height > constraints.maxHeight) {
                    errors.push(`Video dimensions too large. Maximum: ${constraints.maxWidth}x${constraints.maxHeight}px`)
                }

                if ('maxDuration' in constraints && metadata.duration > (constraints as any).maxDuration) {
                    errors.push(`Video duration too long. Maximum: ${(constraints as any).maxDuration} seconds`)
                }
            }
        } catch (error) {
            errors.push('Failed to validate media constraints')
            console.error('Media constraint validation error:', error)
        }

        return {
            isValid: errors.length === 0,
            errors
        }
    }

    /**
     * Optimize image for Amazon upload
     */
    static async optimizeImageForAmazon(
        file: File,
        mediaType: keyof typeof AMAZON_MEDIA_CONSTRAINTS,
        targetQuality: number = 0.85
    ): Promise<{ optimizedFile: Blob; metadata: any }> {
        const constraints = AMAZON_MEDIA_CONSTRAINTS[mediaType]

        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')
            const img = new Image()

            img.onload = () => {
                // Calculate optimal dimensions
                let { width, height } = img
                const maxWidth = constraints.maxWidth
                const maxHeight = constraints.maxHeight

                if (width > maxWidth || height > maxHeight) {
                    const ratio = Math.min(maxWidth / width, maxHeight / height)
                    width = Math.floor(width * ratio)
                    height = Math.floor(height * ratio)
                }

                canvas.width = width
                canvas.height = height

                // Draw and compress
                ctx?.drawImage(img, 0, 0, width, height)

                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            resolve({
                                optimizedFile: blob,
                                metadata: {
                                    originalSize: file.size,
                                    optimizedSize: blob.size,
                                    compressionRatio: file.size / blob.size,
                                    dimensions: { width, height }
                                }
                            })
                        } else {
                            reject(new Error('Failed to optimize image'))
                        }
                    },
                    'image/jpeg',
                    targetQuality
                )
            }

            img.onerror = () => reject(new Error('Failed to load image for optimization'))
            img.src = URL.createObjectURL(file)
        })
    }

    /**
     * Process and upload media to Amazon
     */
    static async processAndUploadMedia(
        file: File,
        options: MediaProcessingOptions
    ): Promise<ProcessedMediaResult> {
        try {
            // Validate file
            const validation = this.validateMediaFile(file, options.mediaType)
            if (!validation.isValid) {
                throw new Error(`Invalid file: ${validation.errors.join(', ')}`)
            }

            // Validate constraints
            const constraintsValidation = await this.validateMediaConstraints(file, options.mediaType)
            if (!constraintsValidation.isValid) {
                throw new Error(`File constraints not met: ${constraintsValidation.errors.join(', ')}`)
            }

            // Optimize file if requested
            let fileToUpload: File | Blob = file
            let processingMetadata: any = {
                originalSize: file.size,
                processedSize: file.size,
                compressionRatio: 1,
            }

            if (options.optimizeForAmazon && file.type.startsWith('image/')) {
                const optimized = await this.optimizeImageForAmazon(file, options.mediaType)
                fileToUpload = optimized.optimizedFile
                processingMetadata = optimized.metadata
            }

            // Get file metadata
            let dimensions = { width: 0, height: 0 }
            let duration: number | undefined

            if (file.type.startsWith('image/')) {
                dimensions = await this.getImageDimensions(file)
            } else if (file.type.startsWith('video/')) {
                const videoMetadata = await this.getVideoMetadata(file)
                dimensions = { width: videoMetadata.width, height: videoMetadata.height }
                duration = videoMetadata.duration
            }

            // Create upload destination
            const uploadDestination = await options.amazonClient.createUploadDestination(
                file.type,
                file.name
            )

            // Convert file to buffer for upload
            const buffer = await fileToUpload.arrayBuffer()

            // Upload to Amazon
            const asset = await options.amazonClient.uploadMedia(
                Buffer.from(buffer),
                uploadDestination,
                file.name
            )

            // Update asset with actual metadata
            const finalAsset: AmazonMediaAsset = {
                ...asset,
                dimensions,
                fileSize: processingMetadata.processedSize,
            }

            return {
                asset: finalAsset,
                uploadDestination,
                processingMetadata: {
                    ...processingMetadata,
                    dimensions,
                    duration,
                }
            }
        } catch (error) {
            console.error('Failed to process and upload media:', error)
            throw new Error(`Media upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    /**
     * Upload multiple media files for Amazon post
     */
    static async uploadMultipleMedia(
        files: File[],
        options: Omit<MediaProcessingOptions, 'mediaType'> & { defaultMediaType?: string }
    ): Promise<ProcessedMediaResult[]> {
        const results: ProcessedMediaResult[] = []
        const errors: string[] = []

        for (const [index, file] of files.entries()) {
            try {
                // Determine media type based on file type
                let mediaType: keyof typeof AMAZON_MEDIA_CONSTRAINTS = 'postImage'
                if (file.type.startsWith('video/')) {
                    mediaType = 'video'
                } else if (options.defaultMediaType === 'brandLogo') {
                    mediaType = 'brandLogo'
                }

                const result = await this.processAndUploadMedia(file, {
                    ...options,
                    mediaType,
                })

                results.push(result)
            } catch (error) {
                const errorMessage = `File ${index + 1} (${file.name}): ${error instanceof Error ? error.message : 'Unknown error'}`
                errors.push(errorMessage)
                console.error('Media upload error:', error)
            }
        }

        if (errors.length > 0 && results.length === 0) {
            throw new Error(`All media uploads failed: ${errors.join('; ')}`)
        }

        if (errors.length > 0) {
            console.warn('Some media uploads failed:', errors)
        }

        return results
    }

    /**
     * Generate thumbnail for video content
     */
    static async generateVideoThumbnail(file: File): Promise<Blob> {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video')
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')

            video.onloadedmetadata = () => {
                canvas.width = video.videoWidth
                canvas.height = video.videoHeight

                // Seek to 25% of video duration for thumbnail
                video.currentTime = video.duration * 0.25
            }

            video.onseeked = () => {
                ctx?.drawImage(video, 0, 0, canvas.width, canvas.height)

                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            resolve(blob)
                        } else {
                            reject(new Error('Failed to generate thumbnail'))
                        }
                        URL.revokeObjectURL(video.src)
                    },
                    'image/jpeg',
                    0.8
                )
            }

            video.onerror = () => {
                reject(new Error('Failed to load video for thumbnail generation'))
                URL.revokeObjectURL(video.src)
            }

            video.src = URL.createObjectURL(file)
        })
    }

    /**
     * Get media type recommendations based on file
     */
    static getMediaTypeRecommendation(file: File): {
        recommendedType: keyof typeof AMAZON_MEDIA_CONSTRAINTS
        reason: string
        alternatives: string[]
    } {
        const fileName = file.name.toLowerCase()
        const fileType = file.type

        if (fileName.includes('logo') || fileName.includes('brand')) {
            return {
                recommendedType: 'brandLogo',
                reason: 'Filename suggests this is a brand logo',
                alternatives: ['postImage', 'image']
            }
        }

        if (fileType.startsWith('video/')) {
            return {
                recommendedType: 'video',
                reason: 'File is a video format',
                alternatives: []
            }
        }

        if (fileType.startsWith('image/')) {
            // Check dimensions to recommend type
            return {
                recommendedType: 'postImage',
                reason: 'File is an image suitable for posts',
                alternatives: ['image', 'brandLogo']
            }
        }

        return {
            recommendedType: 'postImage',
            reason: 'Default recommendation for unknown file type',
            alternatives: ['image', 'video']
        }
    }
}

// Export constraints for frontend validation
export { AMAZON_MEDIA_CONSTRAINTS as AMAZON_CONSTRAINTS }