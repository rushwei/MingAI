/**
 * 八字排盘核心逻辑
 * 
 * 使用 lunar-javascript 库进行农历和八字计算
 * 
 * 服务端组件说明：
 * - 这些函数主要在服务端运行（Server Actions）
 * - 也可以在客户端使用，lunar-javascript 支持浏览器环境
 */

import {
    calculateBaziData,
    calculateBaziFiveElementsStats,
    calculateBaziLiuRiData,
    calculateBaziLiuYueData,
    calculateBaziShenShaData,
} from '@mingai/core/bazi';
import type { BaziOutput as CoreBaziOutput } from '@mingai/core';
import { calculateDayunData } from '@mingai/core/dayun';
import { renderBaziCanonicalJSON } from '@mingai/core/json';
import { renderBaziCanonicalText } from '@mingai/core/text';
import {
    TIAN_GAN as CORE_TIAN_GAN,
    DI_ZHI as CORE_DI_ZHI,
    STEM_ELEMENTS as CORE_STEM_ELEMENTS,
    ZHI_WUXING as CORE_BRANCH_ELEMENTS,
    calculateTenGod as calculateTenGodCore,
} from '@mingai/core/utils';
import { resolveChartTextDetailLevel, type ChartTextDetailLevel } from '@/lib/divination/detail-level';
import {
    HIDDEN_STEM_DETAILS,
    LIU_CHONG as CORE_LIU_CHONG,
    LIU_HE as CORE_LIU_HE,
    LIU_HE_HUA,
    SAN_HE as CORE_SAN_HE,
} from '@mingai/core/data/shensha-data';
import type {
    BaziFormData,
    BaziChart,
    FourPillars,
    FiveElementsStats,
    HiddenStemDetail,
    HeavenlyStem,
    EarthlyBranch,
    FiveElement,
    TenGod
} from '@/types';
// ===== 常量定义 =====

/** 天干列表 */
export const TIAN_GAN: readonly HeavenlyStem[] = CORE_TIAN_GAN as readonly HeavenlyStem[];

/** 地支列表 */
export const DI_ZHI: readonly EarthlyBranch[] = CORE_DI_ZHI as readonly EarthlyBranch[];

/** 天干五行对应表 */
export const STEM_ELEMENTS: Record<HeavenlyStem, FiveElement> = CORE_STEM_ELEMENTS as Record<HeavenlyStem, FiveElement>;

/** 地支五行对应表 */
export const BRANCH_ELEMENTS: Record<EarthlyBranch, FiveElement> = CORE_BRANCH_ELEMENTS as Record<EarthlyBranch, FiveElement>;

/**
 * 获取天干的五行
 */
export function getStemElement(stem: string): FiveElement | null {
    return STEM_ELEMENTS[stem as HeavenlyStem] || null;
}

/**
 * 获取地支的五行
 */
export function getBranchElement(branch: string): FiveElement | null {
    return BRANCH_ELEMENTS[branch as EarthlyBranch] || null;
}

/** 地支藏干表 */
export const HIDDEN_STEMS: Record<EarthlyBranch, HeavenlyStem[]> = Object.fromEntries(
    Object.entries(HIDDEN_STEM_DETAILS).map(([branch, stems]) => [
        branch,
        stems.map((item) => item.stem as HeavenlyStem),
    ]),
) as Record<EarthlyBranch, HeavenlyStem[]>;

// ===== 工具函数 =====

/**
 * 计算十神
 * @param dayStem 日主天干
 * @param targetStem 目标天干
 */
export function calculateTenGod(dayStem: HeavenlyStem, targetStem: HeavenlyStem): TenGod {
    return calculateTenGodCore(dayStem, targetStem) as TenGod;
}

// ===== 主要导出函数 =====

/**
 * 根据出生信息计算八字命盘
 * 
 * @param formData 表单数据
 * @returns 八字命盘对象
 */
export function calculateBazi(formData: BaziFormData): Omit<BaziChart, 'id' | 'createdAt' | 'userId'> {
    const longitude = formData.longitude;
    const coreBazi = calculateBaziData({
        gender: formData.gender,
        birthYear: formData.birthYear,
        birthMonth: formData.birthMonth,
        birthDay: formData.birthDay,
        birthHour: formData.birthHour,
        birthMinute: formData.birthMinute,
        calendarType: formData.calendarType === 'lunar' ? 'lunar' : 'solar',
        isLeapMonth: formData.isLeapMonth,
        birthPlace: formData.birthPlace,
        longitude,
    });

    const fourPillars: FourPillars = {
        year: {
            stem: coreBazi.fourPillars.year.stem as HeavenlyStem,
            branch: coreBazi.fourPillars.year.branch as EarthlyBranch,
            stemElement: STEM_ELEMENTS[coreBazi.fourPillars.year.stem as HeavenlyStem],
            branchElement: BRANCH_ELEMENTS[coreBazi.fourPillars.year.branch as EarthlyBranch],
            hiddenStems: coreBazi.fourPillars.year.hiddenStems.map((item) => item.stem as HeavenlyStem),
            hiddenStemDetails: coreBazi.fourPillars.year.hiddenStems.map((item) => ({
                stem: item.stem as HeavenlyStem,
                tenGod: item.tenGod,
                qiType: item.qiType,
            })) as HiddenStemDetail[],
            tenGod: coreBazi.fourPillars.year.tenGod as TenGod | undefined,
            naYin: coreBazi.fourPillars.year.naYin,
            diShi: coreBazi.fourPillars.year.diShi,
            shenSha: coreBazi.fourPillars.year.shenSha,
            kongWang: coreBazi.fourPillars.year.kongWang,
        },
        month: {
            stem: coreBazi.fourPillars.month.stem as HeavenlyStem,
            branch: coreBazi.fourPillars.month.branch as EarthlyBranch,
            stemElement: STEM_ELEMENTS[coreBazi.fourPillars.month.stem as HeavenlyStem],
            branchElement: BRANCH_ELEMENTS[coreBazi.fourPillars.month.branch as EarthlyBranch],
            hiddenStems: coreBazi.fourPillars.month.hiddenStems.map((item) => item.stem as HeavenlyStem),
            hiddenStemDetails: coreBazi.fourPillars.month.hiddenStems.map((item) => ({
                stem: item.stem as HeavenlyStem,
                tenGod: item.tenGod,
                qiType: item.qiType,
            })) as HiddenStemDetail[],
            tenGod: coreBazi.fourPillars.month.tenGod as TenGod | undefined,
            naYin: coreBazi.fourPillars.month.naYin,
            diShi: coreBazi.fourPillars.month.diShi,
            shenSha: coreBazi.fourPillars.month.shenSha,
            kongWang: coreBazi.fourPillars.month.kongWang,
        },
        day: {
            stem: coreBazi.fourPillars.day.stem as HeavenlyStem,
            branch: coreBazi.fourPillars.day.branch as EarthlyBranch,
            stemElement: STEM_ELEMENTS[coreBazi.fourPillars.day.stem as HeavenlyStem],
            branchElement: BRANCH_ELEMENTS[coreBazi.fourPillars.day.branch as EarthlyBranch],
            hiddenStems: coreBazi.fourPillars.day.hiddenStems.map((item) => item.stem as HeavenlyStem),
            hiddenStemDetails: coreBazi.fourPillars.day.hiddenStems.map((item) => ({
                stem: item.stem as HeavenlyStem,
                tenGod: item.tenGod,
                qiType: item.qiType,
            })) as HiddenStemDetail[],
            naYin: coreBazi.fourPillars.day.naYin,
            diShi: coreBazi.fourPillars.day.diShi,
            shenSha: coreBazi.fourPillars.day.shenSha,
            kongWang: coreBazi.fourPillars.day.kongWang,
        },
        hour: {
            stem: coreBazi.fourPillars.hour.stem as HeavenlyStem,
            branch: coreBazi.fourPillars.hour.branch as EarthlyBranch,
            stemElement: STEM_ELEMENTS[coreBazi.fourPillars.hour.stem as HeavenlyStem],
            branchElement: BRANCH_ELEMENTS[coreBazi.fourPillars.hour.branch as EarthlyBranch],
            hiddenStems: coreBazi.fourPillars.hour.hiddenStems.map((item) => item.stem as HeavenlyStem),
            hiddenStemDetails: coreBazi.fourPillars.hour.hiddenStems.map((item) => ({
                stem: item.stem as HeavenlyStem,
                tenGod: item.tenGod,
                qiType: item.qiType,
            })) as HiddenStemDetail[],
            tenGod: coreBazi.fourPillars.hour.tenGod as TenGod | undefined,
            naYin: coreBazi.fourPillars.hour.naYin,
            diShi: coreBazi.fourPillars.hour.diShi,
            shenSha: coreBazi.fourPillars.hour.shenSha,
            kongWang: coreBazi.fourPillars.hour.kongWang,
        },
    };

    // 计算五行统计
    const fiveElements = calculateBaziFiveElementsStats(coreBazi.fourPillars) as FiveElementsStats;

    // 构造返回结果
    const birthDate = `${formData.birthYear}-${String(formData.birthMonth).padStart(2, '0')}-${String(formData.birthDay).padStart(2, '0')}`;
    const birthTime = `${String(formData.birthHour).padStart(2, '0')}:${String(formData.birthMinute).padStart(2, '0')}`;

    return {
        name: formData.name,
        gender: formData.gender,
        birthDate,
        birthTime,
        birthPlace: formData.birthPlace,
        timezone: 8, // 默认东八区
        calendarType: formData.calendarType,
        isLeapMonth: formData.isLeapMonth,
        fourPillars,
        dayMaster: coreBazi.dayMaster as HeavenlyStem,
        fiveElements,
        kongWang: {
            xun: coreBazi.kongWang.xun,
            kongBranches: coreBazi.kongWang.kongZhi as EarthlyBranch[],
        },
        taiYuan: coreBazi.taiYuan,
        mingGong: coreBazi.mingGong,
        trueSolarTimeInfo: coreBazi.trueSolarTimeInfo,
        relations: coreBazi.relations,
        tianGanWuHe: coreBazi.tianGanWuHe,
        tianGanChongKe: coreBazi.tianGanChongKe,
        diZhiBanHe: coreBazi.diZhiBanHe.map((item) => ({
            ...item,
            branches: item.branches as [EarthlyBranch, EarthlyBranch],
        })),
        diZhiSanHui: coreBazi.diZhiSanHui.map((item) => ({
            ...item,
            branches: item.branches as [EarthlyBranch, EarthlyBranch, EarthlyBranch],
        })),
        isUnlocked: false,
    };
}

/**
 * 获取五行对应的颜色（用于可视化）
 */
export function getElementColor(element: FiveElement): string {
    const colors: Record<FiveElement, string> = {
        '金': '#FFD700', // 金色
        '木': '#228B22', // 森林绿
        '水': '#1E90FF', // 道奇蓝
        '火': '#FF4500', // 橙红
        '土': '#8B4513', // 马鞍棕
    };
    return colors[element];
}

/**
 * 获取五行的浅色版本（用于背景）
 */
export function getElementLightColor(element: FiveElement): string {
    const colors: Record<FiveElement, string> = {
        '金': '#FFF8DC', // 玉米丝色
        '木': '#90EE90', // 浅绿
        '水': '#ADD8E6', // 浅蓝
        '火': '#FFA07A', // 浅鲑鱼色
        '土': '#DEB887', // 实木色
    };
    return colors[element];
}

/**
 * 获取十神的解释
 */
export function getTenGodDescription(tenGod: TenGod): string {
    const descriptions: Record<TenGod, string> = {
        '比肩': '代表兄弟、朋友、同辈，体现独立自主、竞争合作',
        '劫财': '代表竞争对手、损耗，体现冲动、好胜、慷慨',
        '食神': '代表才华、福气，体现温和、聪慧、享受生活',
        '伤官': '代表创造力、叛逆，体现才华横溢但傲气较重',
        '偏财': '代表意外之财、父亲，体现人缘好、理财能力强',
        '正财': '代表稳定收入、妻子，体现勤劳务实、财运稳定',
        '七杀': '代表权威、压力，体现魄力强但容易有冲突',
        '正官': '代表事业、丈夫，体现正直守规、有领导能力',
        '偏印': '代表学问、艺术，体现思维独特、富有创意',
        '正印': '代表母亲、学历，体现温和善良、学识渊博',
    };
    return descriptions[tenGod];
}

/**
 * 获取日主性格特点
 */
export function getDayMasterDescription(dayMaster: HeavenlyStem): string {
    const descriptions: Record<HeavenlyStem, string> = {
        '甲': '如参天大树，正直大方，有领袖气质，但有时过于固执',
        '乙': '如花草藤蔓，柔韧灵活，善于适应，心思细腻',
        '丙': '如太阳光芒，热情开朗，光明磊落，影响力强',
        '丁': '如烛火星光，温柔细腻，内心敏感，富有艺术气质',
        '戊': '如高山大地，稳重可靠，包容厚道，值得信赖',
        '己': '如田园沃土，谦逊务实，善于培育，心地善良',
        '庚': '如刀剑利器，坚毅果断，正义感强，做事雷厉风行',
        '辛': '如珠宝首饰，精致细腻，追求完美，品味高雅',
        '壬': '如江河大海，智慧深邃，思维活跃，胸怀宽广',
        '癸': '如雨露甘霖，细腻敏感，善解人意，富有同情心',
    };
    return descriptions[dayMaster];
}

// ===== 专业排盘相关类型 =====

export interface DaYunInfo {
    startYear: number;
    startAge: number;
    ganZhi: string;
    gan: string;
    zhi: string;
    tenGod: string;
    branchTenGod: string;
    hiddenStems: HiddenStemDetail[];
    naYin: string;
    diShi: string;
    shenSha: string[];
    liuNian: LiuNianInfo[];  // 该大运内的流年
}

export interface LiuNianInfo {
    year: number;
    age: number;
    ganZhi: string;
    gan: string;
    zhi: string;
    tenGod: string;
    naYin: string;
    hiddenStems: HiddenStemDetail[];
    diShi: string;
    shenSha: string[];
}

export interface LiuYueInfo {
    month: number;  // 1-12月
    ganZhi: string;
    jieQi: string;  // 节气名
    startDate: string; // YYYY-MM-DD
    endDate: string; // YYYY-MM-DD
    gan: string;
    zhi: string;
    tenGod: string;
    hiddenStems: HiddenStemDetail[];
    naYin: string;
    diShi: string;
    shenSha: string[];
}

export interface LiuRiInfo {
    date: string;  // YYYY-MM-DD
    day: number;
    ganZhi: string;
    gan: string;
    zhi: string;
    tenGod: string;
    hiddenStems: HiddenStemDetail[];
    naYin: string;
    diShi: string;
    shenSha: string[];
}
/**
 * 神煞信息（按柱分类）
 */
export interface PillarShenSha {
    year: string[];   // 年柱神煞
    month: string[];  // 月柱神煞
    day: string[];    // 日柱神煞
    hour: string[];   // 时柱神煞
}

export interface ShenShaInfo {
    /** 吉神宜趋 */
    jiShen: string[];
    /** 凶神宜忌 */
    xiongSha: string[];
    /** 今日宜 */
    dayYi: string[];
    /** 今日忌 */
    dayJi: string[];
    /** 按柱分类的神煞星 */
    pillarShenSha: PillarShenSha;
}

// ===== 三合局 (San He) 配置 =====

/** 三合局类型 */
export type SanHeJu = '申子辰合水局' | '亥卯未合木局' | '寅午戌合火局' | '巳酉丑合金局';

/** 三合局配置：三个地支组成一个五行局 */
const SAN_HE_NAMES: Record<string, SanHeJu> = {
    '水局': '申子辰合水局',
    '木局': '亥卯未合木局',
    '火局': '寅午戌合火局',
    '金局': '巳酉丑合金局',
};

export const SAN_HE_TABLE: { branches: [EarthlyBranch, EarthlyBranch, EarthlyBranch]; result: FiveElement; name: SanHeJu }[] = CORE_SAN_HE.map((item) => ({
    branches: item.branches as [EarthlyBranch, EarthlyBranch, EarthlyBranch],
    result: item.element[0] as FiveElement,
    name: SAN_HE_NAMES[item.element],
}));

/** 半合表：两个地支可以形成半合 */
export const BAN_HE_TABLE: { branches: [EarthlyBranch, EarthlyBranch]; result: FiveElement; type: 'sheng' | 'mu' }[] = [
    // 生方半合（长生+帝旺）
    { branches: ['申', '子'], result: '水', type: 'sheng' },
    { branches: ['亥', '卯'], result: '木', type: 'sheng' },
    { branches: ['寅', '午'], result: '火', type: 'sheng' },
    { branches: ['巳', '酉'], result: '金', type: 'sheng' },
    // 墓方半合（帝旺+墓）
    { branches: ['子', '辰'], result: '水', type: 'mu' },
    { branches: ['卯', '未'], result: '木', type: 'mu' },
    { branches: ['午', '戌'], result: '火', type: 'mu' },
    { branches: ['酉', '丑'], result: '金', type: 'mu' },
];

/** 六合表及合化结果 */
export const LIU_HE_TABLE: Record<EarthlyBranch, { partner: EarthlyBranch; result: FiveElement }> = Object.fromEntries(
    DI_ZHI.map((branch) => [
        branch,
        {
            partner: CORE_LIU_HE[branch] as EarthlyBranch,
            result: LIU_HE_HUA[branch] as FiveElement,
        },
    ]),
) as Record<EarthlyBranch, { partner: EarthlyBranch; result: FiveElement }>;

/** 六冲表 */
export const LIU_CHONG_TABLE: Record<EarthlyBranch, EarthlyBranch> = CORE_LIU_CHONG as Record<EarthlyBranch, EarthlyBranch>;

/**
 * 计算神煞信息（含按柱分类的神煞星）
 */
export function calculateShenSha(formData: BaziFormData): ShenShaInfo {
    const shenSha = calculateBaziShenShaData({
        gender: formData.gender,
        birthYear: formData.birthYear,
        birthMonth: formData.birthMonth,
        birthDay: formData.birthDay,
        birthHour: formData.birthHour,
        birthMinute: formData.birthMinute,
        calendarType: formData.calendarType === 'lunar' ? 'lunar' : 'solar',
        isLeapMonth: formData.isLeapMonth,
        birthPlace: formData.birthPlace,
    });

    return {
        jiShen: shenSha.jiShen,
        xiongSha: shenSha.xiongSha,
        dayYi: shenSha.dayYi,
        dayJi: shenSha.dayJi,
        pillarShenSha: shenSha.pillarShenSha as PillarShenSha,
    };
}

export interface ProfessionalBaziData {
    // 纳音
    naYin: {
        year: string;
        month: string;
        day: string;
        hour: string;
    };
    // 十二长生
    diShi: {
        year: string;
        month: string;
        day: string;
        hour: string;
    };
    // 十神（天干）
    shiShenGan: {
        year: string;
        month: string;
        hour: string;
    };
    // 十神（地支藏干）
    shiShenZhi: {
        year: string[];
        month: string[];
        day: string[];
        hour: string[];
    };
    // 大运列表（每个大运包含其流年）
    daYun: DaYunInfo[];
    // 当前大运索引
    currentDaYunIndex: number;
    // 起运年龄（精确到年月日）
    startAge: number;
    // 精确起运描述（如：8年5月3天）
    startAgeDetail: string;
}

/**
 * 计算专业排盘数据
 */
export function calculateProfessionalData(
    formData: BaziFormData,
    currentYear: number = new Date().getFullYear()
): ProfessionalBaziData {
    const longitude = formData.longitude;
    const coreBazi = calculateBaziData({
        gender: formData.gender,
        birthYear: formData.birthYear,
        birthMonth: formData.birthMonth,
        birthDay: formData.birthDay,
        birthHour: formData.birthHour,
        birthMinute: formData.birthMinute,
        calendarType: formData.calendarType === 'lunar' ? 'lunar' : 'solar',
        isLeapMonth: formData.isLeapMonth,
        birthPlace: formData.birthPlace,
        longitude,
    });

    // 纳音
    const naYin = {
        year: coreBazi.fourPillars.year.naYin || '',
        month: coreBazi.fourPillars.month.naYin || '',
        day: coreBazi.fourPillars.day.naYin || '',
        hour: coreBazi.fourPillars.hour.naYin || '',
    };

    // 十二长生
    const diShi = {
        year: coreBazi.fourPillars.year.diShi || '',
        month: coreBazi.fourPillars.month.diShi || '',
        day: coreBazi.fourPillars.day.diShi || '',
        hour: coreBazi.fourPillars.hour.diShi || '',
    };

    // 十神（天干）
    const shiShenGan = {
        year: coreBazi.fourPillars.year.tenGod || '',
        month: coreBazi.fourPillars.month.tenGod || '',
        hour: coreBazi.fourPillars.hour.tenGod || '',
    };

    // 十神（地支藏干）
    const shiShenZhi = {
        year: coreBazi.fourPillars.year.hiddenStems.map((item) => item.tenGod),
        month: coreBazi.fourPillars.month.hiddenStems.map((item) => item.tenGod),
        day: coreBazi.fourPillars.day.hiddenStems.map((item) => item.tenGod),
        hour: coreBazi.fourPillars.hour.hiddenStems.map((item) => item.tenGod),
    };

    const coreDayun = calculateDayunData({
        gender: formData.gender,
        birthYear: formData.birthYear,
        birthMonth: formData.birthMonth,
        birthDay: formData.birthDay,
        birthHour: formData.birthHour,
        birthMinute: formData.birthMinute,
        calendarType: formData.calendarType === 'lunar' ? 'lunar' : 'solar',
        isLeapMonth: formData.isLeapMonth,
    });

    // 处理大运数据 - web 保留现有展示结构，但数据来源切到 core
    const daYun: DaYunInfo[] = coreDayun.list.map((dy) => ({
        startYear: dy.startYear,
        startAge: dy.startAge,
        ganZhi: dy.ganZhi,
        gan: dy.stem,
        zhi: dy.branch,
        tenGod: dy.tenGod,
        branchTenGod: dy.branchTenGod,
        hiddenStems: dy.hiddenStems.map((item) => ({
            stem: item.stem as HeavenlyStem,
            tenGod: item.tenGod,
        })) as HiddenStemDetail[],
        naYin: dy.naYin,
        diShi: dy.diShi,
        shenSha: dy.shenSha,
        liuNian: dy.liunianList.map((ln) => ({
            year: ln.year,
            age: ln.age,
            ganZhi: ln.ganZhi,
            gan: ln.gan,
            zhi: ln.zhi,
            tenGod: ln.tenGod,
            naYin: ln.nayin,
            hiddenStems: ln.hiddenStems.map((item) => ({
                stem: item.stem as HeavenlyStem,
                tenGod: item.tenGod,
            })) as HiddenStemDetail[],
            diShi: ln.diShi,
            shenSha: ln.shenSha,
        })),
    }));

    // 找到当前所在大运
    let currentDaYunIndex = daYun.findIndex((dy, index) => {
        const nextDy = daYun[index + 1];
        if (!nextDy) return dy.startYear <= currentYear;
        return dy.startYear <= currentYear && currentYear < nextDy.startYear;
    });
    if (currentDaYunIndex < 0) currentDaYunIndex = 0;

    return {
        naYin,
        diShi,
        shiShenGan,
        shiShenZhi,
        daYun,
        currentDaYunIndex,
        startAge: coreDayun.startAge,
        startAgeDetail: coreDayun.startAgeDetail,
    };
}

/**
 * 计算流月
 * 注意：立春在2月，对应寅月（正月）
 * 节气顺序：立春(寅月)->惊蛰(卯月)->清明(辰月)->立夏(巳月)->芒种(午月)->小暑(未月)
 *          ->立秋(申月)->白露(酉月)->寒露(戌月)->立冬(亥月)->大雪(子月)->小寒(丑月)
 */
export function calculateLiuYue(year: number, formData?: BaziFormData): LiuYueInfo[] {
    if (!formData) {
        return calculateBaziLiuYueData(year) as LiuYueInfo[];
    }

    const longitude = formData.longitude;
    const coreBazi = calculateBaziData({
        gender: formData.gender,
        birthYear: formData.birthYear,
        birthMonth: formData.birthMonth,
        birthDay: formData.birthDay,
        birthHour: formData.birthHour,
        birthMinute: formData.birthMinute,
        calendarType: formData.calendarType === 'lunar' ? 'lunar' : 'solar',
        isLeapMonth: formData.isLeapMonth,
        birthPlace: formData.birthPlace,
        longitude,
    });

    return calculateBaziLiuYueData(year, {
        dayStem: coreBazi.fourPillars.day.stem,
        dayBranch: coreBazi.fourPillars.day.branch,
        yearBranch: coreBazi.fourPillars.year.branch,
    }).map((item) => ({
        month: item.month,
        ganZhi: item.ganZhi,
        jieQi: item.jieQi,
        startDate: item.startDate,
        endDate: item.endDate,
        gan: item.gan || '',
        zhi: item.zhi || '',
        tenGod: item.tenGod || '',
        hiddenStems: (item.hiddenStems || []).map((hidden) => ({
            stem: hidden.stem as HeavenlyStem,
            tenGod: hidden.tenGod,
        })) as HiddenStemDetail[],
        naYin: item.naYin || '',
        diShi: item.diShi || '',
        shenSha: item.shenSha || [],
    }));
}

export function calculateLiuRi(startDate: string, endDate: string, formData?: BaziFormData): LiuRiInfo[] {
    if (!formData) {
        return calculateBaziLiuRiData(startDate, endDate) as LiuRiInfo[];
    }

    const longitude = formData.longitude;
    const coreBazi = calculateBaziData({
        gender: formData.gender,
        birthYear: formData.birthYear,
        birthMonth: formData.birthMonth,
        birthDay: formData.birthDay,
        birthHour: formData.birthHour,
        birthMinute: formData.birthMinute,
        calendarType: formData.calendarType === 'lunar' ? 'lunar' : 'solar',
        isLeapMonth: formData.isLeapMonth,
        birthPlace: formData.birthPlace,
        longitude,
    });

    return calculateBaziLiuRiData(startDate, endDate, {
        dayStem: coreBazi.fourPillars.day.stem,
        dayBranch: coreBazi.fourPillars.day.branch,
        yearBranch: coreBazi.fourPillars.year.branch,
    }).map((item) => ({
        date: item.date,
        day: item.day,
        ganZhi: item.ganZhi,
        gan: item.gan,
        zhi: item.zhi,
        tenGod: item.tenGod || '',
        hiddenStems: (item.hiddenStems || []).map((hidden) => ({
            stem: hidden.stem as HeavenlyStem,
            tenGod: hidden.tenGod,
        })) as HiddenStemDetail[],
        naYin: item.naYin || '',
        diShi: item.diShi || '',
        shenSha: item.shenSha || [],
    }));
}

function normalizeQiType(qiType?: string): '本气' | '中气' | '余气' {
    if (qiType === '中气' || qiType === '余气') return qiType;
    return '本气';
}

function toCoreBaziOutput(chart: Omit<BaziChart, 'id' | 'createdAt' | 'userId'>): CoreBaziOutput {
    return {
        gender: chart.gender,
        birthPlace: chart.birthPlace,
        dayMaster: chart.dayMaster,
        kongWang: {
            xun: chart.kongWang?.xun || '',
            kongZhi: (chart.kongWang?.kongBranches || []) as [string, string],
        },
        fourPillars: {
            year: {
                stem: chart.fourPillars.year.stem,
                branch: chart.fourPillars.year.branch,
                tenGod: chart.fourPillars.year.tenGod,
                hiddenStems: (chart.fourPillars.year.hiddenStemDetails || chart.fourPillars.year.hiddenStems.map((stem) => ({ stem, qiType: '本气' as const, tenGod: '' }))).map((item) => ({
                    stem: item.stem,
                    qiType: normalizeQiType(item.qiType),
                    tenGod: item.tenGod || '',
                })),
                naYin: chart.fourPillars.year.naYin,
                diShi: chart.fourPillars.year.diShi,
                shenSha: chart.fourPillars.year.shenSha || [],
                kongWang: chart.fourPillars.year.kongWang || { isKong: false },
            },
            month: {
                stem: chart.fourPillars.month.stem,
                branch: chart.fourPillars.month.branch,
                tenGod: chart.fourPillars.month.tenGod,
                hiddenStems: (chart.fourPillars.month.hiddenStemDetails || chart.fourPillars.month.hiddenStems.map((stem) => ({ stem, qiType: '本气' as const, tenGod: '' }))).map((item) => ({
                    stem: item.stem,
                    qiType: normalizeQiType(item.qiType),
                    tenGod: item.tenGod || '',
                })),
                naYin: chart.fourPillars.month.naYin,
                diShi: chart.fourPillars.month.diShi,
                shenSha: chart.fourPillars.month.shenSha || [],
                kongWang: chart.fourPillars.month.kongWang || { isKong: false },
            },
            day: {
                stem: chart.fourPillars.day.stem,
                branch: chart.fourPillars.day.branch,
                hiddenStems: (chart.fourPillars.day.hiddenStemDetails || chart.fourPillars.day.hiddenStems.map((stem) => ({ stem, qiType: '本气' as const, tenGod: '' }))).map((item) => ({
                    stem: item.stem,
                    qiType: normalizeQiType(item.qiType),
                    tenGod: item.tenGod || '',
                })),
                naYin: chart.fourPillars.day.naYin,
                diShi: chart.fourPillars.day.diShi,
                shenSha: chart.fourPillars.day.shenSha || [],
                kongWang: chart.fourPillars.day.kongWang || { isKong: false },
            },
            hour: {
                stem: chart.fourPillars.hour.stem,
                branch: chart.fourPillars.hour.branch,
                tenGod: chart.fourPillars.hour.tenGod,
                hiddenStems: (chart.fourPillars.hour.hiddenStemDetails || chart.fourPillars.hour.hiddenStems.map((stem) => ({ stem, qiType: '本气' as const, tenGod: '' }))).map((item) => ({
                    stem: item.stem,
                    qiType: normalizeQiType(item.qiType),
                    tenGod: item.tenGod || '',
                })),
                naYin: chart.fourPillars.hour.naYin,
                diShi: chart.fourPillars.hour.diShi,
                shenSha: chart.fourPillars.hour.shenSha || [],
                kongWang: chart.fourPillars.hour.kongWang || { isKong: false },
            },
        },
        relations: chart.relations || [],
        tianGanWuHe: (chart.tianGanWuHe || []).map((item) => ({
            ...item,
            positions: [
                item.positions[0] ?? '年支',
                item.positions[1] ?? item.positions[0] ?? '年支',
            ] as ['年支' | '月支' | '日支' | '时支', '年支' | '月支' | '日支' | '时支'],
        })),
        tianGanChongKe: (chart.tianGanChongKe || []).map((item) => ({
            ...item,
            positions: [
                item.positions[0] ?? '年支',
                item.positions[1] ?? item.positions[0] ?? '年支',
            ] as ['年支' | '月支' | '日支' | '时支', '年支' | '月支' | '日支' | '时支'],
        })),
        diZhiBanHe: chart.diZhiBanHe || [],
        diZhiSanHui: chart.diZhiSanHui || [],
        taiYuan: chart.taiYuan,
        mingGong: chart.mingGong,
        trueSolarTimeInfo: chart.trueSolarTimeInfo,
    };
}

export function buildBaziCanonicalJSON(
    chart: Omit<BaziChart, 'id' | 'createdAt' | 'userId'>
) {
    return renderBaziCanonicalJSON(toCoreBaziOutput(chart), { detailLevel: 'full' });
}

function buildCanonicalDayun(
    chart: Omit<BaziChart, 'id' | 'createdAt' | 'userId'>
) {
    try {
        const [year, month, day] = chart.birthDate.split('-').map(Number);
        const [hour, minute] = chart.birthTime.split(':').map(Number);
        return calculateDayunData({
            gender: chart.gender,
            birthYear: year,
            birthMonth: month,
            birthDay: day,
            birthHour: hour,
            birthMinute: minute || 0,
            calendarType: chart.calendarType === 'lunar' ? 'lunar' : 'solar',
            isLeapMonth: chart.isLeapMonth,
        });
    } catch {
        return undefined;
    }
}

/**
 * 生成八字命盘文字版本（用于AI分析和复制）
 * @param chart 八字命盘数据（自动计算大运）
 */
export function generateBaziChartText(
    chart: Omit<BaziChart, 'id' | 'createdAt' | 'userId'>,
    options: { detailLevel?: ChartTextDetailLevel } = {},
): string {
    const coreChart = toCoreBaziOutput(chart);
    return renderBaziCanonicalText(coreChart, {
        name: chart.name,
        dayun: buildCanonicalDayun(chart),
        detailLevel: resolveChartTextDetailLevel('bazi', options.detailLevel),
    });
}
