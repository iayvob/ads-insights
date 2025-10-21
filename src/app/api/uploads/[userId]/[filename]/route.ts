import { NextRequest, NextResponse } from "next/server"
import { readFile } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"
import { tmpdir } from "os"

// Use /tmp directory for serverless environments (Vercel)
// In development, use local uploads directory
const isProduction = process.env.NODE_ENV === 'production'
const uploadsDir = isProduction ? join(tmpdir(), 'uploads') : join(process.cwd(), 'uploads')

// Handle GET requests to serve uploaded files
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ userId: string; filename: string }> }
) {
    try {
        console.log('🔍 Direct file serving request starting...');

        const { userId, filename } = await params;
        console.log('🔍 Direct file serving request:', { userId, filename });

        // Basic validation
        if (!userId.match(/^[a-f0-9]{24}$/) || !filename.match(/^[a-zA-Z0-9._-]+$/)) {
            console.error('❌ Invalid file path format:', { userId, filename });
            return NextResponse.json(
                { error: "Invalid file path format" },
                { status: 400 }
            );
        }

        // Construct file path
        const filePath = join(uploadsDir, userId, filename);
        console.log('🔍 File path construction:', { uploadsDir, userId, filename, filePath });

        // Security check: prevent path traversal
        if (!filePath.startsWith(join(uploadsDir, userId))) {
            console.error('❌ Path traversal detected:', filePath);
            return NextResponse.json(
                { error: "Invalid file path" },
                { status: 400 }
            );
        }

        // Check if file exists
        if (!existsSync(filePath)) {
            console.log(`❌ File not found: ${filePath}`);
            return NextResponse.json(
                { error: "File not found" },
                { status: 404 }
            );
        }

        console.log('✅ File found, serving:', filePath);

        // Read and serve the file
        const fileBuffer = await readFile(filePath);

        // Determine content type based on file extension
        const ext = filename.toLowerCase().split('.').pop();
        let contentType = 'application/octet-stream';

        switch (ext) {
            case 'jpg':
            case 'jpeg':
                contentType = 'image/jpeg';
                break;
            case 'png':
                contentType = 'image/png';
                break;
            case 'gif':
                contentType = 'image/gif';
                break;
            case 'webp':
                contentType = 'image/webp';
                break;
            case 'mp4':
                contentType = 'video/mp4';
                break;
            case 'webm':
                contentType = 'video/webm';
                break;
            case 'mov':
                contentType = 'video/quicktime';
                break;
        }

        return new NextResponse(fileBuffer as unknown as BodyInit, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'private, max-age=3600',
            },
        });

    } catch (error) {
        console.error("Error serving file:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}