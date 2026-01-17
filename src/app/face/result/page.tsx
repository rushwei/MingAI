/**
 * 面相分析结果页
 * 
 * 显示面相分析结果，支持从历史记录加载
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ScanFace, ArrowLeft, Loader2, MessageCircle } from 'lucide-react';
import { LoginOverlay } from '@/components/auth/LoginOverlay';
import { MarkdownContent } from '@/components/ui/MarkdownContent';
import { supabase } from '@/lib/supabase';
import { FACE_ANALYSIS_TYPES, FACE_DISCLAIMER } from '@/lib/face';

interface FaceResultData {
    readingId?: string;
    conversationId?: string | null;
    analysisType: string;
    analysis?: string;
    createdAt?: string;
    isTemporary?: boolean;
}

export default function FaceResultPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [resultData, setResultData] = useState<FaceResultData | null>(null);
    const [analysis, setAnalysis] = useState<string>('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadResult = async () => {
            setLoading(true);
            setError(null);

            // 尝试从 sessionStorage 获取
            const storedResult = sessionStorage.getItem('face_result');
            if (storedResult) {
                try {
                    const parsed = JSON.parse(storedResult) as FaceResultData;
                    setResultData(parsed);

                    if (parsed.analysis) {
                        setAnalysis(parsed.analysis);
                        setLoading(false);
                        return;
                    }

                    // 如果没有分析内容，从对话中加载
                    if (parsed.conversationId) {
                        const { data, error: fetchError } = await supabase
                            .from('conversations')
                            .select('messages')
                            .eq('id', parsed.conversationId)
                            .single();

                        if (!fetchError && data?.messages) {
                            const messages = data.messages as Array<{ role: string; content: string }>;
                            const assistantMsg = messages.find(m => m.role === 'assistant');
                            if (assistantMsg) {
                                setAnalysis(assistantMsg.content);
                            }
                        }
                    }

                    setLoading(false);
                    return;
                } catch {
                }
            }

            // 没有数据，显示错误
            setError('未找到分析结果，请重新进行分析');
            setLoading(false);
        };

        loadResult();
    }, []);

    const getAnalysisTypeName = (typeId: string) => {
        const type = FACE_ANALYSIS_TYPES.find(t => t.id === typeId);
        return type?.name || '面相分析';
    };

    const handleContinueChat = () => {
        if (resultData?.conversationId) {
            router.push(`/chat?id=${resultData.conversationId}`);
        }
    };

    if (loading) {
        return (
            <LoginOverlay message="登录后查看分析结果">
                <div className="max-w-2xl mx-auto px-4 py-8 text-center animate-fade-in">
                    <ScanFace className="w-12 h-12 text-purple-500 mx-auto mb-4" />
                    <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto mb-4" />
                    <p className="text-foreground-secondary">加载分析结果中...</p>
                </div>
            </LoginOverlay>
        );
    }

    if (error || !resultData) {
        return (
            <LoginOverlay message="登录后查看分析结果">
                <div className="max-w-2xl mx-auto px-4 py-8 text-center">
                    <ScanFace className="w-12 h-12 text-purple-500/50 mx-auto mb-4" />
                    <p className="text-foreground-secondary mb-4">{error || '未找到分析结果'}</p>
                    <button
                        onClick={() => router.push('/face')}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500 text-white hover:bg-purple-600 transition-colors"
                    >
                        <ScanFace className="w-4 h-4" />
                        开始面相分析
                    </button>
                </div>
            </LoginOverlay>
        );
    }

    return (
        <LoginOverlay message="登录后查看分析结果">
            <div className="max-w-3xl mx-auto px-4 py-8 animate-fade-in">
                {/* 返回按钮 */}
                <button
                    onClick={() => router.push('/face')}
                    className="flex items-center gap-2 text-foreground-secondary hover:text-foreground mb-6 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    返回
                </button>

                {/* 标题 */}
                <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 rounded-xl bg-purple-500/10">
                        <ScanFace className="w-8 h-8 text-purple-500" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold">
                            {getAnalysisTypeName(resultData.analysisType)}
                        </h1>
                        {resultData.createdAt && (
                            <p className="text-sm text-foreground-secondary">
                                {new Date(resultData.createdAt).toLocaleString('zh-CN')}
                            </p>
                        )}
                    </div>
                </div>

                {/* 临时结果警告 */}
                {resultData.isTemporary && (
                    <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                        <div className="flex gap-2 text-sm text-foreground-secondary">
                            <span className="font-bold text-amber-600 shrink-0">注意：</span>
                            <p>由于网络原因，本次分析结果未能保存到历史记录，但您仍可在此查看结果。</p>
                        </div>
                    </div>
                )}

                {/* 免责声明 */}
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6">
                    <p className="text-sm text-foreground-secondary whitespace-pre-line">
                        {FACE_DISCLAIMER}
                    </p>
                </div>

                {/* 分析结果 */}
                <div className="bg-gradient-to-br from-purple-500/5 to-pink-500/5 border border-purple-500/20 rounded-2xl p-6 mb-6">
                    {analysis ? (
                        <MarkdownContent
                            content={analysis}
                            className="prose prose-sm dark:prose-invert max-w-none"
                        />
                    ) : (
                        <p className="text-foreground-secondary">暂无分析内容</p>
                    )}
                </div>

                {/* 操作按钮 */}
                <div className="flex flex-wrap gap-3">
                    {resultData.conversationId && (
                        <button
                            onClick={handleContinueChat}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-500 text-white hover:bg-purple-600 transition-colors"
                        >
                            <MessageCircle className="w-4 h-4" />
                            继续对话
                        </button>
                    )}
                    <button
                        onClick={() => router.push('/face')}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-background-secondary hover:bg-background-tertiary transition-colors"
                    >
                        <ScanFace className="w-4 h-4" />
                        再次分析
                    </button>
                </div>
            </div>
        </LoginOverlay>
    );
}
