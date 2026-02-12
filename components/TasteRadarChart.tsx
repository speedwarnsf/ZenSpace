/**
 * TasteRadarChart — SVG radar chart showing aesthetic preferences.
 * Pure SVG, no dependencies. Animated with Framer Motion.
 */

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { TasteProfile, TasteDimension } from '../services/tasteProfile';
import { DIMENSION_LABELS, getTasteSummary } from '../services/tasteProfile';

interface TasteRadarChartProps {
  profile: TasteProfile;
  size?: number;
  className?: string;
}

const DIMENSIONS: TasteDimension[] = ['warmth', 'boldness', 'nature', 'texture', 'minimalism', 'symmetry'];

function polarToXY(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

export function TasteRadarChart({ profile, size = 260, className = '' }: TasteRadarChartProps) {
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.36;
  const labelR = size * 0.46;
  const angleStep = 360 / DIMENSIONS.length;

  // Build polygon path from profile dimensions (map -1..1 to 0..maxR)
  const points = useMemo(() => {
    return DIMENSIONS.map((dim, i) => {
      const val = (profile.dimensions[dim] + 1) / 2; // 0..1
      const r = Math.max(0.08, val) * maxR;
      const angle = i * angleStep;
      return polarToXY(cx, cy, r, angle);
    });
  }, [profile, cx, cy, maxR, angleStep]);

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

  const summary = useMemo(() => getTasteSummary(profile), [profile]);

  // Grid rings at 25%, 50%, 75%, 100%
  const rings = [0.25, 0.5, 0.75, 1.0];

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-stone-500 dark:text-stone-400">
          Your Taste Profile
        </h3>
        <span className="text-[10px] text-stone-400 dark:text-stone-500">
          {profile.totalRatings} rating{profile.totalRatings !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="flex justify-center">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
          {/* Grid rings */}
          {rings.map((r) => (
            <polygon
              key={r}
              points={DIMENSIONS.map((_, i) => {
                const pt = polarToXY(cx, cy, r * maxR, i * angleStep);
                return `${pt.x},${pt.y}`;
              }).join(' ')}
              fill="none"
              stroke="currentColor"
              className="text-stone-200 dark:text-stone-700"
              strokeWidth={r === 0.5 ? 1 : 0.5}
              opacity={r === 0.5 ? 0.6 : 0.3}
            />
          ))}

          {/* Axis lines */}
          {DIMENSIONS.map((_, i) => {
            const pt = polarToXY(cx, cy, maxR, i * angleStep);
            return (
              <line
                key={i}
                x1={cx} y1={cy} x2={pt.x} y2={pt.y}
                stroke="currentColor"
                className="text-stone-200 dark:text-stone-700"
                strokeWidth={0.5}
                opacity={0.4}
              />
            );
          })}

          {/* Data polygon */}
          <motion.path
            d={pathD}
            fill="rgba(16, 185, 129, 0.15)"
            stroke="rgb(16, 185, 129)"
            strokeWidth={2}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            style={{ transformOrigin: `${cx}px ${cy}px` }}
          />

          {/* Data points */}
          {points.map((pt, i) => (
            <motion.circle
              key={i}
              cx={pt.x} cy={pt.y} r={3.5}
              fill="rgb(16, 185, 129)"
              stroke="white"
              strokeWidth={1.5}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05, type: 'spring', stiffness: 300 }}
            />
          ))}

          {/* Labels */}
          {DIMENSIONS.map((dim, i) => {
            const pt = polarToXY(cx, cy, labelR, i * angleStep);
            const val = profile.dimensions[dim];
            const { low, high, label } = DIMENSION_LABELS[dim];
            const displayLabel = val > 0.15 ? high : val < -0.15 ? low : label;
            return (
              <text
                key={dim}
                x={pt.x} y={pt.y}
                textAnchor="middle"
                dominantBaseline="central"
                className="fill-stone-500 dark:fill-stone-400"
                fontSize={10}
                fontWeight={Math.abs(val) > 0.3 ? 600 : 400}
              >
                {displayLabel}
              </text>
            );
          })}
        </svg>
      </div>

      {/* Text summary */}
      <AnimatePresence>
        {(summary.tendencies.length > 0 || summary.avoidances.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2 text-xs text-stone-500 dark:text-stone-400"
          >
            {summary.tendencies.length > 0 && (
              <p>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">You lean toward:</span>{' '}
                {summary.tendencies.join(', ')}
              </p>
            )}
            {summary.avoidances.length > 0 && (
              <p>
                <span className="text-red-500 dark:text-red-400 font-medium">You tend to avoid:</span>{' '}
                {summary.avoidances.join(', ')}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default TasteRadarChart;
