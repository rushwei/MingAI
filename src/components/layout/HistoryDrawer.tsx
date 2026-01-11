'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { History, ChevronLeft, Calendar, Loader2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

// 支持的历史类型
type HistoryType = 'tarot' | 'liuyao' | 'mbti' | 'hepan';

interface HistoryItem {
    id: string;
    title: string;
    createdAt: string;
    subType?: string;
}

interface HistoryDrawerProps {
    type: HistoryType;
    className?: string;
}

const TYPE_CONFIG: Record<HistoryType, {
    label: string;
    tableName: string;
    historyPath: string;
}> = {
    tarot: { label: '塔罗历史', tableName: 'tarot_readings', historyPath: '/tarot/history' },
    liuyao: { label: '六爻历史', tableName: 'liuyao_divinations', historyPath: '/liuyao/history' },
    mbti: { label: 'MBTI历史', tableName: 'mbti_readings', historyPath: '/mbti/history' },
    hepan: { label: '合盘历史', tableName: 'hepan_charts', historyPath: '/hepan/history' },
};

export function HistoryDrawer({ type, className = '' }: HistoryDrawerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
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
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(10); // 增加每页显示数量

        const { data, error } = await query;

        if (!error && data) {
            setItems(data.map((item: Record<string, unknown>) => {
                let title = '';
                let subType = '';

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
                    title = (item.question as string) || '塔罗占卜';
                } else if (type === 'liuyao') {
                    title = (item.question as string) || '六爻起卦';
                }
                return {
                    id: item.id as string,
                    title: title.length > 18 ? title.slice(0, 18) + '...' : title,
                    createdAt: item.created_at as string,
                    subType,
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
                固定在右侧，垂直居中
                通过 translateX 控制显示/隐藏
            */}
            <div
                className={`
                    fixed top-1/2 -translate-y-1/2 right-0 z-50
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
                    高度调整为 90vh，使其适应屏幕高度并留出上下边距
                */}
                <div
                    className="h-[90vh] bg-background border-y border-l border-border rounded-l-2xl shadow-xl flex flex-col overflow-hidden relative"
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
                                        className="group/item relative p-3 rounded-xl bg-foreground/5 hover:bg-yellow-50 dark:hover:bg-yellow-500/10 border border-transparent hover:border-yellow-200 dark:hover:border-yellow-500/30 transition-all cursor-pointer overflow-hidden"
                                        onClick={() => setIsOpen(false)}
                                    >
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
