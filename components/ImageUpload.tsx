'use client';

import { useState, useRef } from 'react';
import { fileToBase64, optimizeImage } from '@/lib/ocr';

interface ImageUploadProps {
  onImageUploaded: (imageBase64: string, mimeType: string, file: File) => void;
  disabled?: boolean;
}

export default function ImageUpload({ onImageUploaded, disabled }: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona una imagen válida (PNG, JPG, GIF, etc.)');
      return;
    }

    // Validar tamaño (10MB máximo)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      alert('La imagen es demasiado grande. Por favor selecciona una imagen menor a 10MB');
      return;
    }

    try {
      // Optimizar imagen antes de procesar
      const optimizedFile = await optimizeImage(file);
      
      // Convertir a base64
      const { base64, mimeType } = await fileToBase64(optimizedFile);
      
      // Crear preview
      const previewUrl = URL.createObjectURL(optimizedFile);
      setPreview(previewUrl);
      
      onImageUploaded(base64, mimeType, optimizedFile);
    } catch (error) {
      console.error('Error processing file:', error);
      alert('Error al procesar la imagen. Por favor intenta con otra imagen.');
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  return (
    <div className="w-full">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
          className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-colors
          ${isDragging ? 'border-primary bg-accent-light/20' : 'border-gray-300 hover:border-primary-light'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileInput}
          className="hidden"
          disabled={disabled}
        />
        
        {preview ? (
          <div className="space-y-4">
            <img
              src={preview}
              alt="Preview"
              className="max-h-64 mx-auto rounded-lg"
            />
            <p className="text-sm text-gray-600">
              Imagen seleccionada. Haz clic para cambiar.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div>
              <p className="text-lg font-medium text-gray-700">
                Arrastra una imagen aquí o haz clic para seleccionar
              </p>
              <p className="text-sm text-gray-500 mt-2">
                PNG, JPG, GIF hasta 10MB
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

