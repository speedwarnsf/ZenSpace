import { useEffect, useRef } from 'react';
import type { LookbookEntry } from '../types';

interface ShareableCardProps {
  entry: LookbookEntry;
  onReady?: (element: HTMLDivElement) => void;
}

export function ShareableCard({ entry, onReady }: ShareableCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { option } = entry;

  useEffect(() => {
    if (ref.current && onReady) {
      onReady(ref.current);
    }
  }, [onReady]);

  const gradientBg = option.palette.length >= 2
    ? `linear-gradient(135deg, ${option.palette[0]}, ${option.palette[1]}, ${option.palette[option.palette.length - 1]})`
    : '#1e293b';

  return (
    <div
      ref={ref}
      style={{
        width: 1080,
        minHeight: 1350,
        backgroundColor: '#0f172a',
        color: '#ffffff',
        fontFamily: "'Georgia', 'Times New Roman', serif",
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Visualization Image */}
      <div
        style={{
          width: 1080,
          height: 700,
          overflow: 'hidden',
          position: 'relative',
          background: option.visualizationImage ? '#0f172a' : gradientBg,
        }}
      >
        {option.visualizationImage ? (
          <img
            src={`data:image/png;base64,${option.visualizationImage}`}
            alt={option.name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
            crossOrigin="anonymous"
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              background: gradientBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 48,
              opacity: 0.6,
              letterSpacing: 8,
            }}
          >
            ZENSPACE
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '48px 56px', flex: 1, display: 'flex', flexDirection: 'column', gap: 28 }}>
        {/* Name */}
        <div
          style={{
            fontSize: 48,
            fontWeight: 700,
            letterSpacing: 1,
            lineHeight: 1.2,
            textTransform: 'uppercase',
          }}
        >
          {option.name}
        </div>

        {/* Mood */}
        <div
          style={{
            fontSize: 22,
            fontStyle: 'italic',
            color: '#cbd5e1',
            lineHeight: 1.6,
          }}
        >
          &ldquo;{option.mood}&rdquo;
        </div>

        {/* Palette */}
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          {option.palette.map((color, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  backgroundColor: color,
                  border: '3px solid rgba(255,255,255,0.15)',
                }}
              />
              <span style={{ fontSize: 13, color: '#94a3b8', fontFamily: 'monospace' }}>
                {color}
              </span>
            </div>
          ))}
        </div>

        {/* Frameworks */}
        {option.frameworks.length > 0 && (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' as const }}>
            {option.frameworks.map((fw, i) => (
              <span
                key={i}
                style={{
                  padding: '6px 18px',
                  borderRadius: 999,
                  fontSize: 15,
                  fontWeight: 500,
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  color: '#6ee7b7',
                  fontFamily: 'system-ui, sans-serif',
                }}
              >
                {fw}
              </span>
            ))}
          </div>
        )}

        {/* Key Changes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {option.keyChanges.map((change, i) => (
            <div
              key={i}
              style={{
                fontSize: 18,
                color: '#e2e8f0',
                fontFamily: 'system-ui, sans-serif',
                display: 'flex',
                gap: 12,
                alignItems: 'flex-start',
                lineHeight: 1.5,
              }}
            >
              <span style={{ color: '#10b981', flexShrink: 0 }}>•</span>
              {change}
            </div>
          ))}
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Footer */}
        <div
          style={{
            borderTop: '1px solid rgba(255,255,255,0.1)',
            paddingTop: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span
            style={{
              fontSize: 20,
              fontWeight: 600,
              letterSpacing: 2,
              color: '#94a3b8',
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            zenspace.design
          </span>
          <span style={{ fontSize: 16, color: '#475569' }}>AI-powered interior design</span>
        </div>
      </div>
    </div>
  );
}

export default ShareableCard;
