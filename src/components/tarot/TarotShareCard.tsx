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
    Check,
    Sparkles,
    Gem,
} from 'lucide-react';
import { SoundWaveLoader } from '@/components/ui/SoundWaveLoader';
import { downloadShareCard, shareCard } from '@/lib/share-card';
import type { DrawnCard, TarotSpread } from '@/lib/divination/tarot';

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
                        <SoundWaveLoader variant="inline" />
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
                        <SoundWaveLoader variant="inline" />
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
                        background: 'radial-gradient(circle at top right, #3b0764 0%, #1e1b4b 100%)',
                        borderRadius: '24px',
                        padding: '32px',
                        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        minWidth: '340px',
                        maxWidth: '480px',
                        fontFamily: "'PingFang SC', 'Microsoft YaHei', sans-serif",
                        color: '#fff',
                        position: 'relative',
                        overflow: 'hidden',
                    }}
                >
                    {/* Background Noise/Texture Overlay */}
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\' opacity=\'0.05\'/%3E%3C/svg%3E")',
                        opacity: 0.5,
                        pointerEvents: 'none',
                    }} />

                    {/* Decorative Top Line */}
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '120px',
                        height: '4px',
                        background: 'linear-gradient(90deg, transparent, #fbbf24, transparent)',
                        opacity: 0.5,
                    }} />

                    <div style={{ position: 'relative', zIndex: 1 }}>
                        {/* 卡片头部 */}
                        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                            <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                padding: '6px 16px',
                                borderRadius: '20px',
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                marginBottom: '12px'
                            }}>
                                <Gem style={{ width: '18px', height: '18px', color: '#fbbf24' }} />
                                <span style={{ color: '#fbbf24', fontWeight: 600, fontSize: '16px', letterSpacing: '0.05em' }}>{spread.name}</span>
                            </div>
                            <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.4)' }}>{formatDate(new Date())}</div>
                        </div>

                        {/* 提问 */}
                        {question && (
                            <div style={{
                                background: 'rgba(255, 255, 255, 0.03)',
                                borderRadius: '16px',
                                padding: '16px 20px',
                                marginBottom: '28px',
                                border: '1px solid rgba(255, 255, 255, 0.05)',
                                textAlign: 'center',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '8px' }}>
                                    <Sparkles style={{ width: '12px', height: '12px', color: '#a78bfa' }} />
                                    <span style={{ fontSize: '12px', color: '#a78bfa', opacity: 0.8 }}>所问之事</span>
                                </div>
                                <div style={{ color: '#fff', fontWeight: 500, fontSize: '15px', lineHeight: 1.5 }}>{question}</div>
                            </div>
                        )}

                        {/* 塔罗牌展示 */}
                        <div style={{
                            display: 'grid',
                            gap: '16px',
                            marginBottom: '28px',
                            ...getGridStyle(),
                        }}>
                            {cards.map((drawnCard, index) => (
                                <div key={index} style={{ textAlign: 'center' }}>
                                    {/* 位置标签 */}
                                    <div style={{
                                        fontSize: '10px',
                                        color: 'rgba(255, 255, 255, 0.5)',
                                        marginBottom: '8px',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.1em',
                                    }}>
                                        {spread.positions[index]?.name}
                                    </div>
                                    {/* 卡片图片容器 */}
                                    <div style={{
                                        position: 'relative',
                                        width: cards.length === 1 ? '100px' : '70px',
                                        height: cards.length === 1 ? '160px' : '110px',
                                        margin: '0 auto',
                                        borderRadius: '10px',
                                        overflow: 'hidden',
                                        boxShadow: '0 8px 20px rgba(0,0,0,0.4)',
                                        border: '1px solid rgba(255,255,255,0.1)',
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
                                        marginTop: '10px',
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        color: '#e2e8f0',
                                    }}>
                                        {drawnCard.card.nameChinese}
                                    </div>
                                    {/* 正逆位 */}
                                    <div style={{
                                        fontSize: '10px',
                                        marginTop: '2px',
                                        color: drawnCard.orientation === 'reversed' ? '#f87171' : '#4ade80',
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
                                padding: '20px',
                                background: 'rgba(59, 7, 100, 0.3)',
                                borderRadius: '16px',
                                border: '1px solid rgba(139, 92, 246, 0.2)',
                                marginBottom: '24px',
                            }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    marginBottom: '10px',
                                }}>
                                    <Sparkles style={{ width: '14px', height: '14px', color: '#c084fc' }} />
                                    <span style={{ fontSize: '13px', color: '#d8b4fe', fontWeight: 600 }}>AI 启示</span>
                                </div>
                                <div style={{
                                    fontSize: '13px',
                                    color: 'rgba(255, 255, 255, 0.8)',
                                    lineHeight: 1.7,
                                    fontWeight: 300,
                                    overflow: 'hidden',
                                    display: '-webkit-box',
                                    WebkitLineClamp: 5,
                                    WebkitBoxOrient: 'vertical',
                                }}>
                                    {interpretation.slice(0, 250).replace(/[#*`]/g, '')}{interpretation.length > 250 ? '...' : ''}
                                </div>
                            </div>
                        )}

                        {/* 水印 */}
                        <div style={{
                            paddingTop: '20px',
                            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{
                                    width: '28px',
                                    height: '28px',
                                    borderRadius: '8px',
                                    background: 'linear-gradient(135deg, #a855f7, #6366f1)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    fontWeight: 'bold',
                                    fontSize: '14px'
                                }}>M</div>
                                <span style={{ fontSize: '14px', color: '#fff', fontWeight: 700, letterSpacing: '0.05em' }}>MingAI</span>
                            </div>
                            <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.4)' }}>AI智能命理平台</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
