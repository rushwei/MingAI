/**
 * MentionPopover 共享类型、常量与工具函数
 */
import type { ReactNode } from 'react';
import {
    ChevronRight, Folder, BookOpenText, BookOpen,
    Orbit, Sparkles, Gem, Dices, ScanFace, Hand, Brain,
    HeartHandshake, Heart, Briefcase, Users,
    Calendar, CalendarDays, FileText, Compass,
} from 'lucide-react';
import type { MentionType } from '@/types';

// ---- Data types ----

export type DataSourceSummary = {
    id: string;
    type: MentionType;
    name: string;
    preview: string;
    createdAt: string;
    hepanType?: 'love' | 'business' | 'family';
};

export type DataSourceLoadError = { type: MentionType; message: string };

export type KnowledgeBaseSummary = {
    id: string;
    name: string;
    description: string | null;
};

export type ViewItem = {
    key: string;
    label: string;
    hint?: string;
    icon: ReactNode;
    raw?: DataSourceSummary | KnowledgeBaseSummary;
    disabled?: boolean;
};

export type ViewModel = {
    title: string;
    items: ViewItem[];
};

export type Level = 'category' | 'subcategory' | 'type' | 'item' | 'search';

export interface MentionPopoverState {
    level: Level;
    selectedCategory?: 'data' | 'knowledge';
    selectedSubcategory?: string;
    selectedType?: string;
    activeIndex: number;
}

// ---- Config maps ----

export const DATA_SUBCATEGORY_MAP: Record<string, MentionType[]> = {
    命盘: ['bazi_chart', 'ziwei_chart'],
    占卜记录: ['tarot_reading', 'liuyao_divination', 'face_reading', 'palm_reading', 'mbti_reading', 'qimen_chart'],
    合盘记录: ['hepan_chart'],
    命理记录: ['ming_record', 'daliuren_divination'],
    运势: ['daily_fortune', 'monthly_fortune'],
};

export const DATA_SUBCATEGORY_DIVIDE = new Set(['命盘', '占卜记录', '合盘记录']);

export const TYPE_LABELS: Record<MentionType, string> = {
    knowledge_base: '知识库',
    bazi_chart: '八字命盘',
    ziwei_chart: '紫微命盘',
    tarot_reading: '塔罗占卜',
    liuyao_divination: '六爻占卜',
    face_reading: '面相分析',
    palm_reading: '手相分析',
    mbti_reading: 'MBTI 测评',
    hepan_chart: '合盘分析',
    ming_record: '命理记录',
    daily_fortune: '今日运势',
    monthly_fortune: '本月运势',
    qimen_chart: '奇门遁甲',
    daliuren_divination: '大六壬',
};

export const TYPE_ICONS: Record<MentionType, ReactNode> = {
    knowledge_base: <BookOpenText className="w-4 h-4" />,
    bazi_chart: <Orbit className="w-4 h-4" />,
    ziwei_chart: <Sparkles className="w-4 h-4" />,
    tarot_reading: <Gem className="w-4 h-4" />,
    liuyao_divination: <Dices className="w-4 h-4" />,
    face_reading: <ScanFace className="w-4 h-4" />,
    palm_reading: <Hand className="w-4 h-4" />,
    mbti_reading: <Brain className="w-4 h-4" />,
    hepan_chart: <HeartHandshake className="w-4 h-4" />,
    ming_record: <FileText className="w-4 h-4" />,
    daily_fortune: <Calendar className="w-4 h-4" />,
    monthly_fortune: <CalendarDays className="w-4 h-4" />,
    qimen_chart: <Compass className="w-4 h-4" />,
    daliuren_divination: <BookOpen className="w-4 h-4" />,
};

export const HEPAN_TYPE_LABELS: Record<string, string> = {
    love: '情侣合婚',
    business: '商业合伙',
    family: '亲子关系',
};

export const HEPAN_TYPE_ICONS: Record<string, ReactNode> = {
    love: <Heart className="w-4 h-4" />,
    business: <Briefcase className="w-4 h-4" />,
    family: <Users className="w-4 h-4" />,
};

export const FOLDER_ICON = <Folder className="w-4 h-4" />;
export const KB_ICON = <BookOpenText className="w-4 h-4" />;
export const CHEVRON_ICON = <ChevronRight className="w-4 h-4 opacity-50" />;

// ---- Helpers ----

export const getHepanSubtype = (item: DataSourceSummary): 'love' | 'business' | 'family' | null => {
    if (item.hepanType === 'love' || item.hepanType === 'business' || item.hepanType === 'family') {
        return item.hepanType;
    }
    return null;
};

export const shouldShowHint = (item: DataSourceSummary) => {
    if (item.type === 'bazi_chart' || item.type === 'ziwei_chart') return false;
    if (item.type === 'tarot_reading' || item.type === 'liuyao_divination') {
        return item.preview.startsWith('问题：');
    }
    return true;
};

export function normalizeQuery(raw: string) {
    const q = raw.trim().toLowerCase();
    if (!q) return '';
    return q
        .replace(/^(?:d|data|数|数据)\s*/i, '')
        .replace(/^(?:k|kb|knowledge|知|知识库)\s*/i, '');
}

export function getQueryHint(raw: string): 'data' | 'knowledge' | null {
    const q = raw.trim().toLowerCase();
    if (!q) return null;
    if (/^(?:d|data|数|数据)\b/i.test(q)) return 'data';
    if (/^(?:k|kb|knowledge|知|知识库)\b/i.test(q)) return 'knowledge';
    return null;
}
