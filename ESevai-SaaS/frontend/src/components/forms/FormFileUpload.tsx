import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';

interface FormFileUploadProps {
  label: string;
  acceptTypes?: string[];
  maxSizeMb?: number;
  onFileSelect: (file: File) => void;
  className?: string;
}

export const FormFileUpload: React.FC<FormFileUploadProps> = ({
  label,
  acceptTypes = ['pdf', 'jpg', 'jpeg', 'png'],
  maxSizeMb = 5,
  onFileSelect,
  className,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    setValidationError(null);
    const ext = file.name.split('.').pop()?.toLowerCase();
    
    if (!ext || !acceptTypes.includes(ext)) {
      setValidationError(`Invalid file format. Allowed extensions: ${acceptTypes.join(', ').toUpperCase()}`);
      return false;
    }

    if (file.size > maxSizeMb * 1024 * 1024) {
      setValidationError(`File exceeds maximum size of ${maxSizeMb}MB.`);
      return false;
    }

    return true;
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (validateFile(file)) {
        processFile(file);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (validateFile(file)) {
        processFile(file);
      }
    }
  };

  const processFile = (file: File) => {
    setSelectedFile(file);
    setUploadProgress(0);
    
    // Simulate loading progress
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev === null || prev >= 100) {
          clearInterval(interval);
          onFileSelect(file);
          return 100;
        }
        return prev + 25;
      });
    }, 150);
  };

  const removeFile = () => {
    setSelectedFile(null);
    setUploadProgress(null);
    setValidationError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className={className}>
      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
        {label}
      </label>

      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer min-h-36 ${
          dragActive
            ? 'border-blue-500 bg-blue-950/20'
            : selectedFile
            ? 'border-slate-800 bg-slate-900/10'
            : 'border-slate-850 hover:border-slate-700 bg-slate-950 hover:bg-slate-900/30'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={acceptTypes.map((t) => `.${t}`).join(',')}
          onChange={handleChange}
        />

        {!selectedFile ? (
          <>
            <Upload className="w-8 h-8 text-slate-500 mb-2.5 animate-pulse" />
            <p className="text-sm font-medium text-slate-300">
              Drag & Drop file here, or <span className="text-blue-400">Browse</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Supports: {acceptTypes.join(', ').toUpperCase()} (Max: {maxSizeMb}MB)
            </p>
          </>
        ) : (
          <div className="w-full flex items-center justify-between pointer-events-none" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 w-10/12">
              <FileText className="w-8 h-8 text-blue-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-200 truncate">{selectedFile.name}</p>
                <p className="text-xs text-slate-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                {uploadProgress !== null && uploadProgress < 100 && (
                  <div className="w-full bg-slate-800 rounded-full h-1.5 mt-1.5 overflow-hidden">
                    <div className="bg-blue-500 h-1.5 rounded-full transition-all duration-150" style={{ width: `${uploadProgress}%` }}></div>
                  </div>
                )}
                {uploadProgress === 100 && (
                  <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium mt-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Upload Complete
                  </span>
                )}
              </div>
            </div>
            
            <Button
              variant="destructive"
              size="sm"
              className="shrink-0 pointer-events-auto"
              onClick={(e) => {
                e.stopPropagation();
                removeFile();
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {validationError && (
        <span className="flex items-center gap-1 mt-2 text-xs font-medium text-red-400 animate-fade-in">
          <AlertCircle className="w-3.5 h-3.5" /> {validationError}
        </span>
      )}
    </div>
  );
};
