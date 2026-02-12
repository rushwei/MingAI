/**
 * AI专业五行分析组件
 *
 * 基于八字命盘进行深度五行分析
 * 支持流式输出
 */
'use client';

import { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, Loader2, Copy, Check } from 'lucide-react';
import { AIAnalysisLock } from '@/components/bazi/result/AIAnalysisLock';
import { MarkdownContent } from '@/components/ui/MarkdownContent';
import { ModelSelector } from '@/components/ui/ModelSelector';
import { DEFAULT_MODEL_ID } from '@/lib/ai/ai-config';
import { getMembershipInfo, type MembershipType } from '@/lib/user/membership';
import { ThinkingBlock } from '@/components/chat/ThinkingBlock';
import { CreditsModal } from '@/components/ui/CreditsModal';
import { useStreamingResponse, isCreditsError } from '@/lib/hooks/useStreamingResponse';

interface AIWuxingAnalysisProps {
    chartId: string;
    userId: string;
    chartSummary: string;
    credits?: number | null;
    savedAnalysis?: string | null;
    savedReasoning?: string | null;
    savedModelId?: string | null;
    onSaveAnalysis: (analysis: string) => void;
    onLoginRequired?: () => void;
}

export function AIWuxingAnalysis({
    chartId,
    userId,
    chartSummary,
    credits,
    savedAnalysis,
    savedReasoning,
    savedModelId,
    onSaveAnalysis,
    onLoginRequired,
}: AIWuxingAnalysisProps) {
    const [isUnlocked, setIsUnlocked] = useState(!!savedAnalysis);
    const [analysis, setAnalysis] = useState(savedAnalysis || '');
    const [analysisReasoning, setAnalysisReasoning] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL_ID);
    const [reasoningEnabled, setReasoningEnabled] = useState(false);
    const [membershipType, setMembershipType] = useState<MembershipType>('free');
    const [showCreditsModal, setShowCreditsModal] = useState(false);
    // 使用共享的流式响应 hook
    const streaming = useStreamingResponse();

    useEffect(() => {
        if (savedAnalysis) {
            setIsUnlocked(true);
            setAnalysis(savedAnalysis);
        }
        if (savedReasoning) {
            setAnalysisReasoning(savedReasoning);
        }
    }, [savedAnalysis, savedReasoning]);

    useEffect(() => {
        if (savedModelId) {
            setSelectedModel(savedModelId);
        }
        if (savedReasoning) {
            setReasoningEnabled(true);
        }
    }, [savedModelId, savedReasoning]);

    useEffect(() => {
        if (!userId) {
            setMembershipType('free');
            return;
        }
        getMembershipInfo(userId).then(info => {
            if (info) {
                setMembershipType(info.type);
            }
        });
    }, [userId]);

    const handleUnlock = async () => {
        setIsUnlocked(true);
        await startAnalysis();
    };

    const startAnalysis = async () => {
        if (loading) return;

        setLoading(true);
        streaming.reset();
        setAnalysis('');
        setAnalysisReasoning(null);

        try {
            const result = await streaming.startStream('/api/bazi/analysis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chartId,
                    type: 'wuxing',
                    chartSummary,
                    modelId: selectedModel,
                    reasoning: reasoningEnabled,
                    stream: true,
                }),
            });

            // 检测积分不足错误（使用返回值而非状态，避免异步问题）
            if (result?.error && isCreditsError(result.error)) {
                setShowCreditsModal(true);
                return;
            }

            if (result?.error) {
                throw new Error(result.error);
            }

            // 更新最终内容
            if (result?.content) {
                setAnalysis(result.content);
                if (result.reasoning) {
                    setAnalysisReasoning(result.reasoning);
                }
                onSaveAnalysis(result.content);
            } else {
                setAnalysis('分析失败，请点击重新分析按钮重试。');
            }
        } catch (error) {
            console.error('Analysis error:', error);
            setAnalysis('分析失败，请点击重新分析按钮重试。');
            setAnalysisReasoning(null);
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

    const modelControls = (
        <div className="flex justify-end">
            <ModelSelector
                compact
                selectedModel={selectedModel}
                onModelChange={setSelectedModel}
                reasoningEnabled={reasoningEnabled}
                onReasoningChange={setReasoningEnabled}
                userId={userId}
                membershipType={membershipType}
            />
        </div>
    );

    // 已解锁的内容
    const content = (
        <div className="rounded-2xl border border-border">
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
            <div className="p-4 prose prose-sm dark:prose-invert max-w-none min-h-[200px] overflow-hidden">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                        {streaming.isStreaming && (streaming.content || streaming.reasoning) ? (
                            <>
                                {streaming.reasoning && (
                                    <ThinkingBlock
                                        content={streaming.reasoning}
                                        isStreaming={streaming.isStreaming && !streaming.content}
                                        startTime={streaming.reasoningStartTime}
                                        duration={streaming.reasoningDuration}
                                    />
                                )}
                                {streaming.content && (
                                    <MarkdownContent
                                        content={streaming.content}
                                        className="text-sm text-foreground-secondary"
                                    />
                                )}
                            </>
                        ) : (
                            <>
                                <Loader2 className="w-10 h-10 animate-spin text-accent" />
                                <p className="text-sm text-foreground-secondary">AI正在分析您的八字，请稍候...</p>
                            </>
                        )}
                    </div>
                ) : (
                    <>
                        {analysisReasoning && (
                            <ThinkingBlock
                                content={analysisReasoning}
                                duration={streaming.reasoningDuration}
                            />
                        )}
                        <MarkdownContent
                            content={analysis || '点击「重新分析」开始AI分析'}
                            className="text-sm text-foreground-secondary"
                        />
                    </>
                )}
            </div>
        </div>
    );

    return (
        <div className="space-y-2">
            {modelControls}
            <AIAnalysisLock
                type="wuxing"
                title="AI专业五行分析"
                description="消耗1积分，获取基于您命盘的深度五行分析报告"
                isUnlocked={isUnlocked}
                placeholder={placeholder}
                userId={userId}
                credits={credits}
                onUnlock={handleUnlock}
                onLoginRequired={onLoginRequired}
            >
                {content}
            </AIAnalysisLock>
            <CreditsModal
                isOpen={showCreditsModal}
                onClose={() => setShowCreditsModal(false)}
            />
        </div>
    );
}
