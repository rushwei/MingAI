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
import type { Gender, CalendarType } from '@/types';

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
    isUnknownTime?: boolean; // 是否未知时辰
}

/** 星曜信息 */
export interface StarInfo {
    name: string;
    type: 'major' | 'minor' | 'auxiliary'; // 主星、辅星、杂曜
    brightness?: string; // 亮度：庙、旺、得、利、平、不、陷
    mutagen?: string; // 四化：禄、权、科、忌
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
    sign: string; // 星座
    zodiac: string; // 生肖

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
    const { output, astrolabe } = calculateZiweiDataWithAstrolabe({
        gender: formData.gender,
        birthYear: formData.birthYear,
        birthMonth: formData.birthMonth,
        birthDay: formData.birthDay,
        birthHour: formData.birthHour,
        birthMinute: formData.birthMinute,
        calendarType: formData.calendarType === 'lunar' ? 'lunar' : 'solar',
        isLeapMonth: formData.isLeapMonth,
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
        })),
        minorStars: palace.minorStars.map(star => ({
            name: star.name,
            type: 'minor' as const,
            brightness: star.brightness,
            mutagen: star.mutagen,
        })),
        adjStars: (palace.adjStars || []).map((star) => ({
            name: star.name,
            type: 'auxiliary' as const,
            brightness: star.brightness,
            mutagen: star.mutagen,
        })),
        isBodyPalace: palace.isBodyPalace,
        decadalIndex: palace.index ?? index,
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
        sign: output.sign,
        zodiac: output.zodiac,

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

/**
 * 生成紫微命盘文字版本（用于AI分析和复制）
 */
export function generateZiweiChartText(chart: ZiweiChart): string {
    const lines: string[] = [];
    lines.push('【紫微斗数命盘】');
    lines.push(`阳历：${chart.solarDate}`);
    lines.push(`农历：${chart.lunarDate}`);
    lines.push(`四柱：${chart.yearStem}${chart.yearBranch} ${chart.monthStem}${chart.monthBranch} ${chart.dayStem}${chart.dayBranch} ${chart.hourStem}${chart.hourBranch}`);
    lines.push(`命主：${chart.soul}  身主：${chart.body}`);
    lines.push(`五行局：${chart.fiveElement}`);
    lines.push(`属相：${chart.zodiac}  星座：${chart.sign}`);
    lines.push('');
    lines.push('【十二宫位】');

    chart.palaces.forEach((palace) => {
        const bodyMark = palace.isBodyPalace ? '（身宫）' : '';
        const majorStars = palace.majorStars.map(s => {
            let str = s.name;
            if (s.brightness) str += s.brightness;
            if (s.mutagen) str += `化${s.mutagen}`;
            return str;
        }).join('、') || '无主星';
        const minorStars = palace.minorStars.map(s => s.name + (s.brightness || '')).join('、');
        const adjStars = palace.adjStars?.map(s => s.name).join('、');
        lines.push(`${palace.name}${bodyMark}（${palace.heavenlyStem}${palace.earthlyBranch}）`);
        lines.push(`  主星：${majorStars}`);
        if (minorStars) lines.push(`  辅星：${minorStars}`);
        if (adjStars) lines.push(`  杂曜：${adjStars}`);
    });
    lines.push('');

    // 大限列表
    const decadalList = getDecadalList(chart);
    if (decadalList.length > 0) {
        lines.push('【大限排列】');
        decadalList.forEach((d) => {
            lines.push(`${d.startAge}-${d.endAge}岁 ${d.heavenlyStem}${d.palace.earthlyBranch} ${d.palace.name}`);
        });
    }

    return lines.join('\n');
}
