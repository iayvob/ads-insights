'use client';

import { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Upload,
  Image,
  Video,
  File,
  X,
  Eye,
  Download,
  RotateCcw,
  Crop,
  Sparkles,
} from 'lucide-react';

interface MediaFile {
  file: File;
  preview: string;
  type: 'image' | 'video' | 'other';
  id: string;
}

interface MediaUploaderProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  maxFiles?: number;
  maxSize?: number; // in MB
  acceptedTypes?: string[];
}

export function MediaUploader({
  files,
  onFilesChange,
  maxFiles = 10,
  maxSize = 50,
  acceptedTypes = ['image/*', 'video/*'],
}: MediaUploaderProps) {
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);

  const createMediaFile = (file: File): MediaFile => {
    const preview = URL.createObjectURL(file);
    const type = file.type.startsWith('image/')
      ? 'image'
      : file.type.startsWith('video/')
        ? 'video'
        : 'other';

    return {
      file,
      preview,
      type,
      id: Math.random().toString(36).substr(2, 9),
    };
  };

  const handleFileSelect = useCallback(
    (selectedFiles: FileList | null) => {
      if (!selectedFiles) return;

      const newFiles = Array.from(selectedFiles);
      const totalFiles = files.length + newFiles.length;

      if (totalFiles > maxFiles) {
        alert(`Maximum ${maxFiles} files allowed`);
        return;
      }

      // Validate file sizes
      const oversizedFiles = newFiles.filter(
        (file) => file.size > maxSize * 1024 * 1024
      );
      if (oversizedFiles.length > 0) {
        alert(`Files must be smaller than ${maxSize}MB`);
        return;
      }

      // Validate file types
      const invalidFiles = newFiles.filter(
        (file) =>
          !acceptedTypes.some((type) => {
            if (type.endsWith('*')) {
              return file.type.startsWith(type.replace('*', ''));
            }
            return file.type === type;
          })
      );

      if (invalidFiles.length > 0) {
        alert(
          `Invalid file type. Please upload only ${acceptedTypes.join(', ')}`
        );
        return;
      }

      // Simulate upload progress
      setIsUploading(true);
      setUploadProgress(0);

      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            setIsUploading(false);

            // Add to media files
            const newMediaFiles = newFiles.map(createMediaFile);
            setMediaFiles((prev) => [...prev, ...newMediaFiles]);

            // Call onFilesChange outside of state update using setTimeout
            setTimeout(() => {
              onFilesChange([...files, ...newFiles]);
            }, 0);

            return 100;
          }
          return prev + 10;
        });
      }, 100);
    },
    [files, maxFiles, maxSize, onFilesChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      handleFileSelect(e.dataTransfer.files);
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const removeFile = (fileId: string) => {
    const mediaFile = mediaFiles.find((mf) => mf.id === fileId);
    if (mediaFile) {
      URL.revokeObjectURL(mediaFile.preview);
      setMediaFiles((prev) => prev.filter((mf) => mf.id !== fileId));

      // Call onFilesChange outside of render using setTimeout
      setTimeout(() => {
        onFilesChange(files.filter((f) => f !== mediaFile.file));
      }, 0);
    }
  };

  const getFileIcon = (type: MediaFile['type']) => {
    switch (type) {
      case 'image':
        return <Image className="h-4 w-4" />;
      case 'video':
        return <Video className="h-4 w-4" />;
      default:
        return <File className="h-4 w-4" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5 text-blue-600" />
          Media Upload
          {mediaFiles.length > 0 && (
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              {mediaFiles.length}/{maxFiles}
            </Badge>
          )}
        </CardTitle>
        <p className="text-sm text-gray-600">
          Upload images and videos for your post (max {maxSize}MB each)
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Area */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
            relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200
            ${
              isDragOver
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
            }
            ${mediaFiles.length >= maxFiles ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}
          `}
        >
          <input
            type="file"
            multiple
            accept={acceptedTypes.join(',')}
            onChange={(e) => handleFileSelect(e.target.files)}
            className="absolute inset-0 opacity-0 cursor-pointer"
            disabled={mediaFiles.length >= maxFiles}
            aria-label="Upload media files"
            title="Upload media files"
          />

          <motion.div
            animate={isDragOver ? { scale: 1.05 } : { scale: 1 }}
            className="space-y-3"
          >
            <div className="flex justify-center">
              <div className="p-3 bg-blue-100 rounded-full">
                <Upload className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {isDragOver ? 'Drop files here' : 'Upload media files'}
              </h3>
              <p className="text-sm text-gray-500">
                Drag and drop or click to browse
              </p>
            </div>
            <div className="flex justify-center gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <Image className="h-3 w-3" />
                Images
              </span>
              <span className="flex items-center gap-1">
                <Video className="h-3 w-3" />
                Videos
              </span>
            </div>
          </motion.div>
        </div>

        {/* Upload Progress */}
        {isUploading && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-2"
          >
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Uploading files...</span>
              <span className="text-blue-600">{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
          </motion.div>
        )}

        {/* File List */}
        <AnimatePresence>
          {mediaFiles.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3"
            >
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Media Preview
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {mediaFiles.map((mediaFile, index) => (
                  <motion.div
                    key={mediaFile.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ delay: index * 0.1 }}
                    className="relative group bg-gray-50 rounded-lg overflow-hidden"
                  >
                    {/* Media Preview */}
                    <div className="aspect-square bg-gray-100">
                      {mediaFile.type === 'image' ? (
                        <img
                          src={mediaFile.preview}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : mediaFile.type === 'video' ? (
                        <video
                          src={mediaFile.preview}
                          className="w-full h-full object-cover"
                          muted
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <File className="h-12 w-12 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* File Info */}
                    <div className="p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        {getFileIcon(mediaFile.type)}
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {mediaFile.file.name}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatFileSize(mediaFile.file.size)}
                      </div>
                    </div>

                    {/* Actions Overlay */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
                      {mediaFile.type === 'image' && (
                        <>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-8 w-8 p-0"
                          >
                            <Crop className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-8 w-8 p-0"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-8 w-8 p-0"
                          >
                            <Sparkles className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-8 w-8 p-0"
                        onClick={() => removeFile(mediaFile.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* File Limit Info */}
        {mediaFiles.length > 0 && (
          <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center justify-between">
              <span>
                {mediaFiles.length} of {maxFiles} files uploaded
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  mediaFiles.forEach((mf) => URL.revokeObjectURL(mf.preview));
                  setMediaFiles([]);
                  onFilesChange([]);
                }}
                className="h-6 px-2 text-xs text-red-600 hover:text-red-700"
              >
                Clear All
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
