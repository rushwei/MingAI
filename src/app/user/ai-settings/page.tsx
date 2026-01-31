'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft, Loader2, Save, Sparkles, BookOpenText,
    MessageSquare, User, Eye, Zap, Layers
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { DEFAULT_MODEL_ID } from '@/lib/ai-config';
import { getMembershipInfo, type MembershipType } from '@/lib/membership';

type ExpressionStyle = 'direct' | 'gentle';

const USER_PROFILE_LIMIT = 120;
const CUSTOM_INSTRUCTIONS_LIMIT = 500;
const LAYER_LABELS: Record<string, string> = {
    base_rules: '通用准则',
    personality_role: '专业分析师',
    data_priority: '数据优先级',
    mentioned_data: '显式提及',
    knowledge_hits: '知识库命中',
    expression_style: '表达风格',
    user_profile: '关于你',
    custom_instructions: '自定义指令'
};

export default function AISettingsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [membershipType, setMembershipType] = useState<MembershipType>('free');

    const [expressionStyle, setExpressionStyle] = useState<ExpressionStyle>('direct');
    const [customInstructions, setCustomInstructions] = useState('');
    const [userProfile, setUserProfile] = useState({
        identity: '',
        occupation: '',
        focus: '',
        answerPreference: '',
        avoid: ''
    });
    const [error, setError] = useState<string | null>(null);

    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewError, setPreviewError] = useState<string | null>(null);
    const [previewLayers, setPreviewLayers] = useState<Array<{ id: string; included: boolean; tokens: number; truncated: boolean }>>([]);
    const [previewTotalTokens, setPreviewTotalTokens] = useState(0);
    const [previewBudgetTotal, setPreviewBudgetTotal] = useState(0);
    const [previewPromptKbs, setPreviewPromptKbs] = useState<Array<{ id: string; name: string }>>([]);

    useEffect(() => {
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) {
                router.push('/user');
                return;
            }
            setUserId(session.user.id);
            const membership = await getMembershipInfo(session.user.id);
            setMembershipType(membership?.type || 'free');

            const { data, error } = await supabase
                .from('user_settings')
                .select('expression_style, custom_instructions, user_profile')
                .eq('user_id', session.user.id)
                .maybeSingle();

            if (error) {
                setLoading(false);
                return;
            }

            const row = data as null | {
                expression_style: ExpressionStyle | null;
                custom_instructions: string | null;
                user_profile: unknown;
            };

            setExpressionStyle(row?.expression_style || 'direct');
            setCustomInstructions((row?.custom_instructions || '').slice(0, CUSTOM_INSTRUCTIONS_LIMIT));
            const profile = row?.user_profile;
            if (typeof profile === 'string') {
                setUserProfile({
                    identity: '',
                    occupation: '',
                    focus: profile.slice(0, USER_PROFILE_LIMIT),
                    answerPreference: '',
                    avoid: ''
                });
            } else if (profile && typeof profile === 'object') {
                const typed = profile as Record<string, unknown>;
                setUserProfile({
                    identity: typeof typed.identity === 'string' ? typed.identity.slice(0, USER_PROFILE_LIMIT) : '',
                    occupation: typeof typed.occupation === 'string' ? typed.occupation.slice(0, USER_PROFILE_LIMIT) : '',
                    focus: typeof typed.focus === 'string' ? typed.focus.slice(0, USER_PROFILE_LIMIT) : '',
                    answerPreference: typeof typed.answerPreference === 'string' ? typed.answerPreference.slice(0, USER_PROFILE_LIMIT) : '',
                    avoid: typeof typed.avoid === 'string' ? typed.avoid.slice(0, USER_PROFILE_LIMIT) : ''
                });
            } else {
                setUserProfile({
                    identity: '',
                    occupation: '',
                    focus: '',
                    answerPreference: '',
                    avoid: ''
                });
            }
            setLoading(false);
        };
        void init();
    }, [router]);

    useEffect(() => {
        let cancelled = false;
        const handle = setTimeout(() => {
            const run = async () => {
                setPreviewLoading(true);
                setPreviewError(null);
                try {
                    const profileForPrompt = {
                        identity: userProfile.identity.trim(),
                        occupation: userProfile.occupation.trim(),
                        focus: userProfile.focus.trim(),
                        answerPreference: userProfile.answerPreference.trim(),
                        avoid: userProfile.avoid.trim()
                    };
                    const profilePayload = Object.values(profileForPrompt).some(v => v.length > 0)
                        ? profileForPrompt
                        : null;
                    const { data: { session } } = await supabase.auth.getSession();
                    const accessToken = session?.access_token;
                    const resp = await fetch('/api/chat/preview', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
                        },
                        body: JSON.stringify({
                            model: DEFAULT_MODEL_ID,
                            reasoning: false,
                            expressionStyle,
                            customInstructions,
                            userProfile: profilePayload,
                        }),
                    });

                    if (!resp.ok) {
                        const data = await resp.json().catch(() => ({} as Record<string, unknown>));
                        if (!cancelled) {
                            setPreviewError(typeof data.error === 'string' ? data.error : '生成预览失败');
                            setPreviewLayers([]);
                            setPreviewTotalTokens(0);
                            setPreviewBudgetTotal(0);
                        }
                        return;
                    }

                    const data = await resp.json() as {
                        totalTokens: number;
                        budgetTotal: number;
                        diagnostics: Array<{ id: string; included: boolean; tokens: number; truncated: boolean }>;
                        promptKnowledgeBases?: Array<{ id: string; name: string }>;
                    };

                    if (cancelled) return;
                    setPreviewLayers(data.diagnostics || []);
                    setPreviewTotalTokens(data.totalTokens);
                    setPreviewBudgetTotal(data.budgetTotal);
                    setPreviewPromptKbs(data.promptKnowledgeBases || []);
                } catch {
                    if (!cancelled) {
                        setPreviewError('生成预览失败');
                        setPreviewLayers([]);
                        setPreviewTotalTokens(0);
                        setPreviewBudgetTotal(0);
                        setPreviewPromptKbs([]);
                    }
                } finally {
                    if (!cancelled) setPreviewLoading(false);
                }
            };
            void run();
        }, 300);

        return () => {
            cancelled = true;
            clearTimeout(handle);
        };
    }, [customInstructions, expressionStyle, userProfile]);

    const handleSave = async () => {
        if (!userId) return;
        setError(null);

        const profileValue = {
            identity: userProfile.identity.trim(),
            occupation: userProfile.occupation.trim(),
            focus: userProfile.focus.trim(),
            answerPreference: userProfile.answerPreference.trim(),
            avoid: userProfile.avoid.trim()
        };
        const profilePayload = Object.values(profileValue).some(v => v.length > 0)
            ? profileValue
            : null;

        setSaving(true);
        const { error } = await supabase
            .from('user_settings')
            .upsert({
                user_id: userId,
                expression_style: expressionStyle,
                custom_instructions: customInstructions || null,
                user_profile: profilePayload
            }, { onConflict: 'user_id' });

        setSaving(false);
        if (error) {
            setError('保存失败');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-foreground-secondary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.back()}
                            className="p-2 -ml-2 hover:bg-background rounded-full transition-colors text-foreground-secondary hover:text-foreground"
                            type="button"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold flex items-center gap-2 text-foreground">
                                <Sparkles className="w-5 h-5 text-accent" />
                                AI 个性化设置
                            </h1>
                            <p className="text-xs text-foreground-secondary mt-0.5">
                                定制你的专属 AI 助手，让回答更符合你的期望
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="hidden md:inline-flex items-center gap-2 px-5 py-2 rounded-full bg-accent text-white hover:bg-accent/90 disabled:opacity-60 transition-all shadow-md shadow-accent/20 font-medium text-sm"
                    >
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        保存设置
                    </button>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    {/* 左侧主要设置区域 */}
                    <div className="xl:col-span-2 space-y-5">
                        {membershipType === 'free' ? (
                            <div className="group relative overflow-hidden flex items-center gap-4 bg-gradient-to-br from-background-secondary to-background-secondary/50 rounded-2xl p-4 border border-border opacity-60 cursor-not-allowed shadow-sm">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                                    <BookOpenText className="w-5 h-5 text-emerald-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-sm font-semibold text-foreground">
                                        知识库 (Plus+)
                                    </h3>
                                    <p className="text-xs text-foreground-secondary mt-0.5">
                                        仅限 Plus 以上会员使用
                                    </p>
                                </div>
                                <ArrowLeft className="w-4 h-4 rotate-180 text-foreground-secondary/50" />
                            </div>
                        ) : (
                            <Link
                                href="/user/knowledge-base"
                                className="group relative overflow-hidden flex items-center gap-4 bg-gradient-to-br from-background-secondary to-background-secondary/50 hover:to-background-secondary rounded-2xl p-4 border border-border hover:border-emerald-500/30 transition-all duration-300 shadow-sm hover:shadow-md"
                            >
                                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                                    <BookOpenText className="w-5 h-5 text-emerald-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-sm font-semibold text-foreground group-hover:text-emerald-500 transition-colors">
                                        知识库
                                    </h3>
                                    <p className="text-xs text-foreground-secondary mt-0.5">
                                        管理已归档的对话和命理资料，AI 将自动引用这些内容
                                    </p>
                                </div>
                                <ArrowLeft className="w-4 h-4 rotate-180 text-foreground-secondary/50 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                            </Link>
                        )}

                        {/* 个人档案 */}
                        <div className="bg-background rounded-2xl p-5 border border-border shadow-sm">
                            <div className="flex items-center gap-3 mb-4">
                                <User className="w-4 h-4 text-amber-500" />
                                <h2 className="text-sm font-semibold text-foreground">关于你</h2>
                            </div>

                            <div className="space-y-3">
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-medium text-foreground-secondary ml-1">身份</label>
                                        <input
                                            value={userProfile.identity}
                                            onChange={(e) => setUserProfile(prev => ({ ...prev, identity: e.target.value.slice(0, USER_PROFILE_LIMIT) }))}
                                            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/50 transition-all placeholder:text-foreground-tertiary"
                                            placeholder="例如：创业者"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-medium text-foreground-secondary ml-1">职业</label>
                                        <input
                                            value={userProfile.occupation}
                                            onChange={(e) => setUserProfile(prev => ({ ...prev, occupation: e.target.value.slice(0, USER_PROFILE_LIMIT) }))}
                                            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/50 transition-all placeholder:text-foreground-tertiary"
                                            placeholder="例如：产品经理"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-medium text-foreground-secondary ml-1">当前关注点</label>
                                    <input
                                        value={userProfile.focus}
                                        onChange={(e) => setUserProfile(prev => ({ ...prev, focus: e.target.value.slice(0, USER_PROFILE_LIMIT) }))}
                                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/50 transition-all placeholder:text-foreground-tertiary"
                                        placeholder="例如：事业发展、人际关系..."
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 对话设置 */}
                        <div className="bg-background rounded-2xl p-5 border border-border shadow-sm">
                            <div className="flex items-center gap-3 mb-4">
                                <MessageSquare className="w-4 h-4 text-blue-500" />
                                <h2 className="text-sm font-semibold text-foreground">对话设置</h2>
                            </div>

                            <div className="space-y-4">
                                {/* 表达风格 */}
                                <div className="space-y-1">
                                    <label className="text-[10px] font-medium text-foreground-secondary ml-1">表达风格</label>
                                    <div className="flex bg-background p-1 rounded-lg border border-border">
                                        <button
                                            type="button"
                                            onClick={() => setExpressionStyle('direct')}
                                            className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all ${expressionStyle === 'direct'
                                                ? 'bg-accent text-white shadow-sm'
                                                : 'text-foreground-secondary hover:text-foreground'
                                                }`}
                                        >
                                            直接干练
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setExpressionStyle('gentle')}
                                            className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all ${expressionStyle === 'gentle'
                                                ? 'bg-accent text-white shadow-sm'
                                                : 'text-foreground-secondary hover:text-foreground'
                                                }`}
                                        >
                                            温和委婉
                                        </button>
                                    </div>
                                </div>

                                {/* 回答偏好与禁忌 (Grid) */}
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-foreground-secondary ml-1">回答偏好</label>
                                        <textarea
                                            value={userProfile.answerPreference}
                                            onChange={(e) => setUserProfile(prev => ({ ...prev, answerPreference: e.target.value.slice(0, USER_PROFILE_LIMIT) }))}
                                            className="w-full h-20 p-3 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 resize-none text-xs leading-relaxed transition-all placeholder:text-foreground-tertiary"
                                            placeholder="例如：结论先行、提供具体案例..."
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-medium text-foreground-secondary ml-1">避讳与禁忌</label>
                                        <textarea
                                            value={userProfile.avoid}
                                            onChange={(e) => setUserProfile(prev => ({ ...prev, avoid: e.target.value.slice(0, USER_PROFILE_LIMIT) }))}
                                            className="w-full h-20 p-3 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 resize-none text-xs leading-relaxed transition-all placeholder:text-foreground-tertiary"
                                            placeholder="例如：避免过于专业的术语..."
                                        />
                                    </div>
                                </div>

                                {/* 自定义指令 */}
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between gap-2 ml-1">
                                        <label className="text-[10px] font-medium text-foreground-secondary">自定义指令 (System Prompt)</label>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${customInstructions.length >= CUSTOM_INSTRUCTIONS_LIMIT
                                            ? 'bg-red-500/10 border-red-500/20 text-red-500'
                                            : 'bg-background border-border text-foreground-tertiary'
                                            }`}>
                                            {customInstructions.length}/{CUSTOM_INSTRUCTIONS_LIMIT}
                                        </span>
                                    </div>
                                    <div className="relative group">
                                        <textarea
                                            value={customInstructions}
                                            onChange={(e) => setCustomInstructions(e.target.value.slice(0, CUSTOM_INSTRUCTIONS_LIMIT))}
                                            className="w-full min-h-[80px] p-3 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all resize-y text-xs leading-relaxed placeholder:text-foreground-tertiary/50"
                                            placeholder="在此输入你希望 AI 遵循的特殊指令..."
                                        />
                                        <div className="absolute bottom-2 right-2 pointer-events-none opacity-0 group-focus-within:opacity-100 transition-opacity">
                                            <Sparkles className="w-3 h-3 text-blue-500/30" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 右侧预览区域 */}
                    <div className="xl:col-span-1">
                        <div className="bg-background rounded-3xl p-6 border border-border shadow-sm sticky top-6">
                            <div className="flex items-center gap-3 mb-6">
                                <Eye className="w-5 h-5 text-accent" />
                                <h2 className="text-lg font-semibold text-foreground">上下文实时预览</h2>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="text-xs font-medium text-foreground-secondary mb-3 block uppercase tracking-wider">生效的知识库</label>
                                    {membershipType === 'free' ? (
                                        <div className="p-3 rounded-xl bg-background border border-border border-dashed text-xs text-foreground-secondary text-center">
                                            仅限 Plus 以上会员使用
                                        </div>
                                    ) : previewPromptKbs.length === 0 ? (
                                        <div className="p-3 rounded-xl bg-background border border-border border-dashed text-xs text-foreground-secondary text-center">
                                            未启用知识库
                                        </div>
                                    ) : (
                                        <div className="flex flex-wrap gap-2">
                                            {previewPromptKbs.map(kb => (
                                                <span
                                                    key={kb.id}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 text-xs font-medium"
                                                >
                                                    <BookOpenText className="w-3 h-3" />
                                                    <span className="max-w-[120px] truncate">{kb.name}</span>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    <div className="mt-3 text-[10px] text-foreground-tertiary">
                                        启用大量提示词会损失算命精确度
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-background rounded-2xl p-4 border border-border">
                                        <div className="flex items-center gap-2 text-xs text-foreground-secondary mb-2">
                                            <Zap className="w-3.5 h-3.5" />
                                            Token 消耗
                                        </div>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-2xl font-bold font-mono text-foreground">
                                                {previewTotalTokens}
                                            </span>
                                            <span className="text-xs text-foreground-secondary font-medium">
                                                / {previewBudgetTotal || '-'}
                                            </span>
                                        </div>
                                        <div className="w-full bg-border/50 h-1.5 rounded-full mt-2 overflow-hidden">
                                            <div
                                                className="h-full bg-accent transition-all duration-500"
                                                style={{ width: `${Math.min((previewTotalTokens / (previewBudgetTotal || 1)) * 100, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                    <div className="bg-background rounded-2xl p-4 border border-border">
                                        <div className="flex items-center gap-2 text-xs text-foreground-secondary mb-2">
                                            <Layers className="w-3.5 h-3.5" />
                                            注入层级
                                        </div>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-2xl font-bold font-mono text-foreground">
                                                {previewLayers.filter(l => l.included).length}
                                            </span>
                                            <span className="text-xs text-foreground-secondary font-medium">
                                                / {previewLayers.length}
                                            </span>
                                        </div>
                                        <div className="w-full bg-border/50 h-1.5 rounded-full mt-2 overflow-hidden">
                                            <div
                                                className="h-full bg-blue-500 transition-all duration-500"
                                                style={{ width: `${Math.min((previewLayers.filter(l => l.included).length / previewLayers.length) * 100, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {previewLoading && (
                                    <div className="flex items-center justify-center gap-2 py-4 text-sm text-foreground-secondary animate-pulse">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>正在计算上下文...</span>
                                    </div>
                                )}

                                {previewError && (
                                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-500">
                                        {previewError}
                                    </div>
                                )}

                                <div className="space-y-2.5">
                                    <label className="text-xs font-medium text-foreground-secondary block uppercase tracking-wider">Prompt 结构</label>
                                    {previewLayers.map((layer, index) => (
                                        <div
                                            key={layer.id}
                                            className={`flex items-center justify-between gap-3 text-xs p-3 rounded-xl border transition-all ${layer.included
                                                ? 'bg-background border-border shadow-sm'
                                                : 'bg-background/50 border-border/50 opacity-60'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <span className="font-mono text-foreground-tertiary w-4 text-center">{index + 1}</span>
                                                <span className="text-foreground font-medium truncate" title={LAYER_LABELS[layer.id] || layer.id}>
                                                    {LAYER_LABELS[layer.id] || layer.id}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 flex-shrink-0">
                                                <span className="font-mono text-foreground-secondary bg-background px-1.5 py-0.5 rounded text-[10px]">
                                                    {layer.tokens}t
                                                </span>
                                                {layer.included ? (
                                                    <div className={`w-2 h-2 rounded-full ring-2 ring-offset-1 ring-offset-background ${layer.truncated ? 'bg-amber-500 ring-amber-500/30' : 'bg-emerald-500 ring-emerald-500/30'}`} title={layer.truncated ? '截断' : '已注入'} />
                                                ) : (
                                                    <div className="w-2 h-2 rounded-full bg-border" title="未注入" />
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                            </div>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 md:translate-x-0 md:static md:mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-500 flex items-center gap-2 shadow-lg backdrop-blur-md md:backdrop-blur-none md:shadow-none z-50">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        {error}
                    </div>
                )}
            </div>

            {/* Mobile Floating Save Button */}
            <div className="md:hidden fixed bottom-6 left-4 right-4 z-40">
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-accent text-white hover:bg-accent/90 disabled:opacity-60 transition-all shadow-xl shadow-accent/20 font-bold text-base active:scale-[0.98]"
                >
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    保存设置
                </button>
            </div>
        </div>
    );
}
