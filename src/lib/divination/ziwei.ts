/**
 * 紫微斗数排盘核心逻辑
 * 
 * 使用 iztro 库进行紫微斗数排盘计算
 * 
 * @see https://github.com/SylarLong/iztro
 */

import { astro } from 'iztro';
import type { Gender, CalendarType } from '@/types';

// 使用 iztro 库返回的类型推断
type Astrolabe = ReturnType<typeof astro.bySolar>;

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

// ===== 时辰映射 =====

/**
 * 将小时转换为时辰索引（0-12）
 * 子时(23-1)=0, 丑时(1-3)=1, 寅时(3-5)=2, ...
 */
function hourToTimeIndex(hour: number): number {
    // iztro 使用 0-12 的时辰索引
    // 0: 早子时 (00:00-01:00)
    // 1: 丑时 (01:00-03:00)
    // 2: 寅时 (03:00-05:00)
    // ...
    // 12: 晚子时 (23:00-24:00)

    if (hour >= 23) return 12; // 晚子时
    if (hour >= 0 && hour < 1) return 0; // 早子时
    return Math.floor((hour + 1) / 2);
}

// ===== 主要导出函数 =====

/**
 * 计算紫微斗数命盘
 * 
 * @param formData 表单数据
 * @returns 紫微命盘数据
 */
export function calculateZiwei(formData: ZiweiFormData): ZiweiChart {
    const dateStr = `${formData.birthYear}-${formData.birthMonth}-${formData.birthDay}`;
    const hourValue = formData.birthHour + (formData.birthMinute || 0) / 60;
    const timeIndex = hourToTimeIndex(hourValue);
    const genderStr = formData.gender === 'male' ? '男' : '女';

    let astrolabe: Astrolabe;

    if (formData.calendarType === 'lunar') {
        // 农历
        astrolabe = astro.byLunar(
            dateStr,
            timeIndex,
            genderStr,
            formData.isLeapMonth ?? false, // 使用表单中的闰月设置
            true,  // fixLeap: 闰月前15天算上月，后15天算下月
            'zh-CN'
        );
    } else {
        // 阳历
        astrolabe = astro.bySolar(
            dateStr,
            timeIndex,
            genderStr,
            true,  // fixLeap: 闰月前15天算上月，后15天算下月
            'zh-CN'
        );
    }

    // 转换宫位数据
    const palaces: PalaceInfo[] = astrolabe.palaces.map((palace, index) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rawPalace = palace as any;
        return {
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
            adjStars: (rawPalace.adjectiveStars || rawPalace.adjStars || []).map((star: { name: string; brightness?: string; mutagen?: string }) => ({
                name: star.name,
                type: 'auxiliary' as const,
                brightness: star.brightness,
                mutagen: star.mutagen,
            })),
            isBodyPalace: palace.isBodyPalace,
            decadalIndex: index,
        };
    });

    // 从 iztro 获取四柱信息
    // chineseDate 格式: "癸未 庚申 戊寅 乙卯" (年 月 日 时)
    const pillars = (astrolabe.chineseDate || '').split(' ');
    const yearPillar = pillars[0] || '';
    const monthPillar = pillars[1] || '';
    const dayPillar = pillars[2] || '';
    const hourPillar = pillars[3] || '';

    // 从 rawAstrolabe 提取大限数据（用于持久化）
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const decadalData: DecadalData[] = (astrolabe.palaces as any[]).map((rawPalace, index) => {
        const decadal = rawPalace.decadal;
        return {
            palaceIndex: index,
            startAge: decadal?.range?.[0] ?? 0,
            endAge: decadal?.range?.[1] ?? 0,
            heavenlyStem: decadal?.heavenlyStem ?? palaces[index].heavenlyStem,
            earthlyBranch: decadal?.earthlyBranch ?? palaces[index].earthlyBranch,
        };
    });

    return {
        solarDate: astrolabe.solarDate,
        lunarDate: astrolabe.lunarDate,
        time: astrolabe.time,
        sign: astrolabe.sign,
        zodiac: astrolabe.zodiac,

        yearStem: yearPillar?.slice?.(0, 1) || '',
        yearBranch: yearPillar?.slice?.(1, 2) || '',
        monthStem: monthPillar?.slice?.(0, 1) || '',
        monthBranch: monthPillar?.slice?.(1, 2) || '',
        dayStem: dayPillar?.slice?.(0, 1) || '',
        dayBranch: dayPillar?.slice?.(1, 2) || '',
        hourStem: hourPillar?.slice?.(0, 1) || '',
        hourBranch: hourPillar?.slice?.(1, 2) || '',

        soul: astrolabe.soul,
        body: astrolabe.body,
        fiveElement: astrolabe.fiveElementsClass,

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type HoroscopeData = Record<string, any>;

/**
 * 获取指定日期的运限信息（使用 iztro horoscope API）
 * 需要 rawAstrolabe 存在才能计算，已保存的命盘无法使用此功能
 */
export function getHoroscope(chart: ZiweiChart, date: Date = new Date()): ZiweiHoroscope | null {
    // rawAstrolabe 不存在时无法计算运限
    if (!chart.rawAstrolabe) {
        return null;
    }

    try {
        const horoscope = chart.rawAstrolabe.horoscope(date) as HoroscopeData;
        const dec = horoscope.decadal as HoroscopeData | undefined;
        const yr = horoscope.yearly as HoroscopeData | undefined;
        const mo = horoscope.monthly as HoroscopeData | undefined;
        const dy = horoscope.daily as HoroscopeData | undefined;

        // 从宫位的 decadal.range 获取大限起止年龄（HoroscopeItem 本身没有 range）
        const decPalaceIndex = dec?.index ?? 0;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const decPalaceRaw = (chart.rawAstrolabe!.palaces[decPalaceIndex] as any)?.decadal;
        const decadal: DecadalInfo = {
            index: decPalaceIndex,
            startAge: decPalaceRaw?.range?.[0] ?? 0,
            endAge: decPalaceRaw?.range?.[1] ?? 0,
            palace: {
                index: decPalaceIndex,
                name: dec?.name ?? '',
                heavenlyStem: dec?.heavenlyStem ?? '',
                earthlyBranch: dec?.earthlyBranch ?? '',
            },
            heavenlyStem: dec?.heavenlyStem ?? '',
        };

        const yearly: FlowPeriodInfo = {
            period: String(date.getFullYear()),
            palace: {
                index: yr?.index ?? 0,
                name: yr?.name ?? '',
                heavenlyStem: yr?.heavenlyStem ?? '',
                earthlyBranch: yr?.earthlyBranch ?? '',
            },
            heavenlyStem: yr?.heavenlyStem ?? '',
            earthlyBranch: yr?.earthlyBranch ?? '',
        };

        const monthly: FlowPeriodInfo = {
            period: String(date.getMonth() + 1),
            palace: {
                index: mo?.index ?? 0,
                name: mo?.name ?? '',
                heavenlyStem: mo?.heavenlyStem ?? '',
                earthlyBranch: mo?.earthlyBranch ?? '',
            },
            heavenlyStem: mo?.heavenlyStem ?? '',
            earthlyBranch: mo?.earthlyBranch ?? '',
        };

        const daily: FlowPeriodInfo = {
            period: date.toISOString().split('T')[0],
            palace: {
                index: dy?.index ?? 0,
                name: dy?.name ?? '',
                heavenlyStem: dy?.heavenlyStem ?? '',
                earthlyBranch: dy?.earthlyBranch ?? '',
            },
            heavenlyStem: dy?.heavenlyStem ?? '',
            earthlyBranch: dy?.earthlyBranch ?? '',
        };

        return { decadal, yearly, monthly, daily };
    } catch (error) {
        console.error('获取运限信息失败:', error);
        return null;
    }
}

/**
 * 根据五行局获取大限起始年龄
 * 水二局=2岁, 木三局=3岁, 金四局=4岁, 土五局=5岁, 火六局=6岁
 */
function getFiveElementStartAge(fiveElement: string): number {
    if (fiveElement.includes('水二')) return 2;
    if (fiveElement.includes('木三')) return 3;
    if (fiveElement.includes('金四')) return 4;
    if (fiveElement.includes('土五')) return 5;
    if (fiveElement.includes('火六')) return 6;
    return 2; // 默认水二局
}

/**
 * 获取大限列表
 *
 * 优先级：decadalData > rawAstrolabe > 五行局 fallback
 * - decadalData: 保存时从 rawAstrolabe 提取的精确数据
 * - rawAstrolabe: 实时计算时的原始数据
 * - 五行局 fallback: 最后的降级方案（精度较低）
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rawPalaces = chart.rawAstrolabe.palaces as any[];

        const decadalList: DecadalInfo[] = rawPalaces.map((rawPalace, index) => {
            const decadal = rawPalace.decadal;
            const palace = chart.palaces[index];
            return {
                index,
                startAge: decadal?.range?.[0] ?? 0,
                endAge: decadal?.range?.[1] ?? 0,
                palace: {
                    index,
                    name: palace.name,
                    heavenlyStem: decadal?.heavenlyStem ?? palace.heavenlyStem,
                    earthlyBranch: decadal?.earthlyBranch ?? palace.earthlyBranch,
                },
                heavenlyStem: decadal?.heavenlyStem ?? palace.heavenlyStem,
            };
        });

        return decadalList.sort((a, b) => a.startAge - b.startAge);
    }

    // Fallback: 基于五行局计算（精度较低，无法判断顺逆排）
    // 大限从命宫所在宫位开始，而非从 palaces[0]（寅宫）开始
    const startAge = getFiveElementStartAge(chart.fiveElement);
    const soulPalaceIndex = chart.palaces.findIndex(p => p.name === '命宫');
    const soulIdx = soulPalaceIndex >= 0 ? soulPalaceIndex : 0;

    const decadalList: DecadalInfo[] = chart.palaces.map((_, i) => {
        // 默认顺行（无性别/年干信息时无法判断顺逆，按顺行处理）
        const palaceIndex = (soulIdx + i) % 12;
        const palace = chart.palaces[palaceIndex];
        const decadalAge = startAge + i * 10;
        return {
            index: palaceIndex,
            startAge: decadalAge,
            endAge: decadalAge + 9,
            palace: {
                index: palaceIndex,
                name: palace.name,
                heavenlyStem: palace.heavenlyStem,
                earthlyBranch: palace.earthlyBranch,
            },
            heavenlyStem: palace.heavenlyStem,
        };
    });

    return decadalList.sort((a, b) => a.startAge - b.startAge);
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
