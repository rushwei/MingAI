/**
 * 紫微斗数排盘核心逻辑
 *
 * web 侧保留展示/交互辅助，但主排盘真源来自 core。
 */

import {
    calculateZiweiDataWithAstrolabe,
    calculateZiweiDecadalListWithAstrolabe,
    calculateZiweiHoroscopeDataWithAstrolabe,
    createAstrolabeWithTrueSolar,
} from '@mingai/core/ziwei';
import type { ZiweiOutput as CoreZiweiOutput, ZiweiHoroscopeOutput as CoreZiweiHoroscopeOutput } from '@mingai/core';
import { renderZiweiCanonicalJSON, renderZiweiHoroscopeCanonicalJSON } from '@mingai/core/json';
import { renderZiweiCanonicalText } from '@mingai/core/text';
import type { Gender, CalendarType, TrueSolarTimeInfo } from '@/types';
import { resolveChartTextDetailLevel, type ChartTextDetailLevel } from '@/lib/divination/detail-level';

type Astrolabe = ReturnType<typeof createAstrolabeWithTrueSolar>['astrolabe'];

// ===== 类型定义 =====

/** 紫微斗数表单数据 */
export interface ZiweiFormData {
    name: string;
    gender: Gender;
    birthYear: number;
    birthMonth: number;
    birthDay: number;
    birthHour: number;
    birthMinute: number;
    calendarType: CalendarType;
    isLeapMonth?: boolean; // 是否闰月
    birthPlace?: string; // 出生地点（不参与排盘，仅用于存储）
    longitude?: number;
    isUnknownTime?: boolean; // 是否未知时辰
}

/** 星曜信息 */
export interface StarInfo {
    name: string;
    type: 'major' | 'minor' | 'auxiliary'; // 主星、辅星、杂曜
    brightness?: string; // 亮度：庙、旺、得、利、平、不、陷
    mutagen?: string; // 四化：禄、权、科、忌
    selfMutagen?: string; // 离心自化 ↓
    oppositeMutagen?: string; // 向心自化 ↑
}

/** 宫位信息 */
export interface PalaceInfo {
    name: string; // 宫名
    heavenlyStem: string; // 宫干
    earthlyBranch: string; // 宫支
    majorStars: StarInfo[]; // 主星
    minorStars: StarInfo[]; // 辅星
    adjStars: StarInfo[]; // 杂曜
    isBodyPalace: boolean; // 是否身宫
    decadalIndex: number; // 大限序号
    index?: number;
    isOriginalPalace?: boolean;
    changsheng12?: string;
    boshi12?: string;
    jiangqian12?: string;
    suiqian12?: string;
    ages?: number[];
    decadalRange?: [number, number];
    liuNianAges?: number[];
    sanFangSiZheng?: string[];
}

export interface SmallLimitEntry {
    palaceName: string;
    ages: number[];
}

export interface ScholarStarEntry {
    starName: string;
    palaceName: string;
}

/** 大限数据（用于持久化存储） */
export interface DecadalData {
    palaceIndex: number;
    startAge: number;
    endAge: number;
    heavenlyStem: string;
    earthlyBranch: string;
}

/** 紫微命盘完整数据 */
export interface ZiweiChart {
    // 基本信息
    solarDate: string;
    lunarDate: string;
    time: string;
    timeRange?: string;
    sign: string; // 星座
    zodiac: string; // 生肖
    gender?: Gender;

    // 四柱
    yearStem: string;
    yearBranch: string;
    monthStem: string;
    monthBranch: string;
    dayStem: string;
    dayBranch: string;
    hourStem: string;
    hourBranch: string;

    // 命盘信息
    soul: string; // 命主
    body: string; // 身主
    fiveElement: string; // 五行局
    earthlyBranchOfSoulPalace?: string;
    earthlyBranchOfBodyPalace?: string;
    douJun?: string;
    trueSolarTimeInfo?: TrueSolarTimeInfo;
    lifeMasterStar?: string;
    bodyMasterStar?: string;
    smallLimit?: SmallLimitEntry[];
    scholarStars?: ScholarStarEntry[];

    // 12宫位
    palaces: PalaceInfo[];

    // 大限数据（持久化存储，保存时从 rawAstrolabe 提取）
    decadalData?: DecadalData[];

    // 原始数据（供高级功能使用，保存时会被删除）
    rawAstrolabe?: Astrolabe;
}

// ===== 常量 =====

const EARTHLY_BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

const PALACE_LAYOUT_ORDER = [
    5, 6, 7, 8,    // 巳午未申 (第一行)
    4, -1, -1, 9,  // 辰-中空-酉 (第二行)
    3, -1, -1, 10, // 卯-中空-戌 (第三行)
    2, 1, 0, 11,   // 寅丑子亥 (第四行)
];

const PALACE_TEXT_ORDER = ['命宫', '兄弟', '夫妻', '子女', '财帛', '疾厄', '迁移', '交友', '官禄', '田宅', '福德', '父母'];

const BRIGHTNESS_COLORS: Record<string, string> = {
    '庙': '#FFD700', // 金色
    '旺': '#FF8C00', // 橙色
    '得': '#32CD32', // 绿色
    '利': '#4169E1', // 蓝色
    '平': '#808080', // 灰色
    '不': '#CD853F', // 棕色
    '陷': '#DC143C', // 红色
};

const MUTAGEN_COLORS: Record<string, string> = {
    '禄': '#FFD700', // 金色 - 财禄
    '权': '#FF4500', // 红色 - 权力
    '科': '#4169E1', // 蓝色 - 文曲
    '忌': '#2F4F4F', // 暗灰 - 忌讳
};

// ===== 主要导出函数 =====

/**
 * 计算紫微斗数命盘
 * 
 * @param formData 表单数据
 * @returns 紫微命盘数据
 */
export function calculateZiwei(formData: ZiweiFormData): ZiweiChart {
    const longitude = formData.longitude;
    const { output, astrolabe } = calculateZiweiDataWithAstrolabe({
        gender: formData.gender,
        birthYear: formData.birthYear,
        birthMonth: formData.birthMonth,
        birthDay: formData.birthDay,
        birthHour: formData.birthHour,
        birthMinute: formData.birthMinute,
        calendarType: formData.calendarType === 'lunar' ? 'lunar' : 'solar',
        isLeapMonth: formData.isLeapMonth,
        longitude,
    });

    const palaces: PalaceInfo[] = output.palaces.map((palace, index) => ({
        name: palace.name,
        heavenlyStem: palace.heavenlyStem,
        earthlyBranch: palace.earthlyBranch,
        majorStars: palace.majorStars.map(star => ({
            name: star.name,
            type: 'major' as const,
            brightness: star.brightness,
            mutagen: star.mutagen,
            selfMutagen: star.selfMutagen,
            oppositeMutagen: star.oppositeMutagen,
        })),
        minorStars: palace.minorStars.map(star => ({
            name: star.name,
            type: 'minor' as const,
            brightness: star.brightness,
            mutagen: star.mutagen,
            selfMutagen: star.selfMutagen,
            oppositeMutagen: star.oppositeMutagen,
        })),
        adjStars: (palace.adjStars || []).map((star) => ({
            name: star.name,
            type: 'auxiliary' as const,
            brightness: star.brightness,
            mutagen: star.mutagen,
            selfMutagen: star.selfMutagen,
            oppositeMutagen: star.oppositeMutagen,
        })),
        isBodyPalace: palace.isBodyPalace,
        decadalIndex: palace.index ?? index,
        index: palace.index,
        isOriginalPalace: palace.isOriginalPalace,
        changsheng12: palace.changsheng12,
        boshi12: palace.boshi12,
        jiangqian12: palace.jiangqian12,
        suiqian12: palace.suiqian12,
        ages: palace.ages,
        decadalRange: palace.decadalRange,
        liuNianAges: palace.liuNianAges,
        sanFangSiZheng: palace.sanFangSiZheng,
    }));

    const decadalData: DecadalData[] = output.decadalList.map((item) => {
        const palaceIndex = palaces.findIndex((palace) =>
            palace.name === item.palace.name && palace.earthlyBranch === item.palace.earthlyBranch
        );

        return {
            palaceIndex: palaceIndex >= 0 ? palaceIndex : 0,
            startAge: item.startAge,
            endAge: item.endAge,
            heavenlyStem: item.heavenlyStem,
            earthlyBranch: item.palace.earthlyBranch,
        };
    });

    return {
        solarDate: output.solarDate,
        lunarDate: output.lunarDate,
        time: output.time || astrolabe.time,
        timeRange: output.timeRange,
        sign: output.sign,
        zodiac: output.zodiac,
        gender: output.gender as Gender | undefined,

        yearStem: output.fourPillars.year.gan,
        yearBranch: output.fourPillars.year.zhi,
        monthStem: output.fourPillars.month.gan,
        monthBranch: output.fourPillars.month.zhi,
        dayStem: output.fourPillars.day.gan,
        dayBranch: output.fourPillars.day.zhi,
        hourStem: output.fourPillars.hour.gan,
        hourBranch: output.fourPillars.hour.zhi,

        soul: output.soul,
        body: output.body,
        fiveElement: output.fiveElement,
        earthlyBranchOfSoulPalace: output.earthlyBranchOfSoulPalace,
        earthlyBranchOfBodyPalace: output.earthlyBranchOfBodyPalace,
        douJun: output.douJun,
        trueSolarTimeInfo: output.trueSolarTimeInfo,
        lifeMasterStar: output.lifeMasterStar,
        bodyMasterStar: output.bodyMasterStar,
        smallLimit: output.smallLimit,
        scholarStars: output.scholarStars,

        palaces,
        decadalData,
        rawAstrolabe: astrolabe,
    };
}

/**
 * 获取宫位的传统排列顺序（用于 4x3 布局）
 * 返回索引数组，按照：
 *   [巳] [午] [未] [申]
 *   [辰]         [酉]
 *   [卯]         [戌]
 *   [寅] [丑] [子] [亥]
 */
export function getPalaceLayoutOrder(): number[] {
    return PALACE_LAYOUT_ORDER;
}

/**
 * 根据地支获取宫位索引
 */
export function getBranchIndex(branch: string): number {
    return EARTHLY_BRANCHES.indexOf(branch);
}

/**
 * 获取星曜亮度对应的颜色
 */
export function getBrightnessColor(brightness?: string): string {
    return BRIGHTNESS_COLORS[brightness || ''] || '#808080';
}

/**
 * 获取四化对应的颜色
 */
export function getMutagenColor(mutagen?: string): string {
    return MUTAGEN_COLORS[mutagen || ''] || 'transparent';
}

// ===== 运限类型定义 =====

/** 运限宫位信息 */
export interface HoroscopePalaceInfo {
    index: number;
    name: string;
    heavenlyStem: string;
    earthlyBranch: string;
    mutagen?: string[];
}

/** 大限信息 */
export interface DecadalInfo {
    index: number;
    startAge: number;
    endAge: number;
    palace: HoroscopePalaceInfo;
    heavenlyStem: string;
}

/** 流年/流月/流日信息 */
export interface FlowPeriodInfo {
    period: string;  // year/month/day value
    palace: HoroscopePalaceInfo;
    heavenlyStem: string;
    earthlyBranch: string;
}

/** 完整运限数据 */
export interface ZiweiHoroscope {
    decadal: DecadalInfo;
    yearly: FlowPeriodInfo;
    monthly: FlowPeriodInfo;
    daily: FlowPeriodInfo;
}

// ===== 运限计算函数 =====

/**
 * 获取指定日期的运限信息（复用 core shared horoscope helper）
 * 需要 rawAstrolabe 存在才能计算，已保存的命盘无法使用此功能
 */
export function getHoroscope(chart: ZiweiChart, date: Date = new Date()): ZiweiHoroscope | null {
    // rawAstrolabe 不存在时无法计算运限
    if (!chart.rawAstrolabe) {
        return null;
    }

    try {
        const horoscope = calculateZiweiHoroscopeDataWithAstrolabe(chart.rawAstrolabe, {
            targetDate: date,
        });
        const decadalRange = getDecadalList(chart).find((item) => item.index === horoscope.decadal.index);
        const decadal: DecadalInfo = {
            index: horoscope.decadal.index,
            startAge: decadalRange?.startAge ?? 0,
            endAge: decadalRange?.endAge ?? 0,
            palace: {
                index: horoscope.decadal.index,
                name: horoscope.decadal.name,
                heavenlyStem: horoscope.decadal.heavenlyStem,
                earthlyBranch: horoscope.decadal.earthlyBranch,
                mutagen: horoscope.decadal.mutagen,
            },
            heavenlyStem: horoscope.decadal.heavenlyStem,
        };

        const yearly: FlowPeriodInfo = {
            period: String(date.getFullYear()),
            palace: {
                index: horoscope.yearly.index,
                name: horoscope.yearly.name,
                heavenlyStem: horoscope.yearly.heavenlyStem,
                earthlyBranch: horoscope.yearly.earthlyBranch,
                mutagen: horoscope.yearly.mutagen,
            },
            heavenlyStem: horoscope.yearly.heavenlyStem,
            earthlyBranch: horoscope.yearly.earthlyBranch,
        };

        const monthly: FlowPeriodInfo = {
            period: String(date.getMonth() + 1),
            palace: {
                index: horoscope.monthly.index,
                name: horoscope.monthly.name,
                heavenlyStem: horoscope.monthly.heavenlyStem,
                earthlyBranch: horoscope.monthly.earthlyBranch,
                mutagen: horoscope.monthly.mutagen,
            },
            heavenlyStem: horoscope.monthly.heavenlyStem,
            earthlyBranch: horoscope.monthly.earthlyBranch,
        };

        const daily: FlowPeriodInfo = {
            period: horoscope.targetDate,
            palace: {
                index: horoscope.daily.index,
                name: horoscope.daily.name,
                heavenlyStem: horoscope.daily.heavenlyStem,
                earthlyBranch: horoscope.daily.earthlyBranch,
                mutagen: horoscope.daily.mutagen,
            },
            heavenlyStem: horoscope.daily.heavenlyStem,
            earthlyBranch: horoscope.daily.earthlyBranch,
        };

        return { decadal, yearly, monthly, daily };
    } catch (error) {
        console.error('获取运限信息失败:', error);
        return null;
    }
}

export function buildZiweiHoroscopeCanonicalJSON(chart: ZiweiChart, date: Date = new Date()) {
    if (!chart.rawAstrolabe) return null;

    try {
        const result = calculateZiweiHoroscopeDataWithAstrolabe(chart.rawAstrolabe, {
            targetDate: date,
        }) as CoreZiweiHoroscopeOutput;
        return renderZiweiHoroscopeCanonicalJSON(result);
    } catch (error) {
        console.error('构建紫微运限 JSON 失败:', error);
        return null;
    }
}

/**
 * 获取大限列表
 *
 * 优先级：decadalData > rawAstrolabe
 * - decadalData: 保存时从 rawAstrolabe 提取的精确数据
 * - rawAstrolabe: 实时计算时的原始数据
 * 缺少完整数据时直接返回空列表，避免使用低精度推算污染结果。
 */
export function getDecadalList(chart: ZiweiChart): DecadalInfo[] {
    // 优先使用 decadalData（已保存的精确数据）
    if (chart.decadalData?.length) {
        return chart.decadalData
            .map((data) => {
                const palace = chart.palaces[data.palaceIndex];
                return {
                    index: data.palaceIndex,
                    startAge: data.startAge,
                    endAge: data.endAge,
                    palace: {
                        index: data.palaceIndex,
                        name: palace?.name ?? '',
                        heavenlyStem: data.heavenlyStem,
                        earthlyBranch: data.earthlyBranch,
                    },
                    heavenlyStem: data.heavenlyStem,
                };
            })
            .sort((a, b) => a.startAge - b.startAge);
    }

    // 其次使用 rawAstrolabe（实时计算）
    if (chart.rawAstrolabe?.palaces) {
        const decadalList: DecadalInfo[] = calculateZiweiDecadalListWithAstrolabe(chart.rawAstrolabe).map((item) => {
            const palaceIndex = chart.palaces.findIndex((palace) =>
                palace.name === item.palace.name && palace.earthlyBranch === item.palace.earthlyBranch
            );
            const palace = chart.palaces[palaceIndex >= 0 ? palaceIndex : 0];
            return {
                index: palaceIndex >= 0 ? palaceIndex : 0,
                startAge: item.startAge,
                endAge: item.endAge,
                palace: {
                    index: palaceIndex >= 0 ? palaceIndex : 0,
                    name: item.palace.name,
                    heavenlyStem: item.heavenlyStem,
                    earthlyBranch: item.palace.earthlyBranch,
                },
                heavenlyStem: item.heavenlyStem || palace?.heavenlyStem || '',
            };
        });

        return decadalList.sort((a, b) => a.startAge - b.startAge);
    }

    return [];
}

// ===== 三方四正 =====

/**
 * 获取宫位的三方四正索引
 */
export function getTriangleSquare(palaceIndex: number): {
    self: number;
    opposite: number;
    triangle: number[];
    square: number[];
} {
    const normalize = (i: number) => ((i % 12) + 12) % 12;
    const self = normalize(palaceIndex);
    const opposite = normalize(palaceIndex + 6);
    const left = normalize(palaceIndex + 4);
    const right = normalize(palaceIndex - 4);

    return {
        self,
        opposite,
        triangle: [self, left, right],
        square: [self, opposite, left, right],
    };
}

/**
 * 获取宫位名称对应的索引
 */
export function getPalaceIndexByName(chart: ZiweiChart, name: string): number {
    return chart.palaces.findIndex(p => p.name === name);
}

function getTraditionalTextPalaces(chart: ZiweiChart): PalaceInfo[] {
    return [...chart.palaces].sort((a, b) => {
        const left = PALACE_TEXT_ORDER.indexOf(a.name);
        const right = PALACE_TEXT_ORDER.indexOf(b.name);
        const leftOrder = left >= 0 ? left : Number.MAX_SAFE_INTEGER;
        const rightOrder = right >= 0 ? right : Number.MAX_SAFE_INTEGER;
        if (leftOrder !== rightOrder) return leftOrder - rightOrder;
        return (a.index ?? a.decadalIndex) - (b.index ?? b.decadalIndex);
    });
}

function toCoreZiweiOutput(chart: ZiweiChart): CoreZiweiOutput {
    return {
        solarDate: chart.solarDate,
        lunarDate: chart.lunarDate,
        fourPillars: {
            year: { gan: chart.yearStem, zhi: chart.yearBranch },
            month: { gan: chart.monthStem, zhi: chart.monthBranch },
            day: { gan: chart.dayStem, zhi: chart.dayBranch },
            hour: { gan: chart.hourStem, zhi: chart.hourBranch },
        },
        soul: chart.soul,
        body: chart.body,
        fiveElement: chart.fiveElement,
        zodiac: chart.zodiac,
        sign: chart.sign,
        palaces: getTraditionalTextPalaces(chart).map((palace) => ({
            name: palace.name,
            heavenlyStem: palace.heavenlyStem,
            earthlyBranch: palace.earthlyBranch,
            isBodyPalace: palace.isBodyPalace,
            majorStars: palace.majorStars.map((star) => ({
                name: star.name,
                brightness: star.brightness,
                mutagen: star.mutagen,
                selfMutagen: star.selfMutagen,
                oppositeMutagen: star.oppositeMutagen,
            })),
            minorStars: palace.minorStars.map((star) => ({
                name: star.name,
                brightness: star.brightness,
                mutagen: star.mutagen,
                selfMutagen: star.selfMutagen,
                oppositeMutagen: star.oppositeMutagen,
            })),
            adjStars: (palace.adjStars || []).map((star) => ({
                name: star.name,
                brightness: star.brightness,
                mutagen: star.mutagen,
                selfMutagen: star.selfMutagen,
                oppositeMutagen: star.oppositeMutagen,
            })),
            index: palace.index ?? palace.decadalIndex,
            isOriginalPalace: palace.isOriginalPalace,
            changsheng12: palace.changsheng12,
            boshi12: palace.boshi12,
            jiangqian12: palace.jiangqian12,
            suiqian12: palace.suiqian12,
            ages: palace.ages,
            decadalRange: palace.decadalRange,
            liuNianAges: palace.liuNianAges,
            sanFangSiZheng: palace.sanFangSiZheng,
        })),
        decadalList: getDecadalList(chart).map((item) => ({
            startAge: item.startAge,
            endAge: item.endAge,
            heavenlyStem: item.heavenlyStem,
            palace: {
                earthlyBranch: item.palace.earthlyBranch,
                name: item.palace.name,
            },
        })),
        earthlyBranchOfSoulPalace: chart.earthlyBranchOfSoulPalace,
        earthlyBranchOfBodyPalace: chart.earthlyBranchOfBodyPalace,
        time: chart.time,
        timeRange: chart.timeRange,
        mutagenSummary: getTraditionalTextPalaces(chart).flatMap((palace) =>
            [...palace.majorStars, ...palace.minorStars]
                .filter((star) => Boolean(star.mutagen))
                .map((star) => ({
                    mutagen: star.mutagen as '禄' | '权' | '科' | '忌',
                    starName: star.name,
                    palaceName: palace.name,
                }))
        ),
        gender: chart.gender,
        douJun: chart.douJun,
        trueSolarTimeInfo: chart.trueSolarTimeInfo,
        lifeMasterStar: chart.lifeMasterStar,
        bodyMasterStar: chart.bodyMasterStar,
        smallLimit: chart.smallLimit,
        scholarStars: chart.scholarStars,
    };
}

export function buildZiweiCanonicalJSON(chart: ZiweiChart) {
    const coreOutput = toCoreZiweiOutput(chart);
    return renderZiweiCanonicalJSON(coreOutput, { detailLevel: 'full' });
}

/**
 * 生成紫微命盘文字版本（用于AI分析和复制）
 */
export function generateZiweiChartText(
    chart: ZiweiChart,
    options: { includeHoroscope?: boolean; detailLevel?: ChartTextDetailLevel } = {},
): string {
    const coreOutput = toCoreZiweiOutput(chart);
    const detailLevel = resolveChartTextDetailLevel('ziwei', options.detailLevel);

    if (!options.includeHoroscope) {
        return renderZiweiCanonicalText(coreOutput, { detailLevel });
    }

    const horoscope = getHoroscope(chart, new Date());
    if (!horoscope) {
        return renderZiweiCanonicalText(coreOutput, { detailLevel });
    }

    return renderZiweiCanonicalText(coreOutput, {
        detailLevel,
        horoscope: {
            decadal: { palaceName: horoscope.decadal.palace.name, ageRange: `${horoscope.decadal.startAge}-${horoscope.decadal.endAge}岁` },
            yearly: { palaceName: horoscope.yearly.palace.name, period: horoscope.yearly.period },
            monthly: { palaceName: horoscope.monthly.palace.name, period: horoscope.monthly.period },
            daily: { palaceName: horoscope.daily.palace.name, period: horoscope.daily.period },
        },
    });
}
