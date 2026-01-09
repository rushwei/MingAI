/**
 * 术语切换组件
 * 
 * 提供白话/专业/术语三层解释切换功能
 */
'use client';

import { useState, createContext, useContext, type ReactNode } from 'react';

// 解释层级类型
export type TermLevel = 'simple' | 'professional' | 'technical';

// 三层解释内容类型
export interface TermContent {
    simple: string;      // 白话：通俗易懂
    professional: string; // 专业：命理专业表述
    technical: string;    // 术语：原始术语
}

// Context 定义
interface TermLevelContextType {
    level: TermLevel;
    setLevel: (level: TermLevel) => void;
}

const TermLevelContext = createContext<TermLevelContextType | null>(null);

// Provider 组件
export function TermLevelProvider({ children }: { children: ReactNode }) {
    const [level, setLevel] = useState<TermLevel>('simple');

    return (
        <TermLevelContext.Provider value={{ level, setLevel }}>
            {children}
        </TermLevelContext.Provider>
    );
}

// Hook
export function useTermLevel() {
    const context = useContext(TermLevelContext);
    if (!context) {
        return { level: 'simple' as TermLevel, setLevel: () => { } };
    }
    return context;
}

// 层级标签
const levelLabels: Record<TermLevel, string> = {
    simple: '白话',
    professional: '专业',
    technical: '术语',
};

// 层级描述
const levelDescriptions: Record<TermLevel, string> = {
    simple: '通俗易懂的解释',
    professional: '命理专业表述',
    technical: '原始术语展示',
};

interface TermToggleProps {
    /** 紧凑模式 */
    compact?: boolean;
    /** 自定义类名 */
    className?: string;
}

/**
 * 术语层级切换器
 */
export function TermToggle({ compact = false, className = '' }: TermToggleProps) {
    const { level, setLevel } = useTermLevel();
    const levels: TermLevel[] = ['simple', 'professional', 'technical'];

    if (compact) {
        return (
            <div className={`inline-flex items-center gap-1 p-0.5 bg-background-secondary rounded-lg text-xs ${className}`}>
                {levels.map(l => (
                    <button
                        key={l}
                        onClick={() => setLevel(l)}
                        className={`px-2 py-1 rounded transition-colors ${level === l
                                ? 'bg-accent text-white'
                                : 'text-foreground-secondary hover:text-foreground'
                            }`}
                    >
                        {levelLabels[l]}
                    </button>
                ))}
            </div>
        );
    }

    return (
        <div className={`space-y-2 ${className}`}>
            <div className="text-xs text-foreground-secondary">解释模式</div>
            <div className="flex items-center gap-2">
                {levels.map(l => (
                    <button
                        key={l}
                        onClick={() => setLevel(l)}
                        className={`flex-1 py-2 rounded-lg text-sm transition-colors ${level === l
                                ? 'bg-accent text-white'
                                : 'bg-background-secondary text-foreground-secondary hover:text-foreground'
                            }`}
                    >
                        <div className="font-medium">{levelLabels[l]}</div>
                        <div className="text-xs opacity-75">{levelDescriptions[l]}</div>
                    </button>
                ))}
            </div>
        </div>
    );
}

interface TermTextProps {
    /** 三层内容 */
    content: TermContent;
    /** 自定义类名 */
    className?: string;
}

/**
 * 根据当前层级显示对应的文本
 */
export function TermText({ content, className = '' }: TermTextProps) {
    const { level } = useTermLevel();
    return <span className={className}>{content[level]}</span>;
}

// ===== 预定义的术语内容映射 =====

/** 十神三层解释 */
export const TEN_GOD_TERMS: Record<string, TermContent> = {
    '比肩': {
        simple: '朋友同事运旺，适合合作',
        professional: '比肩星临日，同辈缘和，利于合作共事',
        technical: '比肩',
    },
    '劫财': {
        simple: '注意财务支出，避免借贷',
        professional: '劫财临日，劫耗难免，守财为上',
        technical: '劫财',
    },
    '食神': {
        simple: '创意灵感丰富，适合发挥才华',
        professional: '食神生财，思路通达，创作有成',
        technical: '食神',
    },
    '伤官': {
        simple: '思维活跃但需谨言慎行',
        professional: '伤官泄秀，文思敏捷，言多必失',
        technical: '伤官',
    },
    '偏财': {
        simple: '有意外之财，可适当投资',
        professional: '偏财入命，横财可期，投资有利',
        technical: '偏财',
    },
    '正财': {
        simple: '正财运佳，努力工作有回报',
        professional: '正财临日，劳有所得，稳中求财',
        technical: '正财',
    },
    '七杀': {
        simple: '压力较大，但挑战中有机遇',
        professional: '七杀攻身，压力临门，化煞为权则贵',
        technical: '七杀',
    },
    '正官': {
        simple: '贵人运强，事业有助力',
        professional: '正官护身，贵人相助，仕途可期',
        technical: '正官',
    },
    '偏印': {
        simple: '适合学习思考，悟性提升',
        professional: '偏印生身，灵感涌现，宜修学问',
        technical: '偏印',
    },
    '正印': {
        simple: '长辈贵人相助，学业有成',
        professional: '正印生身，尊长庇佑，学业精进',
        technical: '正印',
    },
};

/** 五行三层解释 */
export const ELEMENT_TERMS: Record<string, TermContent> = {
    '木': {
        simple: '生长、发展',
        professional: '木主仁，曲直向上',
        technical: '木',
    },
    '火': {
        simple: '热情、光明',
        professional: '火主礼，炎上明亮',
        technical: '火',
    },
    '土': {
        simple: '稳定、包容',
        professional: '土主信，厚德载物',
        technical: '土',
    },
    '金': {
        simple: '坚定、决断',
        professional: '金主义，从革肃杀',
        technical: '金',
    },
    '水': {
        simple: '智慧、灵活',
        professional: '水主智，润下就低',
        technical: '水',
    },
};
