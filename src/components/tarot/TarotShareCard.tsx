/**
 * 塔罗牌分享卡片组件
 *
 * 将塔罗牌占卜结果渲染为精美的可分享卡片
 */
'use client';

import { useRef, useState } from 'react';
import {
    Download,
    Share2,
    Loader2,
    Check,
    Sparkles,
    Gem,
} from 'lucide-react';
import { downloadShareCard, shareCard } from '@/lib/share-card';
import type { DrawnCard, TarotSpread } from '@/lib/tarot';

interface TarotShareCardProps {
    /** 抽到的牌 */
    cards: DrawnCard[];
    /** 使用的牌阵 */
    spread: TarotSpread;
    /** 提问（可选） */
    question?: string;
    /** AI 解读摘要（可选） */
    interpretation?: string;
}

export function TarotShareCard({ cards, spread, question, interpretation }: TarotShareCardProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [shareSuccess, setShareSuccess] = useState(false);

    const formatDate = (d: Date) => {
        return d.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const formatDateShort = (d: Date) => {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    const handleDownload = async () => {
        if (!cardRef.current) return;

        setIsGenerating(true);
        try {
            await downloadShareCard(
                { element: cardRef.current },
                `mingai-tarot-${formatDateShort(new Date())}.png`
            );
        } catch (error) {
            console.error('下载失败:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleShare = async () => {
        if (!cardRef.current) return;

        setIsGenerating(true);
        try {
            const shared = await shareCard(
                { element: cardRef.current },
                {
                    title: `MingAI 塔罗占卜 - ${spread.name}`,
                    text: question ? `我的塔罗占卜：${question}` : `我的${spread.name}塔罗占卜`,
                }
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
    };

    // 计算卡片网格布局
    const getGridStyle = () => {
        const count = cards.length;
        if (count === 1) return { gridTemplateColumns: '1fr', justifyItems: 'center' };
        if (count <= 3) return { gridTemplateColumns: `repeat(${count}, 1fr)` };
        if (count <= 4) return { gridTemplateColumns: 'repeat(2, 1fr)' };
        return { gridTemplateColumns: 'repeat(3, 1fr)' };
    };

    return (
        <div className="space-y-4">
            {/* 操作按钮 - 居中 */}
            <div className="flex items-center justify-center gap-2">
                <button
                    onClick={handleDownload}
                    disabled={isGenerating}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-background-secondary hover:bg-background-tertiary transition-colors disabled:opacity-50"
                >
                    {isGenerating ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Download className="w-4 h-4" />
                    )}
                    <span className="text-sm">保存图片</span>
                </button>
                <button
                    onClick={handleShare}
                    disabled={isGenerating}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white hover:bg-accent/90 transition-colors disabled:opacity-50"
                >
                    {shareSuccess ? (
                        <Check className="w-4 h-4" />
                    ) : isGenerating ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Share2 className="w-4 h-4" />
                    )}
                    <span className="text-sm">{shareSuccess ? '已分享' : '分享'}</span>
                </button>
            </div>

            {/* 可截图的卡片区域 - 居中显示 */}
            <div className="flex justify-center">
                <div
                    ref={cardRef}
                    style={{
                        background: 'linear-gradient(135deg, #fdf4ff 0%, #ffffff 50%, #f3e8ff 100%)',
                        borderRadius: '16px',
                        padding: '24px',
                        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                        border: '1px solid #e9d5ff',
                        minWidth: '320px',
                        maxWidth: '450px',
                        fontFamily: 'system-ui, -apple-system, sans-serif',
                    }}
                >
                {/* 卡片头部 */}
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
                        <Gem style={{ width: '24px', height: '24px', color: '#a855f7' }} />
                        <span style={{ color: '#7c3aed', fontWeight: 600, fontSize: '18px' }}>{spread.name}</span>
                    </div>
                    <div style={{ fontSize: '14px', color: '#9ca3af' }}>{formatDate(new Date())}</div>
                </div>

                {/* 提问 */}
                {question && (
                    <div style={{
                        background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
                        borderRadius: '12px',
                        padding: '12px 16px',
                        marginBottom: '20px',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                            <Sparkles style={{ width: '14px', height: '14px', color: 'rgba(255,255,255,0.8)' }} />
                            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>所问之事</span>
                        </div>
                        <div style={{ color: '#ffffff', fontWeight: 500, fontSize: '14px' }}>{question}</div>
                    </div>
                )}

                {/* 塔罗牌展示 */}
                <div style={{
                    display: 'grid',
                    gap: '12px',
                    marginBottom: '20px',
                    ...getGridStyle(),
                }}>
                    {cards.map((drawnCard, index) => (
                        <div key={index} style={{ textAlign: 'center' }}>
                            {/* 位置标签 */}
                            <div style={{
                                fontSize: '11px',
                                color: '#9ca3af',
                                marginBottom: '6px',
                                height: '14px',
                            }}>
                                {spread.positions[index]?.name}
                            </div>
                            {/* 卡片图片容器 */}
                            <div style={{
                                position: 'relative',
                                width: cards.length === 1 ? '80px' : '60px',
                                height: cards.length === 1 ? '120px' : '90px',
                                margin: '0 auto',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                transform: drawnCard.orientation === 'reversed' ? 'rotate(180deg)' : 'none',
                            }}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={drawnCard.card.image}
                                    alt={drawnCard.card.nameChinese}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                    }}
                                />
                            </div>
                            {/* 牌名 */}
                            <div style={{
                                marginTop: '6px',
                                fontSize: '12px',
                                fontWeight: 500,
                                color: '#374151',
                            }}>
                                {drawnCard.card.nameChinese}
                            </div>
                            {/* 正逆位 */}
                            <div style={{
                                fontSize: '10px',
                                color: drawnCard.orientation === 'reversed' ? '#ef4444' : '#22c55e',
                                fontWeight: 500,
                            }}>
                                {drawnCard.orientation === 'reversed' ? '逆位' : '正位'}
                            </div>
                        </div>
                    ))}
                </div>

                {/* AI 解读摘要 */}
                {interpretation && (
                    <div style={{
                        padding: '16px',
                        background: 'rgba(168, 85, 247, 0.05)',
                        borderRadius: '12px',
                        borderLeft: '3px solid #a855f7',
                        marginBottom: '20px',
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            marginBottom: '8px',
                        }}>
                            <Sparkles style={{ width: '14px', height: '14px', color: '#a855f7' }} />
                            <span style={{ fontSize: '12px', color: '#7c3aed', fontWeight: 500 }}>AI 解读</span>
                        </div>
                        <div style={{
                            fontSize: '13px',
                            color: '#4b5563',
                            lineHeight: 1.6,
                            overflow: 'hidden',
                            display: '-webkit-box',
                            WebkitLineClamp: 4,
                            WebkitBoxOrient: 'vertical',
                        }}>
                            {interpretation.slice(0, 200)}{interpretation.length > 200 ? '...' : ''}
                        </div>
                    </div>
                )}

                {/* 水印 */}
                <div style={{
                    paddingTop: '16px',
                    borderTop: '1px solid #e9d5ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="/Logo.png"
                            alt="MingAI"
                            style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '8px',
                                objectFit: 'cover',
                            }}
                        />
                        <span style={{ fontSize: '13px', color: '#a855f7', fontWeight: 600 }}>MingAI</span>
                    </div>
                    <span style={{ fontSize: '12px', color: '#9ca3af' }}>AI智能命理平台</span>
                </div>
            </div>
            </div>
        </div>
    );
}
