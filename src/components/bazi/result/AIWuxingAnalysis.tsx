/**
 * AI专业五行分析组件
 * 
 * 基于八字命盘进行深度五行分析
 * 非流式输出 - 加载完成后一次性显示
 */
'use client';

import { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, Loader2, Copy, Check } from 'lucide-react';
import { AIAnalysisLock } from './AIAnalysisLock';
import { MarkdownContent } from '@/components/ui/MarkdownContent';

interface AIWuxingAnalysisProps {
    chartId: string;
    userId: string;
    chartSummary: string;
    savedAnalysis?: string | null;
    onSaveAnalysis: (analysis: string) => void;
    onLoginRequired?: () => void;
}

export function AIWuxingAnalysis({
    chartId,
    userId,
    chartSummary,
    savedAnalysis,
    onSaveAnalysis,
    onLoginRequired,
}: AIWuxingAnalysisProps) {
    const [isUnlocked, setIsUnlocked] = useState(!!savedAnalysis);
    const [analysis, setAnalysis] = useState(savedAnalysis || '');
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (savedAnalysis) {
            setIsUnlocked(true);
            setAnalysis(savedAnalysis);
        }
    }, [savedAnalysis]);

    const handleUnlock = async () => {
        setIsUnlocked(true);
        await startAnalysis();
    };

    const startAnalysis = async () => {
        if (loading) return;

        setLoading(true);
        setAnalysis('');

        try {
            const response = await fetch('/api/bazi/analysis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chartId,
                    type: 'wuxing',
                    chartSummary,
                }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || '分析请求失败');
            }

            setAnalysis(data.content);
            onSaveAnalysis(data.content);
        } catch (error) {
            console.error('Analysis error:', error);
            setAnalysis('分析失败，请点击重新分析按钮重试。');
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = async () => {
        await navigator.clipboard.writeText(analysis);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // 占位内容
    const placeholder = (
        <div className="p-6 space-y-4 min-h-[280px]">
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20">
                    <Sparkles className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                    <h4 className="font-bold">AI专业五行分析</h4>
                    <p className="text-sm text-foreground-secondary">深度解读五行配置与喜用神</p>
                </div>
            </div>
            <div className="space-y-2">
                <div className="h-4 bg-foreground/10 rounded w-full" />
                <div className="h-4 bg-foreground/10 rounded w-4/5" />
                <div className="h-4 bg-foreground/10 rounded w-3/4" />
                <div className="h-4 bg-foreground/10 rounded w-5/6" />
                <div className="h-4 bg-foreground/10 rounded w-2/3" />
                <div className="h-4 bg-foreground/10 rounded w-4/5" />
            </div>
        </div>
    );

    // 已解锁的内容
    const content = (
        <div className="rounded-2xl border border-border overflow-hidden">
            {/* 头部 */}
            <div className="p-4 border-b border-border flex items-center justify-between bg-gradient-to-r from-blue-500/5 to-cyan-500/5">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20">
                        <Sparkles className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                        <h4 className="font-bold">AI专业五行分析</h4>
                        <p className="text-sm text-foreground-secondary">深度解读五行配置与喜用神</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {analysis && !loading && (
                        <button
                            onClick={handleCopy}
                            className="p-2 rounded-lg hover:bg-background-secondary transition-colors"
                            title="复制"
                        >
                            {copied ? (
                                <Check className="w-4 h-4 text-green-500" />
                            ) : (
                                <Copy className="w-4 h-4 text-foreground-secondary" />
                            )}
                        </button>
                    )}
                    <button
                        onClick={startAnalysis}
                        disabled={loading}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background-secondary hover:bg-accent hover:text-white transition-colors text-sm disabled:opacity-50"
                    >
                        {loading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <RefreshCw className="w-4 h-4" />
                        )}
                        {loading ? '分析中...' : '重新分析'}
                    </button>
                </div>
            </div>

            {/* 内容 */}
            <div className="p-4 prose prose-sm dark:prose-invert max-w-none min-h-[200px]">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                        <Loader2 className="w-10 h-10 animate-spin text-accent" />
                        <p className="text-sm text-foreground-secondary">AI正在分析您的八字，请稍候...</p>
                    </div>
                ) : (
                    <MarkdownContent
                        content={analysis || '点击「重新分析」开始AI分析'}
                        className="text-sm text-foreground-secondary"
                    />
                )}
            </div>
        </div>
    );

    return (
        <AIAnalysisLock
            type="wuxing"
            title="AI专业五行分析"
            description="消耗1次对话额度，获取基于您命盘的深度五行分析报告"
            isUnlocked={isUnlocked}
            placeholder={placeholder}
            userId={userId}
            onUnlock={handleUnlock}
            onLoginRequired={onLoginRequired}
        >
            {content}
        </AIAnalysisLock>
    );
}
