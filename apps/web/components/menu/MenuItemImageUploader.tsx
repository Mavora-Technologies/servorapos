// apps/web/components/menu/MenuItemImageUploader.tsx
'use client';

import { useRef, useState } from 'react';
import { UploadCloud, RefreshCw, Trash2, CheckCircle2, AlertTriangle, ImageIcon } from 'lucide-react';
import {
  uploadMenuItemImage,
  getOptimizedMenuImageUrl,
  validateMenuImageFile,
  type UploadedMenuImage,
} from '@/lib/cloudinary';

interface MenuItemImageUploaderProps {
  imageUrl: string | null;
  imagePublicId: string | null;
  imageOriginalFilename?: string | null;
  onUploaded: (meta: UploadedMenuImage) => void;
  onRemoved: () => void;
  disabled?: boolean;
}

export default function MenuItemImageUploader({
  imageUrl,
  imageOriginalFilename,
  onUploaded,
  onRemoved,
  disabled = false,
}: MenuItemImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const handleFile = async (file: File) => {
    setUploadError(null);
    setUploadSuccess(false);

    const validationErr = validateMenuImageFile(file);
    if (validationErr) {
      setUploadError(validationErr);
      return;
    }

    const previewObjUrl = URL.createObjectURL(file);
    setLocalPreview(previewObjUrl);
    setIsUploading(true);
    setProgress(5);

    try {
      const uploaded = await uploadMenuItemImage(file, (pct) => setProgress(pct));
      onUploaded(uploaded);
      setUploadSuccess(true);
    } catch (err: unknown) {
      setLocalPreview(null);
      setUploadError(err instanceof Error ? err.message : 'Failed to upload image.');
    } finally {
      setIsUploading(false);
      URL.revokeObjectURL(previewObjUrl);
      setLocalPreview(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled || isUploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  };

  const displaySrc = localPreview || getOptimizedMenuImageUrl(imageUrl, 'preview');

  return (
    <div className="p-4 bg-slate-50 border border-gray-200 rounded-2xl space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-servora-navy flex items-center gap-1.5">
          <ImageIcon size={14} className="text-servora-core" />
          Menu Item Photograph (Optional)
        </span>
        <span className="text-[10px] text-servora-deepTeal font-medium">
          JPEG, PNG, or WebP &bull; Max 5 MB
        </span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled || isUploading}
      />

      {displaySrc ? (
        <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-3 rounded-xl border border-gray-200">
          <div className="relative w-28 h-20 rounded-xl overflow-hidden bg-servora-pale border border-gray-100 shrink-0">
            <img
              src={displaySrc}
              alt="Menu item preview"
              className="w-full h-full object-cover"
            />
            {isUploading && (
              <div className="absolute inset-0 bg-servora-navy/70 flex flex-col items-center justify-center text-white text-[10px] font-mono font-bold">
                <span>{progress}%</span>
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 space-y-1.5 w-full">
            <p className="text-xs font-semibold text-servora-navy truncate">
              {imageOriginalFilename || 'Uploaded menu photograph'}
            </p>
            {isUploading ? (
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-servora-core transition-all duration-150"
                  style={{ width: `${progress}%` }}
                />
              </div>
            ) : uploadSuccess ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                <CheckCircle2 size={12} /> Uploaded to Cloudinary &mdash; click Save to apply
              </span>
            ) : (
              <span className="text-[11px] text-gray-500 block">
                Displays automatically on POS terminal cards
              </span>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                disabled={disabled || isUploading}
                onClick={() => inputRef.current?.click()}
                className="px-3 py-1.5 bg-servora-pale text-servora-core border border-servora-core/20 rounded-lg text-[11px] font-bold hover:bg-blue-100/70 inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw size={11} className={isUploading ? 'animate-spin' : ''} /> Replace Image
              </button>
              <button
                type="button"
                disabled={disabled || isUploading}
                onClick={() => {
                  setUploadError(null);
                  setUploadSuccess(false);
                  onRemoved();
                }}
                className="px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-bold hover:bg-rose-100 inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <Trash2 size={11} /> Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled && !isUploading) setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => !disabled && !isUploading && inputRef.current?.click()}
          className={`flex flex-col items-center justify-center text-center p-5 rounded-xl border-2 border-dashed transition-colors cursor-pointer ${
            isDragging
              ? 'border-servora-core bg-blue-50/70'
              : 'border-gray-300 bg-white hover:border-servora-core/60 hover:bg-servora-pale/40'
          }`}
        >
          <UploadCloud size={22} className="text-servora-core mb-1.5" />
          <p className="text-xs font-bold text-servora-navy">
            {isUploading ? `Uploading (${progress}%)...` : 'Drop product photo here or click to browse'}
          </p>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Recommended 4:3 landscape photo for crisp POS menu cards
          </p>
        </div>
      )}

      {uploadError && (
        <div
          role="alert"
          className="flex items-center gap-1.5 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-3 py-2 rounded-xl"
        >
          <AlertTriangle size={13} className="shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}
    </div>
  );
}