import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
    try {
        console.log('🔍 TEST UPLOAD: Received request');

        const formData = await request.formData()
        const files = formData.getAll("files") as File[]
        const platforms = formData.get("platforms") as string || "[]"

        console.log('🔍 TEST UPLOAD: Form data received', {
            filesCount: files.length,
            platforms,
            fileDetails: files.map(f => ({
                name: f.name,
                size: f.size,
                type: f.type
            }))
        });

        return NextResponse.json({
            success: true,
            message: 'Test upload endpoint reached successfully',
            data: {
                filesReceived: files.length,
                platforms: JSON.parse(platforms),
                fileDetails: files.map(f => ({
                    name: f.name,
                    size: f.size,
                    type: f.type
                }))
            }
        })
    } catch (error) {
        console.error('❌ TEST UPLOAD: Error', error)
        return NextResponse.json({
            success: false,
            error: 'Test upload failed',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 })
    }
}