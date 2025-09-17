'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertCircle,
  Video,
  Upload,
  Check,
  X,
  Info,
  Play,
  Pause,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import TikTokMediaUploadService, {
  TikTokVideoValidationResult,
} from '@/services/tiktok-media-upload';

interface TikTokContentEditorProps {
  // TikTok content data
  tiktokContent: {
    advertiserId?: string;
    videoProperties?: {
      title?: string;
      description?: string;
      tags?: string[];
      category?: string;
      language?: string;
      thumbnailTime?: number;
    };
    privacy?: 'PUBLIC' | 'PRIVATE' | 'FOLLOWERS_ONLY';
    allowComments?: boolean;
    allowDuet?: boolean;
    allowStitch?: boolean;
    brandedContent?: boolean;
    promotionalContent?: boolean;
    category?: string;
  };
  onTikTokContentChange: (content: any) => void;

  // Media handling
  selectedVideo?: File;
  onVideoChange?: (video: File | null) => void;

  // Validation
  validationErrors?: string[];
  disabled?: boolean;
  className?: string;
}

const TIKTOK_CATEGORIES = [
  'EDUCATION',
  'ENTERTAINMENT',
  'COMEDY',
  'MUSIC',
  'DANCE',
  'SPORTS',
  'FOOD',
  'BEAUTY',
  'FASHION',
  'LIFESTYLE',
  'TECHNOLOGY',
  'BUSINESS',
  'GAMING',
  'PETS',
  'DIY',
  'TRAVEL',
] as const;

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'it', label: 'Italian' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'ru', label: 'Russian' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
  { value: 'zh', label: 'Chinese' },
];

export function TikTokContentEditor({
  tiktokContent,
  onTikTokContentChange,
  selectedVideo,
  onVideoChange,
  validationErrors = [],
  disabled = false,
  className,
}: TikTokContentEditorProps) {
  const [currentTag, setCurrentTag] = useState('');
  const [videoValidation, setVideoValidation] =
    useState<TikTokVideoValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  // Video validation effect
  useEffect(() => {
    if (selectedVideo) {
      validateVideo(selectedVideo);
      createVideoPreview(selectedVideo);
    } else {
      setVideoValidation(null);
      setVideoPreview(null);
    }

    return () => {
      if (videoPreview) {
        URL.revokeObjectURL(videoPreview);
      }
    };
  }, [selectedVideo]);

  const validateVideo = async (file: File) => {
    setIsValidating(true);
    try {
      const result = await TikTokMediaUploadService.validateVideoConstraints(
        file,
        true
      );
      setVideoValidation(result);
    } catch (error) {
      console.error('Video validation failed:', error);
      setVideoValidation({
        isValid: false,
        errors: ['Failed to validate video'],
        warnings: [],
      });
    } finally {
      setIsValidating(false);
    }
  };

  const createVideoPreview = (file: File) => {
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
    }
    const url = URL.createObjectURL(file);
    setVideoPreview(url);
  };

  const handleContentChange = (field: string, value: any) => {
    onTikTokContentChange({
      ...tiktokContent,
      [field]: value,
    });
  };

  const handleVideoPropertiesChange = (field: string, value: any) => {
    const videoProperties = {
      ...tiktokContent.videoProperties,
      [field]: value,
    };
    handleContentChange('videoProperties', videoProperties);
  };

  const handleAddTag = () => {
    if (currentTag.trim() && currentTag.length <= 20) {
      const tags = tiktokContent.videoProperties?.tags || [];
      if (tags.length < 5 && !tags.includes(currentTag.trim())) {
        handleVideoPropertiesChange('tags', [...tags, currentTag.trim()]);
        setCurrentTag('');
      }
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const tags = tiktokContent.videoProperties?.tags || [];
    handleVideoPropertiesChange(
      'tags',
      tags.filter((tag) => tag !== tagToRemove)
    );
  };

  const handleVideoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && onVideoChange) {
      onVideoChange(file);
    }
  };

  const toggleVideoPlay = () => {
    const videoElement = document.getElementById(
      'tiktok-video-preview'
    ) as HTMLVideoElement;
    if (videoElement) {
      if (isPlaying) {
        videoElement.pause();
      } else {
        videoElement.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    const videoElement = document.getElementById(
      'tiktok-video-preview'
    ) as HTMLVideoElement;
    if (videoElement) {
      videoElement.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Video Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-pink-600" />
            Video Upload
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!selectedVideo ? (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  Upload your TikTok video (MP4, MOV, WEBM)
                </p>
                <p className="text-xs text-gray-500">
                  Max 500MB • 3 seconds to 3 minutes • 9:16 aspect ratio
                  recommended
                </p>
              </div>
              <input
                type="file"
                accept="video/mp4,video/quicktime,video/webm"
                onChange={handleVideoUpload}
                disabled={disabled}
                className="hidden"
                id="tiktok-video-upload"
                aria-label="Upload TikTok video file"
              />
              <Label
                htmlFor="tiktok-video-upload"
                className="inline-flex items-center px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 cursor-pointer mt-4"
              >
                <Upload className="h-4 w-4 mr-2" />
                Choose Video
              </Label>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Video Preview */}
              <div className="relative">
                <div className="bg-black rounded-lg overflow-hidden">
                  {videoPreview && (
                    <div className="relative">
                      <video
                        id="tiktok-video-preview"
                        src={videoPreview}
                        className="w-full max-h-96 object-contain"
                        muted={isMuted}
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                      />
                      <div className="absolute bottom-4 left-4 flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={toggleVideoPlay}
                          className="bg-black/50 hover:bg-black/70 text-white"
                        >
                          {isPlaying ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={toggleMute}
                          className="bg-black/50 hover:bg-black/70 text-white"
                        >
                          {isMuted ? (
                            <VolumeX className="h-4 w-4" />
                          ) : (
                            <Volume2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Replace Video Button */}
                <div className="mt-2 flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    {selectedVideo.name} (
                    {(selectedVideo.size / (1024 * 1024)).toFixed(1)} MB)
                  </div>
                  <input
                    type="file"
                    accept="video/mp4,video/quicktime,video/webm"
                    onChange={handleVideoUpload}
                    disabled={disabled}
                    className="hidden"
                    id="tiktok-video-replace"
                    aria-label="Replace TikTok video file"
                  />
                  <Label
                    htmlFor="tiktok-video-replace"
                    className="inline-flex items-center px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded cursor-pointer"
                  >
                    Replace Video
                  </Label>
                </div>
              </div>

              {/* Video Validation Results */}
              {isValidating ? (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <div className="animate-spin h-4 w-4 border-2 border-pink-600 border-t-transparent rounded-full"></div>
                  Validating video...
                </div>
              ) : videoValidation ? (
                <div className="space-y-2">
                  {videoValidation.isValid ? (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <Check className="h-4 w-4" />
                      Video meets TikTok requirements
                    </div>
                  ) : (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="space-y-1">
                          {videoValidation.errors.map((error, index) => (
                            <div key={index} className="text-red-600">
                              • {error}
                            </div>
                          ))}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  {videoValidation.warnings.length > 0 && (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        <div className="space-y-1">
                          {videoValidation.warnings.map((warning, index) => (
                            <div key={index} className="text-amber-600">
                              • {warning}
                            </div>
                          ))}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      {/* TikTok Content Settings */}
      <Card>
        <CardHeader>
          <CardTitle>TikTok Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Advertiser ID */}
          <div className="space-y-2">
            <Label htmlFor="advertiser-id">Advertiser ID *</Label>
            <Input
              id="advertiser-id"
              placeholder="Enter your TikTok Business advertiser ID"
              value={tiktokContent.advertiserId || ''}
              onChange={(e) =>
                handleContentChange('advertiserId', e.target.value)
              }
              disabled={disabled}
              className={
                validationErrors.some((e) => e.includes('advertiser'))
                  ? 'border-red-300'
                  : ''
              }
            />
            <p className="text-xs text-gray-500">
              Required for TikTok Business API. Find this in your TikTok Ads
              Manager.
            </p>
          </div>

          {/* Video Properties */}
          <div className="space-y-4">
            <h4 className="font-medium">Video Properties</h4>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="video-title">Video Title</Label>
              <Input
                id="video-title"
                placeholder="Enter video title (optional)"
                value={tiktokContent.videoProperties?.title || ''}
                onChange={(e) =>
                  handleVideoPropertiesChange('title', e.target.value)
                }
                disabled={disabled}
                maxLength={100}
              />
              <p className="text-xs text-gray-500">
                {(tiktokContent.videoProperties?.title || '').length}/100
                characters
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="video-description">Video Description</Label>
              <Textarea
                id="video-description"
                placeholder="Describe your video content..."
                value={tiktokContent.videoProperties?.description || ''}
                onChange={(e) =>
                  handleVideoPropertiesChange('description', e.target.value)
                }
                disabled={disabled}
                maxLength={2200}
                rows={3}
              />
              <p className="text-xs text-gray-500">
                {(tiktokContent.videoProperties?.description || '').length}/2200
                characters
              </p>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="video-category">Category</Label>
              <Select
                value={tiktokContent.videoProperties?.category || ''}
                onValueChange={(value) =>
                  handleVideoPropertiesChange('category', value)
                }
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select video category" />
                </SelectTrigger>
                <SelectContent>
                  {TIKTOK_CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category.charAt(0) +
                        category.slice(1).toLowerCase().replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Language */}
            <div className="space-y-2">
              <Label htmlFor="video-language">Language</Label>
              <Select
                value={tiktokContent.videoProperties?.language || 'en'}
                onValueChange={(value) =>
                  handleVideoPropertiesChange('language', value)
                }
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGE_OPTIONS.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label>Tags (Max 5)</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a tag (max 20 chars)"
                  value={currentTag}
                  onChange={(e) => setCurrentTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                  disabled={
                    disabled ||
                    (tiktokContent.videoProperties?.tags || []).length >= 5
                  }
                  maxLength={20}
                />
                <Button
                  type="button"
                  onClick={handleAddTag}
                  disabled={
                    !currentTag.trim() ||
                    (tiktokContent.videoProperties?.tags || []).length >= 5
                  }
                  size="sm"
                >
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(tiktokContent.videoProperties?.tags || []).map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    {tag}
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-red-500"
                      onClick={() => handleRemoveTag(tag)}
                    />
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Privacy and Interaction Settings */}
          <div className="space-y-4">
            <h4 className="font-medium">Privacy & Interaction</h4>

            {/* Privacy Setting */}
            <div className="space-y-2">
              <Label>Privacy Setting</Label>
              <Select
                value={tiktokContent.privacy || 'PUBLIC'}
                onValueChange={(value) => handleContentChange('privacy', value)}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PUBLIC">Public</SelectItem>
                  <SelectItem value="PRIVATE">Private</SelectItem>
                  <SelectItem value="FOLLOWERS_ONLY">Followers Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Interaction Toggles */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="allow-comments">Allow Comments</Label>
                <Switch
                  id="allow-comments"
                  checked={tiktokContent.allowComments ?? true}
                  onCheckedChange={(checked) =>
                    handleContentChange('allowComments', checked)
                  }
                  disabled={disabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="allow-duet">Allow Duet</Label>
                <Switch
                  id="allow-duet"
                  checked={tiktokContent.allowDuet ?? true}
                  onCheckedChange={(checked) =>
                    handleContentChange('allowDuet', checked)
                  }
                  disabled={disabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="allow-stitch">Allow Stitch</Label>
                <Switch
                  id="allow-stitch"
                  checked={tiktokContent.allowStitch ?? true}
                  onCheckedChange={(checked) =>
                    handleContentChange('allowStitch', checked)
                  }
                  disabled={disabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="branded-content">Branded Content</Label>
                <Switch
                  id="branded-content"
                  checked={tiktokContent.brandedContent ?? false}
                  onCheckedChange={(checked) =>
                    handleContentChange('brandedContent', checked)
                  }
                  disabled={disabled}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              {validationErrors.map((error, index) => (
                <div key={index}>• {error}</div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

export default TikTokContentEditor;
