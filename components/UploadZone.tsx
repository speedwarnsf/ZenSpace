import React, { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, X, Loader2, Aperture } from 'lucide-react';

interface UploadZoneProps {
  onImageSelected: (file: File) => void;
  isAnalyzing: boolean;
}

export const UploadZone: React.FC<UploadZoneProps> = ({ onImageSelected, isAnalyzing }) => {
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file.');
      return;
    }
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    onImageSelected(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const clearImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full flex justify-center py-12">
      <div
        onClick={triggerFileSelect}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className="
          relative w-80 h-80 sm:w-96 sm:h-96
          rounded-full 
          bg-zinc-900
          shadow-[0_25px_60px_-12px_rgba(0,0,0,0.6)]
          flex items-center justify-center
          cursor-pointer
          group
          transition-transform duration-500 ease-out
          hover:scale-[1.02]
          select-none
        "
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />

        {/* 1. Outer Barrel Ribs (Grip) */}
        <div 
          className="absolute inset-0 rounded-full border-[16px] border-zinc-900 shadow-[inset_0_0_20px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.05)]"
          style={{
            backgroundImage: `repeating-linear-gradient(
              45deg,
              transparent,
              transparent 2px,
              #27272a 2px,
              #27272a 4px
            )`
          }}
        />

        {/* 2. Inner Metal Ring (Specs) */}
        <div className="absolute inset-[16px] rounded-full bg-zinc-900 border border-zinc-800 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]">
          {/* Rotating Text Ring */}
          <div className="absolute inset-0 animate-[spin_60s_linear_infinite]">
             <svg className="w-full h-full" viewBox="0 0 200 200">
                <path id="textPath" d="M 100, 100 m -75, 0 a 75,75 0 1,1 150,0 a 75,75 0 1,1 -150,0" fill="transparent" />
                <text className="text-[5px] font-bold fill-zinc-400 uppercase tracking-[0.3em]">
                  <textPath href="#textPath" startOffset="0%">ZenSpace Planar</textPath>
                  <textPath href="#textPath" startOffset="50%">T* 1:2.8 f=80mm</textPath>
                </text>
             </svg>
          </div>
          
          {/* Red T* Mark */}
          <div className="absolute bottom-8 right-14 text-red-600 font-serif font-bold text-xs transform rotate-45 z-20">T*</div>
        </div>

        {/* 3. Front Element Housing (Deep Black) */}
        <div className="absolute inset-[45px] rounded-full bg-black shadow-[inset_0_10px_30px_rgba(0,0,0,1)] overflow-hidden border-4 border-zinc-800">
            
            {/* Lens Flare / Coating Simulation */}
            <div className="absolute inset-0 z-20 pointer-events-none bg-gradient-to-tr from-purple-500/10 via-transparent to-emerald-500/10 mix-blend-screen" />
            <div className="absolute inset-0 z-20 pointer-events-none bg-[radial-gradient(circle_at_35%_35%,rgba(255,255,255,0.1)_0%,transparent_50%)]" />
            
            {/* Aperture Blades (Background) */}
            {!preview && !isAnalyzing && (
                <div className="absolute inset-0 flex items-center justify-center opacity-20 group-hover:opacity-10 transition-all duration-700 group-hover:scale-110">
                    <Aperture className="w-full h-full text-zinc-700" strokeWidth={0.5} />
                </div>
            )}

            {/* Content State: Analyzing */}
            {isAnalyzing && (
                <div className="absolute inset-0 z-30 bg-black/80 flex flex-col items-center justify-center backdrop-blur-[2px]">
                    <div className="relative">
                        <div className="absolute inset-0 animate-ping rounded-full bg-emerald-500/20"></div>
                        <div className="absolute inset-0 animate-[spin_3s_linear_infinite] border-t-2 border-emerald-500 rounded-full"></div>
                        <Loader2 className="w-10 h-10 text-emerald-500 relative z-10 animate-spin" />
                    </div>
                    <p className="mt-4 text-emerald-500 font-mono text-[10px] tracking-widest uppercase">Focusing...</p>
                </div>
            )}

            {/* Content State: Preview */}
            {preview ? (
                <>
                    <img src={preview} alt="Lens view" className="relative w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-300 z-10" />
                    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button 
                            onClick={clearImage}
                            className="bg-red-600/90 text-white p-3 rounded-full transform hover:scale-110 transition-transform hover:bg-red-500 shadow-lg"
                            title="Remove Image"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </>
            ) : (
                /* Content State: Empty/Prompt */
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-zinc-500 group-hover:text-zinc-300 transition-colors">
                     <Upload className="w-10 h-10 mb-3 opacity-80" />
                     <span className="text-[10px] font-bold uppercase tracking-widest">Drop Photo</span>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};