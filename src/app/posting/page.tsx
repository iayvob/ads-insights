'use client';

import { useState, useEffect } from 'react';
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
import { usePosting } from '@/hooks/use-posting';
import { SocialPlatform } from '@/validations/posting-types';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSession } from '@/hooks/session-context';
import { SubscriptionPlan } from '@prisma/client';

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

  // Validate content in real-time
  useEffect(() => {
    if (postContent && selectedPlatforms.length > 0) {
      const validation = validateContent(postContent, selectedPlatforms);
      setValidationErrors(validation.errors);

      // Add Instagram validation for media requirement
      if (
        selectedPlatforms.includes('instagram') &&
        uploadedMedia.length === 0
      ) {
        setValidationErrors((prev) => [
          ...prev,
          'Instagram requires at least one media file (image/video)',
        ]);
      }
    } else {
      setValidationErrors([]);
    }
  }, [postContent, selectedPlatforms, validateContent, uploadedMedia.length]);

  const handleAddHashtag = () => {
    if (currentHashtag.trim() && !hashtags.includes(currentHashtag.trim())) {
      setHashtags([...hashtags, currentHashtag.trim()]);
      setCurrentHashtag('');
    }
  };

  const handleRemoveHashtag = (tag: string) => {
    setHashtags(hashtags.filter((h) => h !== tag));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleAddHashtag();
    }
  };

  const handleMediaSelect = async (files: File[]) => {
    // This just handles file selection from MediaUploader
    // Store files for upload when user clicks publish
    setMediaFiles(files);
  };

  const handleMediaUpload = async (files: File[]) => {
    if (selectedPlatforms.length === 0) {
      alert('Please select platforms first');
      return;
    }

    try {
      // uploadMedia already handles uploading and updating uploadedMedia state
      await uploadMedia(files, selectedPlatforms);
    } catch (error) {
      console.error('Media upload failed:', error);
    }
  };

  const handleRemoveMedia = async (mediaId: string) => {
    try {
      await removeMedia(mediaId);
      // Update local files list by removing the file
      // In a real implementation, you'd match by ID
      setMediaFiles([]);
    } catch (error) {
      console.error('Media removal failed:', error);
    }
  };

  const handlePublish = async (isDraft = false) => {
    if (
      !postContent.trim() &&
      uploadedMedia.length === 0 &&
      mediaFiles.length === 0
    ) {
      alert('Please add content or media to your post');
      return;
    }

    if (selectedPlatforms.length === 0) {
      alert('Please select at least one platform');
      return;
    }

    // Upload selected media files first if any
    if (mediaFiles.length > 0) {
      console.log('🔍 DEBUG: Starting media upload process');
      console.log('🔍 DEBUG: mediaFiles.length:', mediaFiles.length);
      console.log(
        '🔍 DEBUG: Current uploadedMedia.length:',
        uploadedMedia.length
      );

      try {
        await handleMediaUpload(mediaFiles);
        console.log(
          '🔍 DEBUG: After handleMediaUpload, uploadedMedia.length:',
          uploadedMedia.length
        );

        // Clear the selected files after upload
        setMediaFiles([]);
      } catch (error) {
        console.error('Failed to upload media files:', error);
        alert('Failed to upload media files');
        return;
      }
    }

    console.log(
      '🔍 DEBUG: About to create post with uploadedMedia.length:',
      uploadedMedia.length
    );
    console.log('🔍 DEBUG: uploadedMedia data:', uploadedMedia);

    // Ensure Instagram posts have media
    if (selectedPlatforms.includes('instagram') && uploadedMedia.length === 0) {
      alert('Instagram posts require at least one media file');
      return;
    }

    if (validationErrors.length > 0) {
      alert('Please fix validation errors before publishing');
      return;
    }

    try {
      const mediaForPost = uploadedMedia.map((m) => ({
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
      };

      await createPost(postData);

      // Reset form on success
      setPostContent('');
      setSelectedPlatforms([]);
      setMediaFiles([]);
      setHashtags([]);
      setIsScheduled(false);
      setScheduledDate(null);
    } catch (error) {
      console.error('Publishing failed:', error);
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
                    placeholder="What's on your mind? Share your thoughts with the world..."
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    className="min-h-[120px] resize-none border-gray-200 focus:border-purple-400 focus:ring-purple-400"
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
                  (!postContent.trim() && uploadedMedia.length === 0) ||
                  selectedPlatforms.length === 0 ||
                  isPosting ||
                  validationErrors.length > 0 ||
                  (selectedPlatforms.includes('instagram') &&
                    uploadedMedia.length === 0)
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
                  (!postContent.trim() && uploadedMedia.length === 0) ||
                  isPosting
                }
                onClick={() => handlePublish(true)}
              >
                Save as Draft
              </Button>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
