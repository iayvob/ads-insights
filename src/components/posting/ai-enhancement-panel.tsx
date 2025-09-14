'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Sparkles,
  Wand2,
  Hash,
  Lightbulb,
  RefreshCw,
  Copy,
  ThumbsUp,
  TrendingUp,
  Zap,
  Bot,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useAIEnhancement } from '@/hooks/use-ai-enhancement';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface AIEnhancementPanelProps {
  content: string;
  onContentChange: (content: string) => void;
  selectedPlatforms: string[];
  onHashtagsChange: (hashtags: string[]) => void;
  currentHashtags?: string[];
  disabled?: boolean;
}

export function AIEnhancementPanel({
  content,
  onContentChange,
  selectedPlatforms,
  onHashtagsChange,
  currentHashtags = [],
  disabled = false,
}: AIEnhancementPanelProps) {
  const {
    isEnhancing,
    isGeneratingHashtags,
    isGeneratingContent,
    enhancePost,
    generateHashtags,
    generateContent,
    lastEnhancement,
  } = useAIEnhancement();

  const [isOpen, setIsOpen] = useState(false);
  const [contentPrompt, setContentPrompt] = useState('');
  const [selectedTone, setSelectedTone] = useState('casual');
  const [includeEmojis, setIncludeEmojis] = useState(true);
  const [includeHashtags, setIncludeHashtags] = useState(true);
  const [suggestedHashtags, setSuggestedHashtags] = useState<any[]>([]);

  const handleEnhanceContent = async () => {
    if (!content.trim()) return;

    const result = await enhancePost(content, selectedPlatforms, {
      tone: selectedTone as any,
      includeEmojis,
      includeHashtags,
      maxHashtags: 8,
    });

    if (result) {
      onContentChange(result.enhancedContent);
      if (result.suggestedHashtags.length > 0) {
        setSuggestedHashtags(
          result.suggestedHashtags.map((tag) => ({
            hashtag: tag,
            trending: true,
          }))
        );
      }
    }
  };

  const handleGenerateHashtags = async () => {
    if (!content.trim()) return;

    const hashtags = await generateHashtags(content, selectedPlatforms);
    setSuggestedHashtags(hashtags);
  };

  const handleGenerateContent = async () => {
    if (!contentPrompt.trim()) return;

    const generated = await generateContent(
      contentPrompt,
      selectedPlatforms,
      selectedTone
    );
    if (generated) {
      onContentChange(generated);
      setContentPrompt('');
    }
  };

  const handleAddHashtag = (hashtag: string) => {
    const cleanHashtag = hashtag.startsWith('#') ? hashtag.slice(1) : hashtag;
    const newHashtags = [...currentHashtags, cleanHashtag].filter(
      (tag, index, arr) => arr.indexOf(tag) === index
    );
    onHashtagsChange(newHashtags);
  };

  const handleCopyContent = () => {
    navigator.clipboard.writeText(content);
  };

  return (
    <Card className="shadow-lg border-0 bg-gradient-to-br from-purple-50 to-blue-50 backdrop-blur-sm">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-4 cursor-pointer hover:bg-white/50 transition-colors">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  AI Enhancement Suite
                </span>
                <Badge
                  variant="outline"
                  className="bg-purple-100 text-purple-700 border-purple-300"
                >
                  <Bot className="h-3 w-3 mr-1" />
                  Premium
                </Badge>
              </div>
              {isOpen ? (
                <ChevronUp className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5" />
              )}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-6">
            {/* Content Generation */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-yellow-600" />
                <h4 className="font-medium">Generate Content from Idea</h4>
              </div>
              <div className="space-y-3">
                <Textarea
                  placeholder="Describe what you want to post about... (e.g., 'Announcing our new product launch')"
                  value={contentPrompt}
                  onChange={(e) => setContentPrompt(e.target.value)}
                  disabled={disabled}
                  className="min-h-[80px] border-purple-200 focus:border-purple-400"
                />
                <div className="flex items-center gap-3">
                  <Button
                    onClick={handleGenerateContent}
                    disabled={
                      disabled ||
                      isGeneratingContent ||
                      !contentPrompt.trim() ||
                      selectedPlatforms.length === 0
                    }
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  >
                    {isGeneratingContent ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-4 w-4 mr-2" />
                        Generate Content
                      </>
                    )}
                  </Button>
                  <Select value={selectedTone} onValueChange={setSelectedTone}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="casual">Casual</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="friendly">Friendly</SelectItem>
                      <SelectItem value="exciting">Exciting</SelectItem>
                      <SelectItem value="informative">Informative</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </motion.div>

            {/* Content Enhancement */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="space-y-3 border-t pt-4"
            >
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-orange-600" />
                <h4 className="font-medium">Enhance Existing Content</h4>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="emojis"
                    checked={includeEmojis}
                    onCheckedChange={setIncludeEmojis}
                  />
                  <Label htmlFor="emojis" className="text-sm">
                    Add Emojis
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="hashtags"
                    checked={includeHashtags}
                    onCheckedChange={setIncludeHashtags}
                  />
                  <Label htmlFor="hashtags" className="text-sm">
                    Suggest Hashtags
                  </Label>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  onClick={handleEnhanceContent}
                  disabled={
                    disabled ||
                    isEnhancing ||
                    !content.trim() ||
                    selectedPlatforms.length === 0
                  }
                  variant="outline"
                  className="border-purple-300 text-purple-700 hover:bg-purple-50"
                >
                  {isEnhancing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Enhancing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Enhance Content
                    </>
                  )}
                </Button>

                <Button
                  onClick={handleCopyContent}
                  disabled={disabled || !content.trim()}
                  variant="ghost"
                  size="sm"
                  className="text-gray-600 hover:text-gray-800"
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </Button>
              </div>
            </motion.div>

            {/* Hashtag Suggestions */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-3 border-t pt-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-blue-600" />
                  <h4 className="font-medium">Smart Hashtags</h4>
                </div>
                <Button
                  onClick={handleGenerateHashtags}
                  disabled={
                    disabled ||
                    isGeneratingHashtags ||
                    !content.trim() ||
                    selectedPlatforms.length === 0
                  }
                  size="sm"
                  variant="outline"
                  className="border-blue-300 text-blue-700 hover:bg-blue-50"
                >
                  {isGeneratingHashtags ? (
                    <>
                      <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <TrendingUp className="h-3 w-3 mr-1" />
                      Get Hashtags
                    </>
                  )}
                </Button>
              </div>

              {/* Hashtag Grid */}
              <AnimatePresence>
                {suggestedHashtags.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="grid grid-cols-2 gap-2"
                  >
                    {suggestedHashtags.slice(0, 8).map((item, index) => (
                      <motion.div
                        key={item.hashtag || index}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Button
                          onClick={() => handleAddHashtag(item.hashtag || item)}
                          disabled={disabled}
                          variant="outline"
                          size="sm"
                          className="w-full justify-start text-left h-auto py-2 px-3 border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="text-sm font-mono text-blue-600">
                              {typeof item === 'string' ? item : item.hashtag}
                            </span>
                            {typeof item === 'object' && item.trending && (
                              <Badge
                                variant="secondary"
                                className="ml-2 text-xs bg-red-100 text-red-700"
                              >
                                <TrendingUp className="h-2 w-2 mr-1" />
                                Hot
                              </Badge>
                            )}
                          </div>
                        </Button>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Enhancement Results */}
            <AnimatePresence>
              {lastEnhancement && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-3 border-t pt-4"
                >
                  <div className="flex items-center gap-2">
                    <ThumbsUp className="h-4 w-4 text-green-600" />
                    <h4 className="font-medium text-green-800">
                      Enhancement Applied
                    </h4>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {lastEnhancement.improvements.addedEmojis && (
                      <Badge variant="outline" className="justify-start">
                        ✨ Emojis added
                      </Badge>
                    )}
                    {lastEnhancement.improvements.lengthOptimized && (
                      <Badge variant="outline" className="justify-start">
                        📏 Length optimized
                      </Badge>
                    )}
                    {lastEnhancement.improvements.toneAdjustment && (
                      <Badge
                        variant="outline"
                        className="justify-start col-span-2"
                      >
                        🎯 {lastEnhancement.improvements.toneAdjustment}
                      </Badge>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
