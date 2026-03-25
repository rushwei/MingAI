'use client';

import { useState, useCallback } from 'react';
import { CORE_DIMENSIONS, ADVANCED_DIMENSIONS, type FortuneDimensionKey, type DimensionConfig } from '@/lib/visualization/dimensions';

interface DimensionSelectorProps {
  selected: FortuneDimensionKey[];
  onChange: (keys: FortuneDimensionKey[]) => void;
  minCount?: number;
  maxCount?: number;
  compact?: boolean;
}

export default function DimensionSelector({
  selected,
  onChange,
  minCount = 3,
  maxCount = 12,
  compact = false,
}: DimensionSelectorProps) {
  const [showAdvanced, setShowAdvanced] = useState(
    () => ADVANCED_DIMENSIONS.some(d => selected.includes(d.key))
  );

  const toggle = useCallback((key: FortuneDimensionKey) => {
    const isSelected = selected.includes(key);
    if (isSelected) {
      if (selected.length <= minCount) return;
      onChange(selected.filter(k => k !== key));
    } else {
      if (selected.length >= maxCount) return;
      onChange([...selected, key]);
    }
  }, [selected, onChange, minCount, maxCount]);

  const chipClass = compact ? 'px-2 py-0.5 text-xs gap-1' : 'px-3 py-1.5 text-sm gap-1.5';

  function renderChip(dim: DimensionConfig) {
    const isActive = selected.includes(dim.key);
    return (
      <button
        key={dim.key}
        type="button"
        onClick={() => toggle(dim.key)}
        className={`inline-flex items-center rounded-full border transition-colors duration-150 cursor-pointer select-none ${chipClass} ${
          isActive
            ? 'text-white border-transparent'
            : 'border-[var(--color-border)] text-[var(--color-foreground-secondary)] hover:border-[var(--color-foreground-secondary)]'
        }`}
        style={isActive ? { backgroundColor: dim.color } : undefined}
        title={dim.description}
      >
        <span>{dim.icon}</span>
        <span>{dim.label}</span>
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {CORE_DIMENSIONS.map(renderChip)}
      </div>

      {!showAdvanced ? (
        <button
          type="button"
          onClick={() => setShowAdvanced(true)}
          className="text-xs text-[var(--color-foreground-secondary)] hover:text-[var(--color-foreground)] transition-colors cursor-pointer"
        >
          展开更多维度...
        </button>
      ) : (
        <div className="flex flex-wrap gap-2 pt-1 border-t border-[var(--color-border)]">
          {ADVANCED_DIMENSIONS.map(renderChip)}
        </div>
      )}

      <p className="text-xs text-[var(--color-foreground-secondary)]">
        已选 {selected.length}/{maxCount}（至少 {minCount} 个）
      </p>
    </div>
  );
}
