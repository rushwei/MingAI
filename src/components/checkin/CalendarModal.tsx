'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { CheckinCalendarPanel } from '@/components/checkin/CheckinCalendarPanel';

interface CalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  stackLevel?: 'page' | 'settings';
}

export function CalendarModal({ isOpen, onClose, stackLevel = 'page' }: CalendarModalProps) {
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const modalLayerClass = stackLevel === 'settings' ? 'z-[110]' : 'z-[70]';

  return (
    <div className={`fixed inset-0 flex items-center justify-center p-4 ${modalLayerClass}`}>
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md rounded-2xl border border-border bg-background shadow-xl animate-fade-in">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="text-base font-semibold text-foreground">签到详情</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 transition-colors hover:bg-background-secondary"
            aria-label="关闭"
          >
            <X className="h-4 w-4 text-foreground-secondary" />
          </button>
        </div>

        <div className="p-5">
          <CheckinCalendarPanel active={isOpen} />
        </div>
      </div>
    </div>
  );
}
