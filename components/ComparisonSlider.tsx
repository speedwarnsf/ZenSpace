import { useState, useRef, useCallback, useEffect } from 'react';
import { Move, ChevronLeft, ChevronRight } from 'lucide-react';

interface ComparisonSliderProps {
  beforeImage: string;
  afterImage: string;
  beforeLabel?: string;
  afterLabel?: string;
  className?: string;
}

/**
 * Before/After comparison slider component
 * Allows users to drag a slider to compare original room with visualization
 */
export function ComparisonSlider({
  beforeImage,
  afterImage,
  beforeLabel = 'Before',
  afterLabel = 'After',
  className = '',
}: ComparisonSliderProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState({ before: false, after: false });

  const handleMove = useCallback(
    (clientX: number) => {
      if (!containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const percentage = Math.min(Math.max((x / rect.width) * 100, 0), 100);
      setSliderPosition(percentage);
    },
    []
  );

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    handleMove(e.clientX);
  }, [handleMove]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setIsDragging(true);
    if (e.touches[0]) {
      handleMove(e.touches[0].clientX);
    }
  }, [handleMove]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        handleMove(e.clientX);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging && e.touches[0]) {
        handleMove(e.touches[0].clientX);
      }
    };

    const handleEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleEnd);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, handleMove]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      setSliderPosition((prev) => Math.max(prev - 5, 0));
    } else if (e.key === 'ArrowRight') {
      setSliderPosition((prev) => Math.min(prev + 5, 100));
    }
  }, []);

  const allLoaded = isLoaded.before && isLoaded.after;

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden rounded-xl select-none ${className}`}
      style={{ aspectRatio: '16/9' }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      role="slider"
      aria-label="Image comparison slider"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(sliderPosition)}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {/* Loading state */}
      {!allLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
          <div className="animate-pulse text-gray-500 dark:text-gray-400">Loading comparison...</div>
        </div>
      )}

      {/* After image (background) */}
      <img
        src={afterImage}
        alt={afterLabel}
        className={`absolute inset-0 w-full h-full object-cover ${allLoaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setIsLoaded((prev) => ({ ...prev, after: true }))}
        draggable={false}
      />

      {/* Before image (clipped) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${sliderPosition}%` }}
      >
        <img
          src={beforeImage}
          alt={beforeLabel}
          className={`absolute inset-0 w-full h-full object-cover ${allLoaded ? 'opacity-100' : 'opacity-0'}`}
          style={{ 
            width: containerRef.current ? containerRef.current.offsetWidth : '100%',
            maxWidth: 'none'
          }}
          onLoad={() => setIsLoaded((prev) => ({ ...prev, before: true }))}
          draggable={false}
        />
      </div>

      {/* Slider handle */}
      {allLoaded && (
        <div
          className="absolute top-0 bottom-0 w-1 bg-white shadow-lg cursor-ew-resize transition-opacity"
          style={{ 
            left: `${sliderPosition}%`, 
            transform: 'translateX(-50%)',
            opacity: isDragging ? 1 : 0.9
          }}
        >
          {/* Handle button */}
          <div
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 
              w-10 h-10 rounded-full bg-white shadow-lg border-2 border-gray-300
              flex items-center justify-center transition-all duration-200
              ${isDragging ? 'scale-110 border-blue-500' : 'hover:scale-105 hover:border-blue-400'}`}
          >
            <ChevronLeft size={16} className="text-gray-600 -mr-1" />
            <ChevronRight size={16} className="text-gray-600 -ml-1" />
          </div>
        </div>
      )}

      {/* Labels */}
      {allLoaded && (
        <>
          <div 
            className={`absolute top-3 left-3 px-2 py-1 rounded-md text-xs font-medium
              bg-black/60 text-white backdrop-blur-sm transition-opacity
              ${sliderPosition < 15 ? 'opacity-0' : 'opacity-100'}`}
          >
            {beforeLabel}
          </div>
          <div 
            className={`absolute top-3 right-3 px-2 py-1 rounded-md text-xs font-medium
              bg-black/60 text-white backdrop-blur-sm transition-opacity
              ${sliderPosition > 85 ? 'opacity-0' : 'opacity-100'}`}
          >
            {afterLabel}
          </div>
        </>
      )}

      {/* Instructions overlay (shows briefly) */}
      {allLoaded && (
        <div 
          className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full
            bg-black/60 text-white text-xs backdrop-blur-sm flex items-center gap-2
            animate-fade-out pointer-events-none"
        >
          <Move size={14} />
          <span>Drag to compare</span>
        </div>
      )}
    </div>
  );
}
