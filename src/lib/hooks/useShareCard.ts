/**
 * Shared hook for share-card download / share logic.
 *
 * Used by both `ShareCard` (fortune) and `TarotShareCard` to avoid
 * duplicating the download/share state machine.
 */
import { useRef, useState, useCallback } from 'react';
import { downloadShareCard, shareCard } from '@/lib/share-card';

export interface UseShareCardOptions {
  /** Filename prefix, e.g. "mingai-fortune" */
  filenamePrefix: string;
}

export function useShareCard({ filenamePrefix }: UseShareCardOptions) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  const formatDate = useCallback((d: Date) => {
    return d.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });
  }, []);

  const formatDateShort = useCallback((d: Date) => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const handleDownload = useCallback(async (date: Date) => {
    if (!cardRef.current) return;
    setIsGenerating(true);
    try {
      await downloadShareCard(
        { element: cardRef.current },
        `${filenamePrefix}-${formatDateShort(date)}.png`,
      );
    } catch (error) {
      console.error('下载失败:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [filenamePrefix, formatDateShort]);

  const handleShare = useCallback(async (shareData: { title?: string; text?: string }) => {
    if (!cardRef.current) return;
    setIsGenerating(true);
    try {
      const shared = await shareCard(
        { element: cardRef.current },
        shareData,
      );
      if (shared) {
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 2000);
      }
    } catch (error) {
      console.error('分享失败:', error);
    } finally {
      setIsGenerating(false);
    }
  }, []);

  return {
    cardRef,
    isGenerating,
    shareSuccess,
    formatDate,
    formatDateShort,
    handleDownload,
    handleShare,
  };
}
