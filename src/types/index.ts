/**
 * MingAI 类型定义
 * 
 * 这个文件集中定义项目中使用的所有 TypeScript 类型
 * 便于类型复用和统一管理
 */

// ===== 基础类型 =====

/** 性别 */
export type Gender = 'male' | 'female';

/** 农历/公历 */
export type CalendarType = 'solar' | 'lunar';

// ===== 八字相关类型 =====

/** 天干 */
export type HeavenlyStem = '甲' | '乙' | '丙' | '丁' | '戊' | '己' | '庚' | '辛' | '壬' | '癸';

/** 地支 */
export type EarthlyBranch = '子' | '丑' | '寅' | '卯' | '辰' | '巳' | '午' | '未' | '申' | '酉' | '戌' | '亥';

/** 五行 */
export type FiveElement = '金' | '木' | '水' | '火' | '土';

/** 十神 */
export type TenGod = '比肩' | '劫财' | '食神' | '伤官' | '偏财' | '正财' | '七杀' | '正官' | '偏印' | '正印';

/** 柱（年、月、日、时） */
export interface Pillar {
    stem: HeavenlyStem;      // 天干
    branch: EarthlyBranch;   // 地支
    stemElement: FiveElement; // 天干五行
    branchElement: FiveElement; // 地支五行
    hiddenStems: HeavenlyStem[]; // 地支藏干
    tenGod?: TenGod;         // 十神（相对于日主）
}

/** 四柱 */
export interface FourPillars {
    year: Pillar;   // 年柱
    month: Pillar;  // 月柱
    day: Pillar;    // 日柱
    hour: Pillar;   // 时柱
}

/** 五行统计 */
export interface FiveElementsStats {
    金: number;
    木: number;
    水: number;
    火: number;
    土: number;
}

/** 八字命盘 */
export interface BaziChart {
    id: string;
    userId?: string;

    // 出生信息
    name: string;
    gender: Gender;
    birthDate: string;    // ISO 日期字符串
    birthTime: string;    // HH:mm 格式
    birthPlace?: string;  // 出生地点
    timezone: number;     // 时区偏移
    calendarType: CalendarType; // 农历或公历

    // 排盘结果
    fourPillars: FourPillars;
    dayMaster: HeavenlyStem;  // 日主
    fiveElements: FiveElementsStats; // 五行统计

    // 状态
    isUnlocked: boolean;  // 是否已付费解锁深度解读
    createdAt: string;
}

/** 八字输入表单数据 */
export interface BaziFormData {
    name: string;
    gender: Gender;
    birthYear: number;
    birthMonth: number;
    birthDay: number;
    birthHour: number;
    birthMinute: number;
    birthPlace?: string;
    calendarType: CalendarType;
}

// ===== AI 对话相关类型 =====

/** AI 人格类型 */
export type AIPersonality = 'master' | 'healer' | 'scholar';

/** AI 人格配置 */
export interface AIPersonalityConfig {
    id: AIPersonality;
    name: string;        // 显示名称
    title: string;       // 称号
    description: string; // 风格描述
    emoji: string;       // 图标
    systemPrompt: string; // 系统提示词
}

/** 消息角色 */
export type MessageRole = 'user' | 'assistant' | 'system';

/** 聊天消息 */
export interface ChatMessage {
    id: string;
    role: MessageRole;
    content: string;
    createdAt: string;
}

/** 对话会话 */
export interface Conversation {
    id: string;
    userId?: string;
    baziChartId?: string;
    personality: AIPersonality;
    title: string;
    messages: ChatMessage[];
    createdAt: string;
    updatedAt: string;
}

// ===== 每日运势相关类型 =====

/** 五维运势评分 */
export interface FortuneScores {
    overall: number;   // 综合运势 0-100
    career: number;    // 事业运
    love: number;      // 感情运
    wealth: number;    // 财运
    health: number;    // 健康运
}

/** 每日运势 */
export interface DailyFortune {
    id: string;
    userId?: string;
    baziChartId?: string;
    date: string;      // ISO 日期
    scores: FortuneScores;
    advice: string[];  // 今日建议
    createdAt: string;
}

// ===== 用户相关类型 =====

/** 用户 */
export interface User {
    id: string;
    phone?: string;
    wechatOpenId?: string;
    nickname?: string;
    avatarUrl?: string;
    createdAt: string;
    updatedAt: string;
}

/** 会员等级 */
export type MembershipLevel = 'free' | 'monthly' | 'yearly';

/** 用户会员信息 */
export interface UserMembership {
    userId: string;
    level: MembershipLevel;
    expiresAt?: string;
    createdAt: string;
}
