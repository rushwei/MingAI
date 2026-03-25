import { ALL_DIMENSIONS } from '@/lib/visualization/dimensions';
import { WUXING_COLORS } from '@/lib/visualization/chart-theme';

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function GradientDefs() {
  return (
    <defs>
      {ALL_DIMENSIONS.map(d => (
        <linearGradient key={d.key} id={`gradient-${d.key}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={d.color} stopOpacity={0.8} />
          <stop offset="100%" stopColor={d.color} stopOpacity={0.1} />
        </linearGradient>
      ))}

      {(Object.entries(WUXING_COLORS) as [string, string][]).map(([element, color]) => (
        <linearGradient key={element} id={`gradient-wuxing-${element}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.8} />
          <stop offset="100%" stopColor={hexToRgba(color, 0.15)} stopOpacity={0.15} />
        </linearGradient>
      ))}

      <linearGradient id="gradient-positive" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#22c55e" stopOpacity={0.8} />
        <stop offset="100%" stopColor="#4ade80" stopOpacity={0.4} />
      </linearGradient>
      <linearGradient id="gradient-negative" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#ef4444" stopOpacity={0.8} />
        <stop offset="100%" stopColor="#f87171" stopOpacity={0.4} />
      </linearGradient>
      <linearGradient id="gradient-neutral" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#9ca3af" stopOpacity={0.8} />
        <stop offset="100%" stopColor="#d1d5db" stopOpacity={0.4} />
      </linearGradient>
    </defs>
  );
}
