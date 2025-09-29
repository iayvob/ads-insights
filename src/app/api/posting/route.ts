import { NextRequest, NextResponse } from "next/server"
import { ServerSessionService } from "@/services/session-server"
import { PostRequestSchema, PostResponse, PostingErrorCodes, PlatformConstraints, MediaUpload, SocialPlatform } from "@/validations/posting-types"
import { validatePremiumAccess } from "@/lib/subscription-access"
import { AuthSession } from "@/validations/types"
import { Providers } from "@prisma/client"

interface PublishResult {
  results: Record<string, {
    status: "published" | "failed";
    postId?: string;
    error?: string;
    publishedAt?: string;
  }>;
  publishedAt?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Get and validate session
    const session = await ServerSessionService.getSession(request)
    if (!session?.userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      )
    }

    // Validate premium access for posting feature
    const premiumAccess = await validatePremiumAccess(session.userId, "posting")
    if (!premiumAccess.hasAccess) {
      return NextResponse.json(
        {
          success: false,
          error: PostingErrorCodes.PREMIUM_REQUIRED,
          message: "Premium subscription required for posting features"
        },
        { status: 403 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = PostRequestSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: PostingErrorCodes.INVALID_CONTENT,
          message: "Invalid request data",
          details: validationResult.error.errors
        },
        { status: 400 }
      )
    }

    const { platforms, content, media, schedule, isDraft } = validationResult.data


    // Validate platform connections
    const connectedPlatforms = await validatePlatformConnections(session.userId, platforms)
    const missingConnections = platforms.filter(p => !connectedPlatforms.includes(p))

    if (missingConnections.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: PostingErrorCodes.PLATFORM_NOT_CONNECTED,
          message: `Please connect to: ${missingConnections.join(", ")}`,
          details: { missingPlatforms: missingConnections }
        },
        { status: 400 }
      )
    }

    // Validate content and media for each platform
    const validationErrors = validatePlatformContent(platforms, content, media || [])
    console.log("Content validation errors:", validationErrors)
    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: PostingErrorCodes.INVALID_CONTENT,
          message: "Content validation failed for some platforms",
          details: validationErrors
        },
        { status: 400 }
      )
    }

    // Create post record
    const postId = await createPost({
      userId: session.userId,
      platforms,
      content,
      media,
      schedule,
      isDraft
    })

    // If not a draft, publish immediately or schedule
    let publishResult: PublishResult | undefined
    if (!isDraft) {
      if (schedule) {
        publishResult = await schedulePost(postId, schedule.scheduledAt)
      } else {
        publishResult = await publishPost(postId, platforms)
      }
    }

    // Prepare response
    const response: PostResponse = {
      id: postId,
      status: isDraft ? "draft" : schedule ? "scheduled" : "published",
      platforms: platforms.map(platform => ({
        platform,
        status: isDraft ? "pending" : publishResult?.results?.[platform]?.status || "pending",
        platformPostId: publishResult?.results?.[platform]?.postId,
        error: publishResult?.results?.[platform]?.error,
        publishedAt: publishResult?.results?.[platform]?.publishedAt
      })),
      content: {
        text: content.content,
        hashtags: content.hashtags,
        mentions: content.mentions,
        link: content.link
      },
      media: media?.map(m => ({
        id: m.filename, // This would be replaced with actual uploaded media ID
        url: "", // This would be the CDN URL
        filename: m.filename,
        type: m.type,
        size: m.size,
        dimensions: m.dimensions,
        duration: m.duration
      })),
      scheduledAt: schedule?.scheduledAt.toISOString(),
      publishedAt: publishResult?.publishedAt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    return NextResponse.json({
      success: true,
      data: response,
      message: isDraft ? "Post saved as draft" : schedule ? "Post scheduled successfully" : "Post published successfully"
    })

  } catch (error) {
    console.error("Posting API error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred"
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await ServerSessionService.getSession(request)
    if (!session?.userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") // draft, scheduled, published
    const platform = searchParams.get("platform")
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100)
    const offset = parseInt(searchParams.get("offset") || "0")

    const posts = await getUserPosts(session.userId, {
      status,
      platform,
      limit,
      offset
    })

    return NextResponse.json({
      success: true,
      data: posts
    })

  } catch (error) {
    console.error("Get posts error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_SERVER_ERROR",
        message: "Failed to retrieve posts"
      },
      { status: 500 }
    )
  }
}

// Helper functions
import { PlatformPostingService } from "@/services/platform-posting";
import { prisma } from "@/config/database/prisma";

async function validatePlatformConnections(userId: string, platforms: string[]): Promise<string[]> {
  try {
    // Get auth providers from database
    const authProviders = await prisma.authProvider.findMany({
      where: {
        userId,
        provider: { in: platforms.map(p => p as Providers) }
      }
    });

    if (!authProviders || authProviders.length === 0) {
      return [];
    }

    // Map auth providers to their platform names and filter for valid ones
    // (those with valid tokens that haven't expired)
    const connectedPlatforms = authProviders
      .filter(provider => {
        // Check if the provider has a valid access token and it hasn't expired
        return provider.accessToken &&
          provider.expiresAt &&
          new Date(provider.expiresAt) > new Date();
      })
      .map(provider => provider.provider);

    return connectedPlatforms;
  } catch (error) {
    console.error("Error validating platform connections:", error);
    return [];
  }
}

function validatePlatformContent(platforms: string[], content: any, media: MediaUpload[]): any[] {
  const errors = []

  for (const platform of platforms) {
    const constraints = PlatformConstraints[platform as keyof typeof PlatformConstraints]
    if (!constraints) {
      errors.push({
        platform,
        field: "platform",
        message: `Unsupported platform: ${platform}`
      });
      continue;
    }

    // Validate content length
    if (content.content && content.content.length > constraints.maxContentLength) {
      errors.push({
        platform,
        field: "content",
        message: `Content exceeds maximum length of ${constraints.maxContentLength} characters for ${platform}`
      });
    }

    // Platform-specific content validations
    switch (platform) {
      case 'twitter':
        // Twitter requires either content or media
        if (!content.content && (!media || media.length === 0)) {
          errors.push({
            platform,
            field: "content",
            message: "Twitter posts require either text content or media"
          });
        }
        break;
      case 'instagram':
        // Instagram requires media for posts
        if (!media || media.length === 0) {
          errors.push({
            platform,
            field: "media",
            message: "Instagram posts require at least one image or video"
          });
        }
        break;
    }

    // Validate media count
    if (media && media.length > constraints.maxMedia) {
      errors.push({
        platform,
        field: "media",
        message: `Too many media files for ${platform}. Maximum allowed: ${constraints.maxMedia}`
      });
    }

    // Platform-specific media validations
    if (platform === 'twitter' && media && media.length > 0) {
      const imageCount = media.filter(m => m.type === 'image').length;
      const videoCount = media.filter(m => m.type === 'video').length;

      if (imageCount > 4) {
        errors.push({
          platform,
          field: "media",
          message: "Twitter allows a maximum of 4 images per tweet"
        });
      }

      if (videoCount > 1) {
        errors.push({
          platform,
          field: "media",
          message: "Twitter allows only 1 video per tweet"
        });
      }

      if (imageCount > 0 && videoCount > 0) {
        errors.push({
          platform,
          field: "media",
          message: "Twitter does not allow mixing images and videos in the same tweet"
        });
      }
    }

    // Validate media types and sizes
    if (media && media.length > 0) {
      for (const mediaItem of media) {
        // Check if this media type is supported for this platform (only if mimeType is provided)
        if (mediaItem.mimeType && !constraints.supportedMediaTypes.includes(mediaItem.mimeType as any)) {
          errors.push({
            platform,
            field: "media",
            message: `Unsupported media type for ${platform}: ${mediaItem.mimeType}`
          });
        }

        // Check media size limits
        const maxSize = mediaItem.type === "video" ? constraints.maxVideoSize : constraints.maxImageSize;
        if (mediaItem.size > maxSize) {
          errors.push({
            platform,
            field: "media",
            message: `Media file too large for ${platform}. Maximum size: ${maxSize / (1024 * 1024)}MB`
          });
        }

        // Check video duration for platforms with duration limits
        if (mediaItem.type === "video" && mediaItem.duration) {
          if (constraints.maxVideoDuration && mediaItem.duration > constraints.maxVideoDuration) {
            errors.push({
              platform,
              field: "media",
              message: `Video duration exceeds maximum of ${constraints.maxVideoDuration} seconds for ${platform}`
            });
          }
        }
      }
    }
  }

  return errors;
}

// Since we don't have a Post model in the database, we'll create in-memory storage for posts
// In a production environment, you would use a database table
const memoryPosts = new Map<string, any>();

async function createPost(postData: any): Promise<string> {
  try {
    const postId = `post_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Store post data in memory (would be in database in production)
    memoryPosts.set(postId, {
      id: postId,
      userId: postData.userId,
      content: postData.content.content,
      hashtags: postData.content.hashtags || [],
      mentions: postData.content.mentions || [],
      link: postData.content.link || null,
      status: postData.isDraft ? "draft" : postData.schedule ? "scheduled" : "pending",
      scheduledFor: postData.schedule?.scheduledAt || null,
      platforms: postData.platforms,
      mediaIds: postData.media?.map((m: any) => m.id || m.filename).filter(Boolean) || [],
      amazonContent: postData.amazon || null, // Store Amazon-specific content
      tiktokContent: postData.tiktok || null, // Store TikTok-specific content
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return postId;
  } catch (error) {
    console.error("Error creating post:", error);
    return `temp_post_${Date.now()}`;
  }
}

async function schedulePost(postId: string, scheduledAt: Date): Promise<PublishResult> {
  try {
    // Update post status in memory
    const post = memoryPosts.get(postId);
    if (post) {
      post.status = "scheduled";
      post.scheduledFor = scheduledAt;
      post.updatedAt = new Date();
      memoryPosts.set(postId, post);
    }

    return {
      results: {},
      publishedAt: scheduledAt.toISOString()
    };
  } catch (error) {
    console.error("Error scheduling post:", error);
    return {
      results: {},
      publishedAt: scheduledAt.toISOString()
    };
  }
}

async function publishPost(postId: string, platforms: string[]): Promise<PublishResult> {
  const results: Record<string, any> = {};
  let publishedAt = new Date().toISOString();

  try {
    // Get post data from memory
    const post = memoryPosts.get(postId);
    if (!post) {
      throw new Error("Post not found");
    }

    // For a real app, we would retrieve the user's session from the database
    // Since we don't have access to getUserSession, we'll simulate it
    // In production, you'd get the session with platform connections

    // Try to find auth providers for the user
    const authProviders = await prisma.authProvider.findMany({
      where: { userId: post.userId }
    });

    // Create a mock session with connection data
    const session: AuthSession = {
      userId: post.userId,
      connectedPlatforms: {}
    };

    // Add connected platforms to the session based on auth providers
    for (const provider of authProviders) {
      if (provider.provider === 'facebook' && provider.accessToken) {
        session.connectedPlatforms!.facebook = {
          account: {
            userId: provider.providerId,
            username: provider.username || 'facebook_user',
            email: provider.email || '',
            advertisingAccountId: provider.advertisingAccountId || undefined
          },
          account_tokens: {
            access_token: provider.accessToken,
            refresh_token: provider.refreshToken || undefined,
            expires_at: provider.expiresAt ? provider.expiresAt.getTime() : Date.now() + 3600000
          }
        };
      } else if (provider.provider === 'instagram' && provider.accessToken) {
        session.connectedPlatforms!.instagram = {
          account: {
            userId: provider.providerId,
            username: provider.username || 'instagram_user',
            email: provider.email || ''
          },
          account_tokens: {
            access_token: provider.accessToken,
            refresh_token: provider.refreshToken || undefined,
            expires_at: provider.expiresAt ? provider.expiresAt.getTime() : Date.now() + 3600000
          }
        };
      } else if (provider.provider === 'twitter' && provider.accessToken) {
        session.connectedPlatforms!.twitter = {
          account: {
            userId: provider.providerId,
            username: provider.username || 'twitter_user',
            email: provider.email || ''
          },
          account_tokens: {
            access_token: provider.accessToken,
            refresh_token: provider.refreshToken || undefined,
            expires_at: provider.expiresAt ? provider.expiresAt.getTime() : Date.now() + 3600000
          }
        };
      } else if (provider.provider === 'amazon' && provider.accessToken) {
        session.connectedPlatforms!.amazon = {
          account: {
            userId: provider.providerId,
            username: provider.username || 'amazon_seller',
            email: provider.email || ''
          },
          account_tokens: {
            access_token: provider.accessToken,
            refresh_token: provider.refreshToken || undefined,
            expires_at: provider.expiresAt ? provider.expiresAt.getTime() : Date.now() + 3600000
          }
        };
      } else if (provider.provider === 'tiktok' && provider.accessToken) {
        session.connectedPlatforms!.tiktok = {
          account: {
            userId: provider.providerId,
            username: provider.username || 'tiktok_user',
            display_name: provider.username || 'TikTok User'
          },
          account_tokens: {
            access_token: provider.accessToken,
            refresh_token: provider.refreshToken || undefined,
            expires_at: provider.expiresAt ? provider.expiresAt.getTime() : Date.now() + 3600000
          }
        };
      }
    }

    if (!session.connectedPlatforms || Object.keys(session.connectedPlatforms).length === 0) {
      throw new Error("No connected platforms found for user");
    }

    // Format post content
    const postContent = {
      text: post.content,
      hashtags: post.hashtags,
      mentions: post.mentions,
      link: post.link
    };

    // Format media for publishing - fetch real media URLs from database
    let media: Array<{
      id: string;
      url: string;
      type: 'image' | 'video';
      mimeType: string;
    }> = [];

    if (post.mediaIds && post.mediaIds.length > 0) {
      // Import MediaFileUtils dynamically to avoid circular dependencies
      const { MediaFileUtils } = await import('@/utils/media-file-utils');

      for (const mediaId of post.mediaIds) {
        try {
          const mediaFile = await MediaFileUtils.findById(mediaId);
          if (mediaFile) {
            // Convert relative URLs to absolute URLs for external access
            let absoluteUrl = mediaFile.url;
            if (absoluteUrl.startsWith('/')) {
              // Convert old /uploads/ URLs to new /api/uploads/ URLs
              if (absoluteUrl.startsWith('/uploads/')) {
                absoluteUrl = absoluteUrl.replace('/uploads/', '/api/uploads/');
              }

              // Use environment variable or default for absolute URL construction
              const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
              absoluteUrl = `${baseUrl}${absoluteUrl}`;
            }

            media.push({
              id: mediaFile.id,
              url: absoluteUrl,
              type: mediaFile.isVideo ? 'video' : 'image',
              mimeType: mediaFile.fileType
            });
          } else {
            console.warn(`Media file not found for ID: ${mediaId}`);
          }
        } catch (error) {
          console.error(`Error fetching media file ${mediaId}:`, error);
        }
      }
    }

    console.log('Media resolved for posting:', {
      mediaIds: post.mediaIds,
      resolvedMediaCount: media.length,
      mediaUrls: media.map(m => ({ id: m.id, url: m.url, type: m.type }))
    });

    // Publish to each platform
    for (const platform of platforms) {
      // Skip if we already know the token is expired (from the previous loop)
      if (results[platform] && results[platform].status === "failed") {
        console.log(`Skipping ${platform} due to previous authentication error`);
        continue;
      }

      try {
        // Format post content specifically for this platform
        let platformSpecificText = postContent.text;

        // Add hashtags in appropriate format for the platform
        if (postContent.hashtags && postContent.hashtags.length > 0) {
          const hashtagString = postContent.hashtags.map((tag: string) => `#${tag}`).join(' ');
          platformSpecificText += `\n\n${hashtagString}`;
        }

        // Add link if provided
        if (postContent.link) {
          platformSpecificText += `\n\n${postContent.link}`;
        }

        // Call platform-specific posting service
        const postingContent = {
          text: platformSpecificText,
          media,
          hashtags: postContent.hashtags,
          mentions: postContent.mentions,
          // Add Amazon-specific content for Amazon platform
          ...(platform === 'amazon' && post.amazonContent && {
            brandContent: {
              brandName: post.amazonContent.brandEntityId || 'Unknown Brand',
              headline: post.amazonContent.brandStoryTitle,
              targetAudience: post.amazonContent.targetAudience?.demographics?.gender?.toLowerCase() || 'general',
              productHighlights: post.amazonContent.targetAudience?.interests || []
            },
            productASINs: post.amazonContent.productAsins || []
          }),
          // Add TikTok-specific content for TikTok platform
          ...(platform === 'tiktok' && post.tiktokContent && {
            tiktokContent: {
              advertiserId: post.tiktokContent.advertiserId,
              videoProperties: post.tiktokContent.videoProperties,
              privacy: post.tiktokContent.privacy || 'PUBLIC',
              allowComments: post.tiktokContent.allowComments ?? true,
              allowDuet: post.tiktokContent.allowDuet ?? true,
              allowStitch: post.tiktokContent.allowStitch ?? true,
              brandedContent: post.tiktokContent.brandedContent ?? false,
              promotionalContent: post.tiktokContent.promotionalContent ?? false
            }
          })
        };

        const platformResult = await PlatformPostingService.postToPlatform(
          session,
          platform as SocialPlatform,
          postingContent
        );

        if (platformResult.success) {
          results[platform] = {
            status: "published",
            postId: platformResult.platformPostId,
            url: platformResult.url,
            publishedAt: new Date().toISOString()
          };
          console.log(`Successfully posted to ${platform}`);
        } else {
          results[platform] = {
            status: "failed",
            error: platformResult.error || `Failed to publish to ${platform}`
          };
          console.error(`Failed to publish to ${platform}: ${platformResult.error}`);
        }
      } catch (error) {
        console.error(`Error publishing to ${platform}:`, error);
        results[platform] = {
          status: "failed",
          error: `Failed to publish to ${platform}: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }
    }

    // Update post status in memory
    post.status = "published";
    post.publishedAt = new Date();
    post.updatedAt = new Date();
    post.platformResults = results;
    memoryPosts.set(postId, post);

    return {
      results,
      publishedAt
    };
  } catch (error) {
    console.error("Error publishing post:", error);

    // Make sure to return results for all platforms even if there was an error
    for (const platform of platforms) {
      if (!results[platform]) {
        results[platform] = {
          status: "failed",
          error: `Failed to publish to ${platform}: System error`
        };
      }
    }

    return {
      results,
      publishedAt
    };
  }
}

async function getUserPosts(userId: string, filters: any): Promise<PostResponse[]> {
  const { status, platform, limit = 20, offset = 0 } = filters;

  // Import MediaFileUtils dynamically to avoid circular dependencies
  const { MediaFileUtils } = await import('@/utils/media-file-utils');

  // Get posts from memory storage (in production, this would be a database query)
  const posts = Array.from(memoryPosts.values())
    .filter(post => post.userId === userId)
    .filter(post => !status || post.status === status)
    .filter(post => !platform || post.platforms.includes(platform))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(offset, offset + limit);

  // Process each post to get real media URLs
  const postsWithRealMedia = await Promise.all(posts.map(async (post) => {
    let media: Array<{
      id: string;
      url: string;
      filename: string;
      type: 'image' | 'video';
      size: number;
    }> = [];

    if (post.mediaIds && post.mediaIds.length > 0) {
      for (const mediaId of post.mediaIds) {
        try {
          const mediaFile = await MediaFileUtils.findById(mediaId);
          if (mediaFile) {
            media.push({
              id: mediaFile.id,
              url: mediaFile.url,
              filename: mediaFile.filename,
              type: mediaFile.isVideo ? 'video' : 'image',
              size: mediaFile.fileSize
            });
          }
        } catch (error) {
          console.error(`Error fetching media file ${mediaId}:`, error);
        }
      }
    }

    return {
      id: post.id,
      status: post.status,
      platforms: post.platforms.map((p: string) => ({
        platform: p,
        status: post.platformResults?.[p]?.status || 'pending',
        platformPostId: post.platformResults?.[p]?.postId,
        error: post.platformResults?.[p]?.error,
        publishedAt: post.platformResults?.[p]?.publishedAt
      })),
      content: {
        text: post.content,
        hashtags: post.hashtags,
        mentions: post.mentions,
        link: post.link
      },
      media,
      scheduledAt: post.scheduledFor?.toISOString(),
      publishedAt: post.publishedAt?.toISOString(),
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString()
    };
  }));

  return postsWithRealMedia;
}
