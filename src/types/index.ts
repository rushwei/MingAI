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
    isLeapMonth?: boolean; // 农历闰月标记

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
    isLeapMonth?: boolean;
    isUnknownTime?: boolean;
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
    // 扩展字段（可选）
    color?: string;      // 主题色
    greeting?: string;   // 欢迎语
    traits?: string[];   // 人格特征标签
}

/** 消息角色 */
export type MessageRole = 'user' | 'assistant' | 'system';

/** 消息版本（用于编辑历史） */
export interface MessageVersion {
    userContent: string;
    aiContent: string;
    createdAt: string;
    // 编辑时被截断的后续消息（用于保留分支历史）
    subsequentMessages?: ChatMessage[];
}

/** 消息附件信息（仅用户消息） */
export interface MessageAttachment {
    fileName: string;              // 文件名（含后缀）
    webSearchEnabled?: boolean;    // 是否启用了网络搜索
}

/** 聊天消息 */
export interface ChatMessage {
    id: string;
    role: MessageRole;
    content: string;
    createdAt: string;
    model?: string;                   // 使用的模型（仅AI消息）
    reasoning?: string;               // 推理/思考过程（仅AI消息）
    // 版本支持（仅用户消息有效）
    versions?: MessageVersion[];      // 所有版本历史
    currentVersionIndex?: number;     // 当前显示的版本索引
    // 命盘信息（仅AI消息）- 记录生成该消息时使用的命盘
    chartInfo?: {
        baziName?: string;
        ziweiName?: string;
    };
    // 附件信息（仅用户消息）- 记录发送该消息时使用的附件/搜索
    attachments?: MessageAttachment;
}

/** AI 分析来源类型 */
export type ConversationSourceType =
    | 'chat'           // 普通聊天
    | 'bazi_wuxing'    // 八字五行分析
    | 'bazi_personality' // 八字人格分析  
    | 'tarot'          // 塔罗占卜
    | 'liuyao'         // 六爻占卜
    | 'mbti'           // MBTI 人格
    | 'hepan';         // 合盘分析

/** 对话会话 */
export interface Conversation {
    id: string;
    userId?: string;
    baziChartId?: string;
    ziweiChartId?: string;
    personality: AIPersonality;
    title: string;
    messages: ChatMessage[];
    createdAt: string;
    updatedAt: string;
    // 新增：AI 分析来源
    sourceType?: ConversationSourceType;
    sourceData?: Record<string, unknown>;
}

// ===== AI 模型相关类型 =====

/** AI 供应商 */
export type AIVendor = 'deepseek' | 'glm' | 'gemini' | 'qwen' | 'deepai';

/** AI 模型 ID - 动态生成，这里只定义基础结构 */
export type AIModelId = string;

/** AI 模型配置 */
export interface AIModelConfig {
    id: string;                  // 唯一 ID: deepseek-v3, deepseek-pro, etc
    name: string;                // 显示名称
    vendor: AIVendor;            // 供应商
    modelId: string;             // API 模型 ID
    apiUrl: string;              // API 端点
    apiKeyEnvVar: string;        // API Key 环境变量名
    // 推理模式支持
    supportsReasoning: boolean;  // 是否支持推理模式
    reasoningModelId?: string;   // 推理模式的模型 ID（如果不同）
    isReasoningDefault?: boolean; // 是否默认开启推理（DeepAI）
    // 默认参数
    defaultTemperature?: number;
    defaultMaxTokens?: number;
}

/** 聊天消息中的推理内容 */
export interface ReasoningContent {
    thinking: string;      // 思考过程
    duration?: number;     // 思考时长（秒）
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

// ===== Dify 增强功能相关类型 =====

/** Dify 增强模式 */
export type DifyMode = 'file' | 'web' | 'all';

/** 附件选择状态（前端使用） */
export interface AttachmentState {
    file?: File;
    webSearchEnabled: boolean;
}

/** Dify API 响应数据 */
export interface DifyResponse {
    web_content?: string;
    file_content?: string;
}

/** Dify 增强上下文（传递给 Chat API） */
export interface DifyContext {
    webContent?: string;
    fileContent?: string;
}
