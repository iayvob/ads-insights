import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
});

export default cloudinary;

/**
 * Upload a buffer to Cloudinary
 * @param buffer - File buffer to upload
 * @param options - Upload options
 * @returns Upload result with URL and public_id
 */
export async function uploadToCloudinary(
    buffer: Buffer,
    options: {
        folder?: string;
        resourceType?: 'image' | 'video' | 'raw' | 'auto';
        publicId?: string;
        transformation?: any;
    } = {}
): Promise<{
    url: string;
    secureUrl: string;
    publicId: string;
    resourceType: string;
    format: string;
    width?: number;
    height?: number;
    duration?: number;
    bytes: number;
}> {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: options.folder || 'media-uploads',
                resource_type: options.resourceType || 'auto',
                public_id: options.publicId,
                transformation: options.transformation,
            },
            (error, result) => {
                if (error) {
                    reject(error);
                } else if (result) {
                    resolve({
                        url: result.url,
                        secureUrl: result.secure_url,
                        publicId: result.public_id,
                        resourceType: result.resource_type,
                        format: result.format,
                        width: result.width,
                        height: result.height,
                        duration: result.duration,
                        bytes: result.bytes,
                    });
                } else {
                    reject(new Error('Upload failed: No result returned'));
                }
            }
        );

        uploadStream.end(buffer);
    });
}

/**
 * Delete a file from Cloudinary
 * @param publicId - The public ID of the file to delete
 * @param resourceType - Type of resource (image, video, raw)
 * @returns Deletion result
 */
export async function deleteFromCloudinary(
    publicId: string,
    resourceType: 'image' | 'video' | 'raw' = 'image'
): Promise<{ result: string }> {
    return cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
    });
}

/**
 * Generate a thumbnail URL for a Cloudinary image/video
 * @param publicId - The public ID of the file
 * @param options - Transformation options
 * @returns Thumbnail URL
 */
export function getCloudinaryThumbnail(
    publicId: string,
    options: {
        width?: number;
        height?: number;
        crop?: string;
        quality?: number;
    } = {}
): string {
    return cloudinary.url(publicId, {
        width: options.width || 300,
        height: options.height || 300,
        crop: options.crop || 'fill',
        quality: options.quality || 'auto',
        fetch_format: 'auto',
    });
}
