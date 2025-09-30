'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Image,
  Video,
  Calendar,
  Clock,
  Send,
  Plus,
  X,
  Sparkles,
  Zap,
  Target,
  TrendingUp,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { PlatformSelector } from '@/components/posting/platform-selector';
import { MediaUploader } from '@/components/posting/media-uploader';
import { PostScheduler } from '@/components/posting/post-scheduler';
import { PostPreview } from '@/components/posting/post-preview';
import { PremiumGate } from '@/components/posting/premium-gate';
import { AIEnhancementPanel } from '@/components/posting/ai-enhancement-panel';
import { AmazonContentEditor } from '@/components/posting/amazon-content-editor';
import { TikTokContentEditor } from '@/components/posting/tiktok-content-editor';
import { usePosting } from '@/hooks/use-posting';
import { SocialPlatform } from '@/validations/posting-types';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSession } from '@/hooks/session-context';
import { SubscriptionPlan } from '@prisma/client';

// Utility function for TikTok video validation (moved outside component for performance)
const validateTikTokVideo = (file: File): string[] => {
  const errors: string[] = [];

  // File size validation (500MB max)
  if (file.size > 500 * 1024 * 1024) {
    errors.push('TikTok video file size exceeds 500MB limit');
  }

  // File type validation
  const allowedTypes = ['video/mp4', 'video/quicktime', 'video/webm'];
  if (!allowedTypes.includes(file.type)) {
    errors.push(
      `Unsupported video format. Allowed: ${allowedTypes.join(', ')}`
    );
  }

  return errors;
};

export default function PostingPage() {
  const { data: session, isLoading } = useSession();
  const {
    isLoading: isPosting,
    isUploading,
    uploadedMedia,
    uploadMedia,
    removeMedia,
    createPost,
    loadConnectedPlatforms,
    validateContent,
    extractHashtags,
    extractMentions,
  } = usePosting();

  const [postContent, setPostContent] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<SocialPlatform[]>(
    []
  );
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<Date | null>(null);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [currentHashtag, setCurrentHashtag] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishSuccess, setPublishSuccess] = useState<string | null>(null);

  // Amazon-specific state
  const [amazonBrandContent, setAmazonBrandContent] = useState({
    brandName: '',
    headline: undefined as string | undefined,
    targetAudience: 'general' as string | undefined,
    productHighlights: [] as string[] | undefined,
  });
  const [amazonProductASINs, setAmazonProductASINs] = useState<string[]>([]);

  // TikTok-specific state
  const [tiktokContent, setTikTokContent] = useState({
    advertiserId: '',
    videoProperties: {
      title: '',
      description: '',
      tags: [] as string[],
      category: undefined as
        | 'EDUCATION'
        | 'ENTERTAINMENT'
        | 'COMEDY'
        | 'MUSIC'
        | 'DANCE'
        | 'SPORTS'
        | 'FOOD'
        | 'BEAUTY'
        | 'FASHION'
        | 'LIFESTYLE'
        | 'TECHNOLOGY'
        | 'BUSINESS'
        | 'GAMING'
        | 'PETS'
        | 'DIY'
        | 'TRAVEL'
        | undefined,
      language: 'en',
      thumbnailTime: undefined as number | undefined,
    },
    privacy: 'PUBLIC' as 'PUBLIC' | 'PRIVATE' | 'FOLLOWERS_ONLY',
    allowComments: true,
    allowDuet: true,
    allowStitch: true,
    brandedContent: false,
    promotionalContent: false,
  });
  const [selectedTikTokVideo, setSelectedTikTokVideo] = useState<File | null>(
    null
  );

  // Determine disabled states
  const isPublishing = isPosting || isUploading;
  const noPlatformsSelected = selectedPlatforms.length === 0;
  const shouldDisableContent = isPublishing || noPlatformsSelected;

  // Check if user has premium access
  const isPremium =
    session?.user?.plan === SubscriptionPlan.PREMIUM_MONTHLY ||
    session?.user?.plan === SubscriptionPlan.PREMIUM_YEARLY;

  // Load connected platforms on mount
  useEffect(() => {
    loadConnectedPlatforms();
  }, [loadConnectedPlatforms]);

  // Auto-extract hashtags from content
  useEffect(() => {
    const extractedHashtags = extractHashtags(postContent);
    if (extractedHashtags.length > 0) {
      setHashtags((prev) => {
        const combined = [...new Set([...prev, ...extractedHashtags])];
        return combined;
      });
    }
  }, [postContent, extractHashtags]);

  // Memoized validation for better performance
  const validationResult = useMemo(() => {
    if (!postContent || selectedPlatforms.length === 0) {
      return { errors: [] };
    }

    const validation = validateContent(postContent, selectedPlatforms);
    const allErrors = [...validation.errors];

    // Note: Instagram media validation is now handled in handlePublish to include both uploaded and selected files

    // Amazon validation for brand content and ASINs
    if (selectedPlatforms.includes('amazon')) {
      if (!amazonBrandContent.brandName.trim()) {
        allErrors.push('Amazon posts require a brand name');
      }

      if (amazonProductASINs.length === 0) {
        allErrors.push('Amazon posts require at least one product ASIN');
      }
    }

    // TikTok validation for video content and advertiser ID
    if (selectedPlatforms.includes('tiktok')) {
      if (!tiktokContent.advertiserId.trim()) {
        allErrors.push('TikTok posts require an advertiser ID');
      }

      if (!selectedTikTokVideo) {
        allErrors.push('TikTok posts require a video file');
      } else {
        // Validate video if selected
        const videoErrors = validateTikTokVideo(selectedTikTokVideo);
        allErrors.push(...videoErrors);
      }
    }

    return { errors: allErrors };
  }, [
    postContent,
    selectedPlatforms,
    validateContent,
    amazonBrandContent.brandName,
    amazonProductASINs.length,
    tiktokContent.advertiserId,
    selectedTikTokVideo,
  ]);

  // Update validation errors when validation result changes
  useEffect(() => {
    setValidationErrors(validationResult.errors);
  }, [validationResult]);

  const handleAddHashtag = useCallback(() => {
    if (currentHashtag.trim() && !hashtags.includes(currentHashtag.trim())) {
      setHashtags([...hashtags, currentHashtag.trim()]);
      setCurrentHashtag('');
    }
  }, [currentHashtag, hashtags]);

  const handleRemoveHashtag = useCallback(
    (tag: string) => {
      setHashtags(hashtags.filter((h) => h !== tag));
    },
    [hashtags]
  );

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleAddHashtag();
      }
    },
    [handleAddHashtag]
  );

  const handleMediaSelect = useCallback(async (files: File[]) => {
    // This just handles file selection from MediaUploader
    // Store files for upload when user clicks publish
    setMediaFiles(files);
  }, []);

  const handleMediaUpload = useCallback(
    async (files: File[]) => {
      if (selectedPlatforms.length === 0) {
        setPublishError('Please select platforms first');
        return [];
      }

      try {
        // uploadMedia returns the uploaded media and updates uploadedMedia state
        const uploadedFiles = await uploadMedia(files, selectedPlatforms);
        return uploadedFiles;
      } catch (error) {
        console.error('Media upload failed:', error);
        setPublishError('Media upload failed. Please try again.');
        return [];
      }
    },
    [selectedPlatforms, uploadMedia, setPublishError]
  );

  const handleAmazonBrandContentChange = useCallback(
    (content: {
      brandName: string;
      headline?: string;
      targetAudience?: string;
      productHighlights?: string[];
    }) => {
      setAmazonBrandContent((prev) => ({
        ...prev,
        brandName: content.brandName,
        headline: content.headline,
        targetAudience: content.targetAudience,
        productHighlights: content.productHighlights,
      }));
    },
    []
  );

  const handleRemoveMedia = useCallback(
    async (mediaId: string) => {
      try {
        await removeMedia(mediaId);
        // Update local files list by removing the file
        // In a real implementation, you'd match by ID
        setMediaFiles([]);
      } catch (error) {
        console.error('Media removal failed:', error);
        setPublishError('Failed to remove media. Please try again.');
      }
    },
    [removeMedia, setPublishError]
  );

  const handlePublish = async (isDraft = false) => {
    // Clear previous errors and success messages
    setPublishError('');
    setPublishSuccess('');

    if (
      !postContent.trim() &&
      uploadedMedia.length === 0 &&
      mediaFiles.length === 0
    ) {
      setPublishError('Please add content or media to your post');
      return;
    }

    if (selectedPlatforms.length === 0) {
      setPublishError('Please select at least one platform');
      return;
    }

    // Upload selected media files first if any
    let currentUploadedMedia = uploadedMedia;

    if (mediaFiles.length > 0) {
      console.log('🔍 DEBUG: Starting media upload process');
      console.log('🔍 DEBUG: mediaFiles.length:', mediaFiles.length);
      console.log(
        '🔍 DEBUG: Current uploadedMedia.length:',
        uploadedMedia.length
      );

      try {
        const newlyUploadedMedia = await handleMediaUpload(mediaFiles);
        console.log('🔍 DEBUG: Newly uploaded media:', newlyUploadedMedia);

        // Use the combined media (existing + newly uploaded)
        currentUploadedMedia = [...uploadedMedia, ...newlyUploadedMedia];
        console.log(
          '🔍 DEBUG: After handleMediaUpload, total media count:',
          currentUploadedMedia.length
        );

        // Clear the selected files after upload
        setMediaFiles([]);
      } catch (error) {
        console.error('Failed to upload media files:', error);
        setPublishError('Failed to upload media files. Please try again.');
        return;
      }
    }

    console.log(
      '🔍 DEBUG: About to create post with media count:',
      currentUploadedMedia.length
    );
    console.log('🔍 DEBUG: currentUploadedMedia data:', currentUploadedMedia);

    // Ensure Instagram posts have media (check after all media processing)
    if (
      selectedPlatforms.includes('instagram') &&
      currentUploadedMedia.length === 0
    ) {
      setPublishError(
        'Instagram posts require at least one media file (image/video)'
      );
      return;
    }

    if (validationErrors.length > 0) {
      setPublishError(
        `Please fix the following errors: ${validationErrors.join(', ')}`
      );
      return;
    }

    try {
      const mediaForPost = currentUploadedMedia.map((m) => ({
        id: m.id, // Include the database ID
        type: m.type,
        size: m.size, // Use actual size from upload
        filename: m.filename,
        dimensions: m.dimensions,
        duration: m.duration,
      }));

      console.log('🔍 DEBUG: mediaForPost:', mediaForPost);

      const postData = {
        platforms: selectedPlatforms,
        content: {
          content: postContent,
          hashtags,
          mentions: extractMentions(postContent),
        },
        media: mediaForPost,
        schedule:
          isScheduled && scheduledDate
            ? {
                scheduledAt: scheduledDate,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              }
            : undefined,
        isDraft,
        // Amazon-specific content in separate field as per schema
        ...(selectedPlatforms.includes('amazon') && {
          amazon: {
            brandEntityId: amazonBrandContent.brandName, // Using brandName as entity ID for now
            marketplaceId: 'ATVPDKIKX0DER',
            productAsins: amazonProductASINs,
            brandStoryTitle: amazonBrandContent.headline || 'Our Brand Story',
            brandStoryContent:
              postContent.substring(0, 300) || 'Discover our amazing products.',
            callToAction: 'SHOP_NOW' as const,
            targetAudience: {
              interests: amazonBrandContent.productHighlights || [],
              demographics: {
                ageRange: undefined,
                gender: 'ALL' as const,
              },
            },
          },
        }),
        // TikTok-specific content in separate field as per schema
        ...(selectedPlatforms.includes('tiktok') && {
          tiktok: {
            advertiserId: tiktokContent.advertiserId,
            videoProperties: {
              title:
                tiktokContent.videoProperties?.title ||
                postContent.substring(0, 100),
              description:
                tiktokContent.videoProperties?.description || postContent,
              tags: tiktokContent.videoProperties?.tags || hashtags,
              category:
                tiktokContent.videoProperties?.category ||
                ('ENTERTAINMENT' as const),
              language: tiktokContent.videoProperties?.language || 'en',
              thumbnailTime: tiktokContent.videoProperties?.thumbnailTime,
            },
            privacy: tiktokContent.privacy || 'PUBLIC',
            allowComments: tiktokContent.allowComments ?? true,
            allowDuet: tiktokContent.allowDuet ?? true,
            allowStitch: tiktokContent.allowStitch ?? true,
            brandedContent: tiktokContent.brandedContent ?? false,
            promotionalContent: tiktokContent.promotionalContent ?? false,
          },
        }),
      };

      await createPost(postData);

      // Reset form on success
      setPostContent('');
      setSelectedPlatforms([]);
      setMediaFiles([]);
      setHashtags([]);
      setIsScheduled(false);
      setScheduledDate(null);
      setAmazonBrandContent({
        brandName: '',
        headline: undefined,
        targetAudience: 'general',
        productHighlights: [],
      });
      setAmazonProductASINs([]);
      setTikTokContent({
        advertiserId: '',
        videoProperties: {
          title: '',
          description: '',
          tags: [],
          category: undefined,
          language: 'en',
          thumbnailTime: undefined,
        },
        privacy: 'PUBLIC',
        allowComments: true,
        allowDuet: true,
        allowStitch: true,
        brandedContent: false,
        promotionalContent: false,
      });
      setSelectedTikTokVideo(null);

      // Show success message
      setPublishSuccess(
        isDraft ? 'Draft saved successfully!' : 'Post published successfully!'
      );
    } catch (error) {
      console.error('Publishing failed:', error);
      setPublishError(
        error instanceof Error
          ? `Publishing failed: ${error.message}`
          : 'Publishing failed. Please try again.'
      );
    }
  };

  // Show premium gate for non-premium users
  if (!isPremium && !isLoading) {
    return <PremiumGate />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="h-8 w-8 text-purple-600" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Social Media Publisher
            </h1>
          </div>
          <p className="text-gray-600 text-lg">
            Create and schedule engaging content across all your social
            platforms
          </p>
          <Badge
            variant="outline"
            className="mt-2 bg-gradient-to-r from-purple-100 to-blue-100 border-purple-300"
          >
            <Zap className="h-3 w-3 mr-1" />
            Premium Feature
          </Badge>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Posting Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Platform Selection */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <PlatformSelector
                selectedPlatforms={selectedPlatforms}
                onPlatformsChange={setSelectedPlatforms}
              />
            </motion.div>
            {/* Content Input */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <Send className="h-5 w-5 text-blue-600" />
                    Compose Your Post
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    placeholder={
                      noPlatformsSelected
                        ? 'Please select at least one platform to start composing...'
                        : isPublishing
                          ? 'Publishing in progress...'
                          : "What's on your mind? Share your thoughts with the world..."
                    }
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    disabled={shouldDisableContent}
                    className={`min-h-[120px] resize-none border-gray-200 focus:border-purple-400 focus:ring-purple-400 ${
                      shouldDisableContent
                        ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                        : ''
                    }`}
                  />

                  {/* Validation Errors */}
                  {validationErrors.length > 0 && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <ul className="list-disc list-inside space-y-1">
                          {validationErrors.map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Character Count & Platform Validation */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4">
                      <span
                        className={`${postContent.length > 2200 ? 'text-red-500' : 'text-gray-500'}`}
                      >
                        {postContent.length}/2200 characters
                      </span>
                      {selectedPlatforms.length > 0 &&
                        validationErrors.length === 0 &&
                        postContent.length > 0 && (
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="h-4 w-4" />
                            <span>Valid for selected platforms</span>
                          </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                      {isUploading && (
                        <Badge variant="outline" className="text-blue-600">
                          <Image className="h-3 w-3 mr-1 animate-pulse" />
                          Uploading...
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Media Upload */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <MediaUploader
                files={mediaFiles}
                onFilesChange={handleMediaSelect}
                acceptedTypes={['image/*', 'video/*']}
                maxFiles={selectedPlatforms.includes('twitter') ? 4 : 10}
                maxSize={50}
                disabled={shouldDisableContent}
                onError={setPublishError}
                disabledMessage={
                  isPublishing
                    ? 'Cannot upload files while publishing...'
                    : noPlatformsSelected
                      ? 'Please select at least one platform to enable file upload'
                      : undefined
                }
              />

              {/* Display uploaded media */}
              {uploadedMedia.length > 0 && (
                <Card className="mt-4 bg-green-50 border-green-200">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="font-medium text-green-800">
                        {uploadedMedia.length} media file(s) uploaded
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {uploadedMedia.map((media) => (
                        <div key={media.id} className="relative group">
                          <img
                            src={media.url || '/placeholder.jpg'}
                            alt={media.filename}
                            className="w-full h-20 object-cover rounded-lg"
                          />
                          <Button
                            variant="destructive"
                            size="sm"
                            className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleRemoveMedia(media.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </motion.div>

            {/* Hashtags */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-green-600" />
                    Hashtags & Topics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add hashtag (without #)"
                      value={currentHashtag}
                      onChange={(e) => setCurrentHashtag(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleAddHashtag}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  {hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {hashtags.map((tag, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="bg-blue-100 text-blue-800 hover:bg-blue-200 cursor-pointer"
                          onClick={() => handleRemoveHashtag(tag)}
                        >
                          #{tag}
                          <X className="h-3 w-3 ml-1" />
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Amazon Content Editor */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              <AmazonContentEditor
                selectedPlatforms={selectedPlatforms}
                brandContent={amazonBrandContent}
                productASINs={amazonProductASINs}
                onBrandContentChange={handleAmazonBrandContentChange}
                onProductASINsChange={setAmazonProductASINs}
              />
            </motion.div>

            {/* TikTok Content Editor */}
            {selectedPlatforms.includes('tiktok') && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
              >
                <TikTokContentEditor
                  tiktokContent={tiktokContent}
                  selectedVideo={selectedTikTokVideo || undefined}
                  onTikTokContentChange={setTikTokContent}
                  onVideoChange={setSelectedTikTokVideo}
                />
              </motion.div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Post Preview */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <PostPreview
                content={postContent}
                hashtags={hashtags}
                mediaFiles={mediaFiles}
                platforms={selectedPlatforms}
                amazonContent={{
                  brandName: amazonBrandContent.brandName,
                  headline: amazonBrandContent.headline,
                  productASINs: amazonProductASINs,
                }}
                tiktokContent={tiktokContent}
                selectedTikTokVideo={selectedTikTokVideo}
              />
            </motion.div>

            {/* Scheduling */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-orange-600" />
                    Publishing Options
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">Schedule Post</p>
                      <p className="text-sm text-gray-500">
                        Publish at optimal times
                      </p>
                    </div>
                    <Switch
                      checked={isScheduled}
                      onCheckedChange={setIsScheduled}
                    />
                  </div>

                  {isScheduled && (
                    <PostScheduler
                      selectedDate={scheduledDate}
                      onDateChange={setScheduledDate}
                      disabled={shouldDisableContent}
                    />
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* AI Enhancement */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <AIEnhancementPanel
                content={postContent}
                onContentChange={setPostContent}
                onHashtagsChange={setHashtags}
                selectedPlatforms={selectedPlatforms}
                currentHashtags={hashtags}
                disabled={shouldDisableContent}
              />
            </motion.div>

            {/* Publish Buttons */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="space-y-3"
            >
              <Button
                size="lg"
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg"
                disabled={
                  shouldDisableContent ||
                  (!postContent.trim() &&
                    uploadedMedia.length === 0 &&
                    mediaFiles.length === 0) ||
                  selectedPlatforms.length === 0 ||
                  isPosting ||
                  validationErrors.length > 0
                }
                onClick={() => handlePublish(false)}
              >
                {isPosting ? (
                  <>
                    <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5 mr-2" />
                    {isScheduled ? 'Schedule Post' : 'Publish Now'}
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                size="lg"
                className="w-full border-gray-300 hover:bg-gray-50"
                disabled={
                  shouldDisableContent ||
                  (!postContent.trim() &&
                    uploadedMedia.length === 0 &&
                    mediaFiles.length === 0) ||
                  isPosting
                }
                onClick={() => handlePublish(true)}
              >
                Save as Draft
              </Button>

              {/* Error Message Display */}
              {publishError && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-red-50 border border-red-200 rounded-lg"
                >
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="font-medium text-red-800 mb-1">
                        Publishing Failed
                      </h4>
                      <p className="text-red-700 text-sm">{publishError}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 text-red-600 hover:text-red-700 hover:bg-red-100 p-0 h-auto"
                        onClick={() => setPublishError('')}
                      >
                        Dismiss
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Success Message Display */}
              {publishSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-green-50 border border-green-200 rounded-lg"
                >
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="font-medium text-green-800 mb-1">
                        Success!
                      </h4>
                      <p className="text-green-700 text-sm">{publishSuccess}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 text-green-600 hover:text-green-700 hover:bg-green-100 p-0 h-auto"
                        onClick={() => setPublishSuccess('')}
                      >
                        Dismiss
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
