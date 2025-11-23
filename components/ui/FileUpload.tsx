import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, File, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../../src/lib/supabase';
import { uploadFile } from '../../src/lib/storage';
import { FileUploadOptions, UploadProgress } from '../../types';

interface FileUploadProps {
  options: FileUploadOptions;
  className?: string;
  disabled?: boolean;
  children?: React.ReactNode;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  options,
  className = '',
  disabled = false,
  children
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const validateFile = useCallback((file: File): string | null => {
    // Check file type
    if (options.allowedTypes && options.allowedTypes.length > 0) {
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!options.allowedTypes.includes(fileExtension) && !options.allowedTypes.includes(file.type)) {
        return `Invalid file type. Allowed types: ${options.allowedTypes.join(', ')}`;
      }
    }

    // Check file size
    if (options.maxSize && file.size > options.maxSize) {
      const maxSizeMB = Math.round(options.maxSize / (1024 * 1024));
      return `File size exceeds ${maxSizeMB}MB limit`;
    }

    return null;
  }, [options.allowedTypes, options.maxSize]);

  const uploadFile = useCallback(async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      options.onError?.(validationError);
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadedFile(file);

    try {
      const { data, error } = await uploadFile(
        options.bucket,
        file,
        (progress) => {
          setUploadProgress({
            loaded: progress,
            total: 100,
            percentage: progress
          });
          options.onProgress?.(progress);
        }
      );

      if (error) {
        throw error;
      }

      if (data?.publicUrl) {
        setUploadedUrl(data.publicUrl);
        options.onSuccess?.(data.publicUrl);
      }

      setIsUploading(false);

    } catch (err: any) {
      const errorMessage = err.message || 'Failed to upload file';
      setError(errorMessage);
      options.onError?.(errorMessage);
      setIsUploading(false);
      setUploadedFile(null);
    }
  }, [options, validateFile]);

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    uploadFile(file);
  }, [uploadFile]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    if (disabled || isUploading) return;

    const files = e.dataTransfer.files;
    handleFileSelect(files);
  }, [disabled, isUploading, handleFileSelect]);

  const handleClick = useCallback(() => {
    if (disabled || isUploading) return;
    fileInputRef.current?.click();
  }, [disabled, isUploading]);

  const clearUpload = useCallback(() => {
    setUploadedFile(null);
    setUploadedUrl(null);
    setUploadProgress(null);
    setError(null);
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`relative ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => handleFileSelect(e.target.files)}
        accept={options.allowedTypes?.join(',')}
        disabled={disabled || isUploading}
      />
      
      {!uploadedFile ? (
        <div
          className={`
            border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all
            ${isDragging ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-gray-400'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            ${isUploading ? 'pointer-events-none' : ''}
          `}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={handleClick}
        >
          {children || (
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                <Upload size={24} className="text-gray-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">
                  {isDragging ? 'Drop your file here' : 'Click to upload or drag and drop'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {options.allowedTypes ? `Supported: ${options.allowedTypes.join(', ')}` : 'All file types'}
                  {options.maxSize && ` • Max size: ${formatFileSize(options.maxSize)}`}
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
                <File size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 truncate max-w-xs">
                  {uploadedFile.name}
                </p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(uploadedFile.size)}
                </p>
              </div>
            </div>
            {!isUploading && (
              <button
                onClick={clearUpload}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            )}
          </div>

          {isUploading && uploadProgress && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-600">
                <span>Uploading...</span>
                <span>{uploadProgress.percentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress.percentage}%` }}
                />
              </div>
            </div>
          )}

          {!isUploading && uploadedUrl && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle size={16} />
              <span className="text-sm font-medium">Upload successful</span>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-red-600 mt-2">
              <AlertCircle size={16} />
              <span className="text-sm">{error}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};