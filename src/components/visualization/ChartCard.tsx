'use client';

import type { ReactNode } from 'react';

interface ChartCardProps {
  title?: string;
  subtitle?: string;
  compact?: boolean;
  loading?: boolean;
  className?: string;
  children: ReactNode;
  headerRight?: ReactNode;
}

export default function ChartCard({
  title,
  subtitle,
  compact = false,
  loading = false,
  className = '',
  children,
  headerRight,
}: ChartCardProps) {
  const padding = compact ? 'p-3' : 'p-4 sm:p-5';
  const titleSize = compact ? 'text-sm' : 'text-base';
  const subtitleSize = compact ? 'text-[10px]' : 'text-xs';

  return (
    <div
      className={`relative rounded-2xl border border-[var(--color-border)] shadow-sm bg-[var(--color-background)] overflow-hidden ${className}`}
    >
      {(title || headerRight) && (
        <div className={`flex items-start justify-between gap-2 ${padding} ${subtitle ? 'pb-2' : ''}`}>
          <div className="min-w-0">
            {title && (
              <h3 className={`font-semibold text-[var(--color-foreground)] leading-tight ${titleSize}`}>
                {title}
              </h3>
            )}
            {subtitle && (
              <p className={`text-[var(--color-foreground-secondary)] mt-0.5 ${subtitleSize}`}>
                {subtitle}
              </p>
            )}
          </div>
          {headerRight && <div className="shrink-0">{headerRight}</div>}
        </div>
      )}

      <div className={`${title ? `${padding} pt-0` : padding} transition-opacity duration-300`}>
        {children}
      </div>

      {loading && (
        <div className="absolute inset-0 bg-[var(--color-background)]/60 flex items-center justify-center backdrop-blur-[1px]">
          <div className="flex gap-1">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-1.5 h-4 rounded-full bg-[var(--color-accent)] animate-pulse"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
