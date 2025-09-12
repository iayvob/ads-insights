declare module 'cloudinary' {
    export const v2: {
        config: (options: {
            cloud_name: string;
            api_key: string;
            api_secret: string;
            secure: boolean;
        }) => void;

        uploader: {
            upload: (file: string, options?: any) => Promise<{
                public_id: string;
                secure_url: string;
                url: string;
                resource_type: string;
                format: string;
                width?: number;
                height?: number;
                duration?: number;
                bytes: number;
                created_at: string;
                [key: string]: any;
            }>;

            upload_stream: (options?: any, callback?: Function) => NodeJS.WritableStream;

            destroy: (publicId: string, options?: {
                resource_type?: 'image' | 'video' | 'raw';
                [key: string]: any;
            }) => Promise<{
                result: string;
                [key: string]: any;
            }>;
        };

        url: (publicId: string, options?: {
            resource_type?: 'image' | 'video' | 'raw';
            format?: string;
            secure?: boolean;
            transformation?: Array<{
                width?: number;
                height?: number;
                crop?: string;
                [key: string]: any;
            }>;
            [key: string]: any;
        }) => string;
    };
}
