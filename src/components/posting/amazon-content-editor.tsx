'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ShoppingBag, Package, Plus, X, Info } from 'lucide-react';
import { SocialPlatform } from '@/validations/posting-types';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AmazonBrandContent {
  brandName: string;
  headline?: string;
  targetAudience?: string;
  productHighlights?: string[];
}

interface AmazonContentEditorProps {
  selectedPlatforms: SocialPlatform[];
  brandContent?: AmazonBrandContent;
  productASINs?: string[];
  onBrandContentChange: (content: AmazonBrandContent) => void;
  onProductASINsChange: (asins: string[]) => void;
}

const TARGET_AUDIENCES = [
  'general',
  'young_adults',
  'families',
  'professionals',
  'seniors',
  'students',
  'tech_enthusiasts',
  'fitness_enthusiasts',
  'home_decor_lovers',
  'outdoor_enthusiasts',
];

export function AmazonContentEditor({
  selectedPlatforms,
  brandContent = {
    brandName: '',
    headline: '',
    targetAudience: 'general',
    productHighlights: [],
  },
  productASINs = [],
  onBrandContentChange,
  onProductASINsChange,
}: AmazonContentEditorProps) {
  const [newASIN, setNewASIN] = useState('');
  const [newHighlight, setNewHighlight] = useState('');
  const [asinError, setAsinError] = useState('');

  const showAmazonFields = selectedPlatforms.includes('amazon');

  const validateASIN = (asin: string): boolean => {
    // Amazon ASIN validation - 10 characters, alphanumeric
    const asinRegex = /^[A-Z0-9]{10}$/;
    return asinRegex.test(asin.toUpperCase());
  };

  const handleAddASIN = () => {
    const trimmedASIN = newASIN.trim().toUpperCase();

    if (!trimmedASIN) {
      setAsinError('Please enter an ASIN');
      return;
    }

    if (!validateASIN(trimmedASIN)) {
      setAsinError('ASIN must be 10 characters (letters and numbers only)');
      return;
    }

    if (productASINs.includes(trimmedASIN)) {
      setAsinError('This ASIN is already added');
      return;
    }

    if (productASINs.length >= 10) {
      setAsinError('Maximum 10 ASINs allowed');
      return;
    }

    onProductASINsChange([...productASINs, trimmedASIN]);
    setNewASIN('');
    setAsinError('');
  };

  const handleRemoveASIN = (asinToRemove: string) => {
    onProductASINsChange(productASINs.filter((asin) => asin !== asinToRemove));
  };

  const handleAddHighlight = () => {
    const trimmedHighlight = newHighlight.trim();

    if (!trimmedHighlight) return;

    if (
      brandContent.productHighlights &&
      brandContent.productHighlights.length >= 5
    ) {
      return; // Max 5 highlights
    }

    const updatedHighlights = [
      ...(brandContent.productHighlights || []),
      trimmedHighlight,
    ];
    onBrandContentChange({
      ...brandContent,
      productHighlights: updatedHighlights,
    });
    setNewHighlight('');
  };

  const handleRemoveHighlight = (indexToRemove: number) => {
    const updatedHighlights =
      brandContent.productHighlights?.filter(
        (_, index) => index !== indexToRemove
      ) || [];
    onBrandContentChange({
      ...brandContent,
      productHighlights: updatedHighlights,
    });
  };

  const handleBrandContentUpdate = (
    field: keyof AmazonBrandContent,
    value: string
  ) => {
    onBrandContentChange({
      ...brandContent,
      [field]: value,
    });
  };

  if (!showAmazonFields) {
    return null;
  }

  return (
    <Card className="border border-orange-200 bg-orange-50/30">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-orange-800">
          <ShoppingBag className="h-5 w-5" />
          Amazon Brand Content
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Info Alert */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Amazon Posts require brand content information and at least one
            product ASIN to create engaging content for your Amazon Brand Store.
          </AlertDescription>
        </Alert>

        {/* Brand Information */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="brandName" className="text-sm font-medium">
              Brand Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="brandName"
              value={brandContent.brandName}
              onChange={(e) =>
                handleBrandContentUpdate('brandName', e.target.value)
              }
              placeholder="Enter your brand name"
              className="bg-white"
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="headline" className="text-sm font-medium">
              Post Headline
            </Label>
            <Input
              id="headline"
              value={brandContent.headline || ''}
              onChange={(e) =>
                handleBrandContentUpdate('headline', e.target.value)
              }
              placeholder="Create an engaging headline for your post"
              className="bg-white"
              maxLength={80}
            />
            <p className="text-xs text-gray-500">
              {(brandContent.headline || '').length}/80 characters
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetAudience" className="text-sm font-medium">
              Target Audience
            </Label>
            <Select
              value={brandContent.targetAudience || 'general'}
              onValueChange={(value) =>
                handleBrandContentUpdate('targetAudience', value)
              }
            >
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Select target audience" />
              </SelectTrigger>
              <SelectContent>
                {TARGET_AUDIENCES.map((audience) => (
                  <SelectItem key={audience} value={audience}>
                    {audience
                      .replace('_', ' ')
                      .replace(/\b\w/g, (l) => l.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Product Highlights */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Product Highlights</Label>
          <div className="flex gap-2">
            <Input
              value={newHighlight}
              onChange={(e) => setNewHighlight(e.target.value)}
              placeholder="Add a product highlight"
              className="bg-white"
              maxLength={100}
              onKeyPress={(e) => e.key === 'Enter' && handleAddHighlight()}
            />
            <Button
              type="button"
              onClick={handleAddHighlight}
              disabled={
                !newHighlight.trim() ||
                (brandContent.productHighlights?.length || 0) >= 5
              }
              size="sm"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {brandContent.productHighlights &&
            brandContent.productHighlights.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {brandContent.productHighlights.map((highlight, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="bg-orange-100 text-orange-800 hover:bg-orange-200"
                  >
                    {highlight}
                    <Button
                      type="button"
                      onClick={() => handleRemoveHighlight(index)}
                      size="sm"
                      variant="ghost"
                      className="h-auto p-0 ml-2 hover:bg-transparent"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
          <p className="text-xs text-gray-500">
            {brandContent.productHighlights?.length || 0}/5 highlights
          </p>
        </div>

        {/* Product ASINs */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">
            Product ASINs <span className="text-red-500">*</span>
          </Label>
          <div className="flex gap-2">
            <Input
              value={newASIN}
              onChange={(e) => {
                setNewASIN(e.target.value.toUpperCase());
                setAsinError('');
              }}
              placeholder="B08N5WRWNW"
              className="bg-white font-mono"
              maxLength={10}
              onKeyPress={(e) => e.key === 'Enter' && handleAddASIN()}
            />
            <Button
              type="button"
              onClick={handleAddASIN}
              disabled={!newASIN.trim() || productASINs.length >= 10}
              size="sm"
            >
              <Package className="h-4 w-4" />
            </Button>
          </div>
          {asinError && <p className="text-sm text-red-600">{asinError}</p>}
          {productASINs.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {productASINs.map((asin) => (
                <Badge
                  key={asin}
                  variant="outline"
                  className="bg-white border-orange-200 text-orange-800 font-mono"
                >
                  {asin}
                  <Button
                    type="button"
                    onClick={() => handleRemoveASIN(asin)}
                    size="sm"
                    variant="ghost"
                    className="h-auto p-0 ml-2 hover:bg-transparent"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-500">
            {productASINs.length}/10 ASINs • Amazon Standard Identification
            Numbers
          </p>
          {productASINs.length === 0 && (
            <Alert className="border-orange-200 bg-orange-50">
              <AlertDescription className="text-orange-800">
                At least one product ASIN is required for Amazon Posts.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
