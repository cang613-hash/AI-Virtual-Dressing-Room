import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ImageUploadProps {
  onUpload: (base64: string) => void;
  label: string;
  currentImage?: string | null;
  onClear?: () => void;
  className?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  onUpload,
  label,
  currentImage,
  onClear,
  className,
}) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpload(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: false,
  } as any);

  return (
    <div className={cn("relative", className)}>
      <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
        {label}
      </label>
      
      {currentImage ? (
        <div className="relative group aspect-[3/4] rounded-xl overflow-hidden border border-zinc-200 bg-zinc-50">
          <img 
            src={currentImage} 
            alt={label} 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClear?.();
            }}
            className="absolute top-2 right-2 p-1.5 bg-white/80 backdrop-blur-sm rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
          >
            <X className="w-4 h-4 text-zinc-600" />
          </button>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={cn(
            "aspect-[3/4] rounded-xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center p-4 text-center",
            isDragActive 
              ? "border-zinc-900 bg-zinc-50" 
              : "border-zinc-200 hover:border-zinc-400 hover:bg-zinc-50/50"
          )}
        >
          <input {...getInputProps()} />
          <div className="p-3 rounded-full bg-zinc-100 mb-3">
            <Upload className="w-5 h-5 text-zinc-500" />
          </div>
          <p className="text-sm font-medium text-zinc-900">Upload Image</p>
          <p className="text-xs text-zinc-500 mt-1">Drag & drop or click</p>
        </div>
      )}
    </div>
  );
};
