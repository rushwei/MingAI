'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { History, ChevronLeft, Calendar, Loader2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { writeSessionJSON } from '@/lib/cache';
import { findHexagram } from '@/lib/liuyao';
import { getModelName } from '@/lib/ai-config';

// 支持的历史类型
type HistoryType = 'tarot' | 'liuyao' | 'mbti' | 'hepan' | 'palm' | 'face';

interface HistoryItem {
    id: string;
    title: string;
    createdAt: string;
    subType?: string;
    modelName?: string;
}

interface HistoryDrawerProps {
    type: HistoryType;
    className?: string;
}

const TYPE_CONFIG: Record<HistoryType, {
    label: string;
    tableName: string;
    historyPath: string;
    detailPath: string;
    sessionKey: string;
    useTimestamp?: boolean;
}> = {
    tarot: { label: '塔罗历史', tableName: 'tarot_readings', historyPath: '/tarot/history', detailPath: '/tarot/result', sessionKey: 'tarot_result', useTimestamp: true },
    liuyao: { label: '六爻历史', tableName: 'liuyao_divinations', historyPath: '/liuyao/history', detailPath: '/liuyao/result', sessionKey: 'liuyao_result' },
    mbti: { label: 'MBTI历史', tableName: 'mbti_readings', historyPath: '/mbti/history', detailPath: '/mbti/result', sessionKey: 'mbti_result' },
    hepan: { label: '合盘历史', tableName: 'hepan_charts', historyPath: '/hepan/history', detailPath: '/hepan/result', sessionKey: 'hepan_result' },
    palm: { label: '手相历史', tableName: 'palm_readings', historyPath: '/palm/history', detailPath: '/palm/result', sessionKey: 'palm_result' },
    face: { label: '面相历史', tableName: 'face_readings', historyPath: '/face/history', detailPath: '/face/result', sessionKey: 'face_result' },
};

export function HistoryDrawer({ type, className = '' }: HistoryDrawerProps) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [navigating, setNavigating] = useState<string | null>(null); // item id being navigated to
    const [items, setItems] = useState<HistoryItem[]>([]);
    const [userId, setUserId] = useState<string | null>(null);

    const config = TYPE_CONFIG[type];

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUserId(session?.user?.id || null);
        });
    }, []);

    const loadHistory = async () => {
        if (!userId) return;
        setLoading(true);

        const query = supabase
            .from(config.tableName)
            .select('*, conversation:conversations(source_data)')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(10); // 增加每页显示数量

        const { data, error } = await query;

        if (!error && data) {
            setItems(data.map((item: Record<string, unknown>) => {
                let title = '';
                let subType = '';
                let modelName: string | undefined;

                const sourceData = (item.conversation as { source_data?: Record<string, unknown> } | null)?.source_data;
                const modelId = typeof sourceData?.model_id === 'string' ? sourceData.model_id : null;
                if (modelId) {
                    modelName = getModelName(modelId);
                }

                if (type === 'hepan') {
                    title = `${item.person1_name || ''} & ${item.person2_name || ''}`;
                    // 映射合盘类型
                    const hepanType = item.type as string;
                    if (hepanType === 'love') subType = '情侣';
                    else if (hepanType === 'business') subType = '商业';
                    else if (hepanType === 'family') subType = '亲子';
                } else if (type === 'mbti') {
                    title = `${item.mbti_type} 人格`;
                } else if (type === 'tarot') {
                    // 映射牌阵 ID 到中文名称
                    const spreadNames: Record<string, string> = {
                        'single': '单牌',
                        'three-card': '三牌阵',
                        'love': '爱情牌阵',
                        'celtic-cross': '凯尔特十字',
                    };
                    const spreadId = item.spread_id as string;
                    const spreadName = spreadNames[spreadId] || spreadId || '塔罗占卜';
                    const question = (item.question as string)?.trim();
                    title = question ? `${question} - ${spreadName}` : spreadName;
                } else if (type === 'liuyao') {
                    // 使用卦名显示，支持变卦
                    const hexagramCode = item.hexagram_code as string;
                    const changedHexagramCode = item.changed_hexagram_code as string | null;

                    const hexagram = findHexagram(hexagramCode);
                    const hexagramName = hexagram?.name || '未知卦';

                    let hexagramDisplay: string;
                    if (changedHexagramCode) {
                        const changedHexagram = findHexagram(changedHexagramCode);
                        const changedName = changedHexagram?.name || '未知卦';
                        hexagramDisplay = `${hexagramName} -> ${changedName}`;
                    } else {
                        hexagramDisplay = hexagramName;
                    }

                    const question = (item.question as string)?.trim();
                    title = question ? `${question} - ${hexagramDisplay}` : hexagramDisplay;
                } else if (type === 'palm') {
                    // 手相分析标题
                    const analysisType = item.analysis_type as string;
                    const handType = item.hand_type as string;
                    const analysisNames: Record<string, string> = {
                        'full': '综合分析',
                        'lifeline': '生命线',
                        'headline': '智慧线',
                        'heartline': '感情线',
                        'fateline': '事业线',
                        'marriage': '婚姻线',
                    };
                    const handNames: Record<string, string> = { 'left': '左手', 'right': '右手' };
                    const analysisName = analysisNames[analysisType] || '手相分析';
                    const handName = handNames[handType] || '';
                    title = handName ? `${handName}${analysisName}` : analysisName;
                } else if (type === 'face') {
                    // 面相分析标题
                    const analysisType = item.analysis_type as string;
                    const analysisNames: Record<string, string> = {
                        'full': '综合分析',
                        'forehead': '天庭分析',
                        'eyes': '眼相分析',
                        'nose': '鼻相分析',
                        'mouth': '口相分析',
                        'career': '事业运势',
                        'love': '感情运势',
                        'wealth': '财运分析',
                    };
                    title = analysisNames[analysisType] || '面相分析';
                }
                return {
                    id: item.id as string,
                    title: title.length > 18 ? title.slice(0, 18) + '...' : title,
                    createdAt: item.created_at as string,
                    subType,
                    modelName,
                };
            }));
        }
        setLoading(false);
    };

    const handleToggle = () => {
        if (!isOpen) {
            loadHistory();
        }
        setIsOpen(!isOpen);
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    };

    // 点击查看历史记录详情
    const handleViewItem = async (itemId: string) => {
        setNavigating(itemId);

        try {
            // 获取完整记录
            const { data, error } = await supabase
                .from(config.tableName)
                .select('*')
                .eq('id', itemId)
                .single();

            if (error || !data) {
                console.error('Failed to fetch record:', error);
                setNavigating(null);
                return;
            }

            // 根据类型转换数据并存储
            if (type === 'liuyao') {
                // 重建六爻结果
                const { findHexagram } = await import('@/lib/liuyao');

                // 从 hexagram_code 重建 yaos
                const hexagramCode = data.hexagram_code as string;
                const changedLines = (data.changed_lines as number[]) || [];

                // 重建 yaos 数据
                const yaos = hexagramCode.split('').map((char, idx) => ({
                    type: parseInt(char) as 0 | 1,
                    change: changedLines.includes(idx + 1) ? 'changing' : 'stable' as const,
                    position: idx + 1,
                }));

                const hexagram = findHexagram(hexagramCode);
                const changedHexagram = data.changed_hexagram_code
                    ? findHexagram(data.changed_hexagram_code as string)
                    : undefined;

                const sessionData = {
                    question: data.question,
                    yaos,
                    hexagram,
                    changedHexagram,
                    changedLines,
                    divinationId: data.id, // 包含记录 ID
                    createdAt: data.created_at,
                    conversationId: data.conversation_id || null,
                };

                writeSessionJSON(config.sessionKey, sessionData);
            } else if (type === 'mbti') {
                // 重建 MBTI 结果 - 直接使用数据库中保存的 scores 和 percentages
                const mbtiType = data.mbti_type as string;
                const scores = data.scores || { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };
                const percentages = data.percentages || {
                    EI: { E: 50, I: 50 },
                    SN: { S: 50, N: 50 },
                    TF: { T: 50, F: 50 },
                    JP: { J: 50, P: 50 },
                };

                const sessionData = {
                    type: mbtiType,
                    scores,
                    percentages,
                    readingId: data.id, // 包含记录 ID
                    conversationId: data.conversation_id || null,
                };

                writeSessionJSON(config.sessionKey, sessionData);
            } else if (type === 'tarot') {
                // 重建塔罗结果
                const { TAROT_SPREADS } = await import('@/lib/tarot');

                const spreadId = data.spread_id as string;
                const spread = TAROT_SPREADS.find(s => s.id === spreadId);
                const cards = data.cards as unknown[];

                const sessionData = {
                    spread,
                    spreadId,
                    cards,
                    question: data.question || '',
                    readingId: data.id, // 包含记录 ID
                    createdAt: data.created_at,
                    conversationId: data.conversation_id || null,
                };

                writeSessionJSON(config.sessionKey, sessionData);
            } else if (type === 'hepan') {
                // 优先使用保存的完整结果，避免重新计算（有随机性）
                if (data.result_data) {
                    // 包含 chartId 以便后续 AI 分析能更新正确的记录
                    const resultWithId = {
                        ...(data.result_data as object),
                        chartId: data.id,
                        conversationId: data.conversation_id || null,
                    };
                    writeSessionJSON(config.sessionKey, resultWithId);
                } else {
                    // 兼容旧数据：没有 result_data 时重新计算
                    const { analyzeCompatibility } = await import('@/lib/hepan');

                    const birth1 = data.person1_birth as { year: number; month: number; day: number; hour: number };
                    const birth2 = data.person2_birth as { year: number; month: number; day: number; hour: number };

                    const person1 = {
                        name: data.person1_name as string,
                        ...birth1,
                    };
                    const person2 = {
                        name: data.person2_name as string,
                        ...birth2,
                    };
                    const hepanType = data.type as 'love' | 'business' | 'family';

                    const result = analyzeCompatibility(person1, person2, hepanType);
                    // 包含 chartId
                    const resultWithId = {
                        ...result,
                        chartId: data.id,
                        conversationId: data.conversation_id || null,
                    };
                    writeSessionJSON(config.sessionKey, resultWithId);
                }
            } else if (type === 'palm') {
                // 手相分析结果
                const sessionData = {
                    readingId: data.id,
                    analysisType: data.analysis_type,
                    handType: data.hand_type,
                    createdAt: data.created_at,
                    conversationId: data.conversation_id || null,
                };
                writeSessionJSON(config.sessionKey, sessionData);
            } else if (type === 'face') {
                // 面相分析结果
                const sessionData = {
                    readingId: data.id,
                    analysisType: data.analysis_type,
                    createdAt: data.created_at,
                    conversationId: data.conversation_id || null,
                };
                writeSessionJSON(config.sessionKey, sessionData);
            }

            // 关闭抽屉并导航
            setIsOpen(false);
            setNavigating(null); // 清除导航状态，避免组件不卸载时锁定列表
            // 对于塔罗，添加时间戳参数确保 URL 变化触发重新加载
            const targetPath = config.useTimestamp
                ? `${config.detailPath}?from=history&t=${Date.now()}`
                : config.detailPath;
            router.push(targetPath);
        } catch (err) {
            console.error('Navigation error:', err);
            setNavigating(null);
        }
    };

    if (!userId) return null;

    // 面板宽度
    const PANEL_WIDTH = 320; // 20rem

    return (
        <>
            {/* 遮罩层 - 仅展开时显示 */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/20 z-40 transition-opacity duration-300"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* 
                主容器
                固定在右侧，手机端避开顶部和底部导航栏
                通过 translateX 控制显示/隐藏
            */}
            <div
                className={`
                    fixed top-15 bottom-15 md:top-1/2 md:bottom-auto md:-translate-y-1/2 right-0 z-50
                    flex items-center
                    transition-transform duration-300 ease-out
                    ${className}
                `}
                style={{
                    transform: isOpen ? 'translateX(0)' : `translateX(${PANEL_WIDTH}px)`,
                    filter: 'drop-shadow(-4px 0 8px rgba(0,0,0,0.05))'
                }}
            >
                {/* 
                   把手部分 (白色/背景色)
                   使用 SVG 实现带边框的反向圆角，以适应白色背景
                */}
                <div className="group relative flex flex-col items-end z-20 cursor-pointer" onClick={handleToggle}>
                    {/* 上方反向圆角 */}
                    <svg width="16" height="16" className="relative -mb-[1px] z-30 pointer-events-none">
                        {/* 填充：右下角区域，左上为凹弧 */}
                        <path d="M 16 0 L 16 16 L 0 16 A 16 16 0 0 0 16 0 Z" className="fill-background" />
                        {/* 描边：仅描绘弧线部分 */}
                        <path d="M 0 16 A 16 16 0 0 0 16 0" className="stroke-border fill-none" strokeWidth="1" />
                    </svg>

                    {/* 按钮主体 */}
                    <button
                        className={`
                            relative
                            flex items-center justify-center
                            w-10 h-16
                            bg-background
                            rounded-l-xl
                            transition-colors duration-200
                            border-y border-l border-border
                            border-r-0
                            -mr-[1px]
                            shadow-[-4px_0_8px_rgba(0,0,0,0.02)]
                        `}
                        title={isOpen ? "收起" : "历史记录"}
                    >
                        <div className="transition-all duration-300 transform scale-100 text-yellow-500 group-hover:text-yellow-600">
                            {isOpen ? (
                                <X className="w-5 h-5" />
                            ) : (
                                <History className="w-5 h-5" />
                            )}
                        </div>
                    </button>

                    {/* 下方反向圆角 */}
                    <svg width="16" height="16" className="relative -mt-[1px] z-30 pointer-events-none">
                        {/* 填充：右上角区域，左下为凹弧 */}
                        <path d="M 16 16 L 16 0 L 0 0 A 16 16 0 0 1 16 16 Z" className="fill-background" />
                        {/* 描边：仅描绘弧线部分 */}
                        <path d="M 0 0 A 16 16 0 0 1 16 16" className="stroke-border fill-none" strokeWidth="1" />
                    </svg>
                </div>

                {/* 
                    内容面板 
                    手机端使用 h-full 自适应，桌面端使用固定高度
                */}
                <div
                    className="h-full md:h-[90vh] bg-background border-y border-l border-border rounded-l-2xl shadow-xl flex flex-col overflow-hidden relative"
                    style={{
                        width: PANEL_WIDTH,
                        marginLeft: '-1px' // 消除缝隙
                    }}
                >
                    {/* 头部 */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-background/50 backdrop-blur">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold">{config.label}</span>
                            <span className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 text-xs font-medium">
                                {items.length}
                            </span>
                        </div>
                        <Link
                            href={config.historyPath}
                            className="text-xs text-foreground-secondary hover:text-yellow-600 transition-colors flex items-center gap-1"
                        >
                            全部
                            <ChevronLeft className="w-3 h-3 rotate-180" />
                        </Link>
                    </div>

                    {/* 列表 */}
                    <div className="flex-1 overflow-y-auto p-3 scrollbar-thin scrollbar-thumb-border hover:scrollbar-thumb-foreground/20">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center h-40 gap-3">
                                <Loader2 className="w-6 h-6 animate-spin text-yellow-500" />
                                <span className="text-xs text-foreground-secondary">加载中...</span>
                            </div>
                        ) : items.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-foreground-secondary/60 gap-3">
                                <div className="p-3 rounded-full bg-foreground/5">
                                    <History className="w-6 h-6 opacity-40" />
                                </div>
                                <span className="text-sm">暂无历史记录</span>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {items.map(item => (
                                    <div
                                        key={item.id}
                                        className={`group/item relative p-3 rounded-xl bg-foreground/5 hover:bg-yellow-50 dark:hover:bg-yellow-500/10 border border-transparent hover:border-yellow-200 dark:hover:border-yellow-500/30 transition-all cursor-pointer overflow-hidden ${navigating === item.id ? 'opacity-60' : ''}`}
                                        onClick={() => !navigating && handleViewItem(item.id)}
                                    >
                                        {/* 加载指示器 */}
                                        {navigating === item.id && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-20">
                                                <Loader2 className="w-5 h-5 animate-spin text-yellow-500" />
                                            </div>
                                        )}
                                        <div className="flex items-start gap-3 relative z-10">
                                            {/* 装饰点 */}
                                            <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-yellow-400/50 group-hover/item:bg-yellow-500 transition-colors shrink-0" />

                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-sm font-medium text-foreground group-hover/item:text-yellow-700 dark:group-hover/item:text-yellow-400 truncate transition-colors flex items-center gap-2">
                                                    <span className="truncate">{item.title}</span>
                                                    {item.subType && (
                                                        <span className={`
                                                            text-[10px] px-1.5 py-0.5 rounded-full shrink-0
                                                            ${item.subType === '情侣' ? 'bg-rose-500/10 text-rose-500' :
                                                                item.subType === '商业' ? 'bg-blue-500/10 text-blue-500' :
                                                                    item.subType === '亲子' ? 'bg-amber-500/10 text-amber-500' :
                                                                        'bg-foreground/10 text-foreground-secondary'}
                                                        `}>
                                                            {item.subType}
                                                        </span>
                                                    )}
                                                </h4>
                                                <div className="flex items-center gap-2 mt-1.5">
                                                    <span className="text-[10px] text-foreground-secondary flex items-center gap-1 bg-background/50 px-1.5 py-0.5 rounded">
                                                        <Calendar className="w-2.5 h-2.5" />
                                                        {formatDate(item.createdAt)}
                                                    </span>
                                                    {item.modelName && (
                                                        <span className="text-[10px] text-foreground-secondary bg-background/50 px-1.5 py-0.5 rounded">
                                                            {item.modelName}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* 底部渐变遮罩 (提示可滚动) */}
                    <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-background to-transparent pointer-events-none" />
                </div>
            </div>
        </>
    );
}
