/**
 * 八字排盘核心逻辑
 * 
 * 使用 lunar-javascript 库进行农历和八字计算
 * 
 * 服务端组件说明：
 * - 这些函数主要在服务端运行（Server Actions）
 * - 也可以在客户端使用，lunar-javascript 支持浏览器环境
 */

import { Solar, Lunar, DaYun, LiuNian } from 'lunar-javascript';
import type {
    BaziFormData,
    BaziChart,
    FourPillars,
    Pillar,
    FiveElementsStats,
    HeavenlyStem,
    EarthlyBranch,
    FiveElement,
    TenGod
} from '@/types';
import {
    TIAN_YI_GUI_REN, TAI_JI_GUI_REN, YANG_REN, WEN_CHANG, LU_SHEN,
    TIAN_CHU, GUO_YIN, XUE_TANG, CI_GUAN, XUE_REN, FU_XING, LIU_XIA,
    HONG_YAN, FEI_REN,
    YI_MA, TAO_HUA, HUA_GAI, JIE_SHA, WANG_SHEN, GU_CHEN, GUA_SU,
    JIANG_XING, HONG_LUAN, TIAN_XI, TIAN_YI, DIAO_KE, SANG_MEN,
    PI_TOU, ZAI_SHA, GOU_SHA, JIAO_SHA, BAI_HU,
    KUI_GANG, YIN_CHA_YANG_CUO, SHI_E_DA_BAI, BA_ZHUAN, JIN_SHEN, GU_LUAN,
} from './shensha-tables';

// ===== 常量定义 =====

/** 天干列表 */
export const TIAN_GAN: readonly HeavenlyStem[] = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];

/** 地支列表 */
export const DI_ZHI: readonly EarthlyBranch[] = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

/** 天干五行对应表 */
export const STEM_ELEMENTS: Record<HeavenlyStem, FiveElement> = {
    '甲': '木', '乙': '木',
    '丙': '火', '丁': '火',
    '戊': '土', '己': '土',
    '庚': '金', '辛': '金',
    '壬': '水', '癸': '水',
};

/** 地支五行对应表 */
export const BRANCH_ELEMENTS: Record<EarthlyBranch, FiveElement> = {
    '寅': '木', '卯': '木',
    '巳': '火', '午': '火',
    '辰': '土', '戌': '土', '丑': '土', '未': '土',
    '申': '金', '酉': '金',
    '亥': '水', '子': '水',
};

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
export const HIDDEN_STEMS: Record<EarthlyBranch, HeavenlyStem[]> = {
    '子': ['癸'],
    '丑': ['己', '癸', '辛'],
    '寅': ['甲', '丙', '戊'],
    '卯': ['乙'],
    '辰': ['戊', '乙', '癸'],
    '巳': ['丙', '庚', '戊'],
    '午': ['丁', '己'],
    '未': ['己', '丁', '乙'],
    '申': ['庚', '壬', '戊'],
    '酉': ['辛'],
    '戌': ['戊', '辛', '丁'],
    '亥': ['壬', '甲'],
};

// ===== 工具函数 =====

/**
 * 获取天干的阴阳属性
 */
function getStemYinYang(stem: HeavenlyStem): 'yang' | 'yin' {
    const yangStems: HeavenlyStem[] = ['甲', '丙', '戊', '庚', '壬'];
    return yangStems.includes(stem) ? 'yang' : 'yin';
}

/**
 * 获取五行相生相克关系
 */
function getElementRelation(from: FiveElement, to: FiveElement): 'same' | 'produce' | 'produced' | 'control' | 'controlled' {
    const produceOrder: FiveElement[] = ['木', '火', '土', '金', '水'];
    const fromIndex = produceOrder.indexOf(from);
    const toIndex = produceOrder.indexOf(to);

    if (from === to) return 'same';
    if ((fromIndex + 1) % 5 === toIndex) return 'produce'; // 我生
    if ((toIndex + 1) % 5 === fromIndex) return 'produced'; // 生我
    if ((fromIndex + 2) % 5 === toIndex) return 'control'; // 我克
    return 'controlled'; // 克我
}

/**
 * 计算十神
 * @param dayStem 日主天干
 * @param targetStem 目标天干
 */
export function calculateTenGod(dayStem: HeavenlyStem, targetStem: HeavenlyStem): TenGod {
    if (dayStem === targetStem) return '比肩';

    const dayElement = STEM_ELEMENTS[dayStem];
    const targetElement = STEM_ELEMENTS[targetStem];
    const dayYY = getStemYinYang(dayStem);
    const targetYY = getStemYinYang(targetStem);
    const sameYY = dayYY === targetYY;

    const relation = getElementRelation(dayElement, targetElement);

    switch (relation) {
        case 'same':
            return sameYY ? '比肩' : '劫财';
        case 'produce':
            return sameYY ? '食神' : '伤官';
        case 'control':
            return sameYY ? '偏财' : '正财';
        case 'controlled':
            return sameYY ? '七杀' : '正官';
        case 'produced':
            return sameYY ? '偏印' : '正印';
        default:
            return '比肩';
    }
}

/**
 * 创建柱对象
 */
function createPillar(stem: string, branch: string, dayStem?: HeavenlyStem): Pillar {
    const stemChar = stem as HeavenlyStem;
    const branchChar = branch as EarthlyBranch;

    return {
        stem: stemChar,
        branch: branchChar,
        stemElement: STEM_ELEMENTS[stemChar],
        branchElement: BRANCH_ELEMENTS[branchChar],
        hiddenStems: HIDDEN_STEMS[branchChar] || [],
        tenGod: dayStem ? calculateTenGod(dayStem, stemChar) : undefined,
    };
}

/**
 * 统计五行数量
 */
function calculateFiveElements(fourPillars: FourPillars): FiveElementsStats {
    const stats: FiveElementsStats = { 金: 0, 木: 0, 水: 0, 火: 0, 土: 0 };
    // 藏干权重：本气 > 中气 > 余气
    const HIDDEN_STEM_WEIGHTS = [0.6, 0.3, 0.1];

    const pillars = [fourPillars.year, fourPillars.month, fourPillars.day, fourPillars.hour];

    for (const pillar of pillars) {
        // 天干五行
        stats[pillar.stemElement]++;
        // 地支五行
        stats[pillar.branchElement]++;
        // 藏干五行（按本气/中气/余气分权重）
        for (let i = 0; i < pillar.hiddenStems.length; i++) {
            const weight = HIDDEN_STEM_WEIGHTS[i] ?? 0.1;
            stats[STEM_ELEMENTS[pillar.hiddenStems[i]]] += weight;
        }
    }

    // 四舍五入
    for (const key of Object.keys(stats) as FiveElement[]) {
        stats[key] = Math.round(stats[key] * 10) / 10;
    }

    return stats;
}

// ===== 主要导出函数 =====

/**
 * 根据出生信息计算八字命盘
 * 
 * @param formData 表单数据
 * @returns 八字命盘对象
 */
export function calculateBazi(formData: BaziFormData): Omit<BaziChart, 'id' | 'createdAt' | 'userId'> {
    // 创建 Solar（公历）对象
    const solar = Solar.fromYmdHms(
        formData.birthYear,
        formData.birthMonth,
        formData.birthDay,
        formData.birthHour,
        formData.birthMinute,
        0
    );
    const lunarMonth = formData.isLeapMonth ? -Math.abs(formData.birthMonth) : formData.birthMonth;

    // 如果输入的是农历，需要先转换
    let lunar: Lunar;
    if (formData.calendarType === 'lunar') {
        lunar = Lunar.fromYmdHms(
            formData.birthYear,
            lunarMonth,
            formData.birthDay,
            formData.birthHour,
            formData.birthMinute,
            0
        );
    } else {
        lunar = solar.getLunar();
    }

    // 获取八字
    const eightChar = lunar.getEightChar();

    // 获取日主（日柱天干）
    const dayStem = eightChar.getDayGan() as HeavenlyStem;

    // 构建四柱
    const fourPillars: FourPillars = {
        year: createPillar(eightChar.getYearGan(), eightChar.getYearZhi(), dayStem),
        month: createPillar(eightChar.getMonthGan(), eightChar.getMonthZhi(), dayStem),
        day: createPillar(eightChar.getDayGan(), eightChar.getDayZhi()),
        hour: createPillar(eightChar.getTimeGan(), eightChar.getTimeZhi(), dayStem),
    };

    // 日柱不计算十神（日主本身）
    fourPillars.day.tenGod = undefined;

    // 计算五行统计
    const fiveElements = calculateFiveElements(fourPillars);

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
        dayMaster: dayStem,
        fiveElements,
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
    liuNian: LiuNianInfo[];  // 该大运内的流年
}

export interface LiuNianInfo {
    year: number;
    age: number;
    ganZhi: string;
    gan: string;
    zhi: string;
}

export interface LiuYueInfo {
    month: number;  // 1-12月
    ganZhi: string;
    jieQi: string;  // 节气名
    startDate: string; // YYYY-MM-DD
    endDate: string; // YYYY-MM-DD
}

export interface LiuRiInfo {
    date: string;  // YYYY-MM-DD
    day: number;
    ganZhi: string;
    gan: string;
    zhi: string;
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

// 月德贵人规则：月支 -> 月德天干
const YUE_DE: Record<EarthlyBranch, HeavenlyStem> = {
    '寅': '丙', '午': '丙', '戌': '丙',
    '申': '壬', '子': '壬', '辰': '壬',
    '亥': '甲', '卯': '甲', '未': '甲',
    '巳': '庚', '酉': '庚', '丑': '庚',
};

// 天德贵人规则：月支 -> 天德天干/地支
const TIAN_DE: Record<EarthlyBranch, string> = {
    '寅': '丁', '卯': '申', '辰': '壬', '巳': '辛',
    '午': '亥', '未': '甲', '申': '癸', '酉': '寅',
    '戌': '丙', '亥': '乙', '子': '巳', '丑': '庚',
};

// 金舆规则：日干 -> 金舆地支
const JIN_YU: Record<HeavenlyStem, EarthlyBranch> = {
    '甲': '辰', '乙': '巳', '丙': '未', '丁': '申',
    '戊': '未', '己': '申', '庚': '戌', '辛': '亥',
    '壬': '丑', '癸': '寅',
};

// 空亡规则（旬空）：根据日柱确定空亡地支
// 甲子旬空戌亥，甲戌旬空申酉，甲申旬空午未，甲午旬空辰巳，甲辰旬空寅卯，甲寅旬空子丑
const XUN_KONG: Record<string, EarthlyBranch[]> = {
    '甲子': ['戌', '亥'], '乙丑': ['戌', '亥'], '丙寅': ['戌', '亥'], '丁卯': ['戌', '亥'], '戊辰': ['戌', '亥'], '己巳': ['戌', '亥'], '庚午': ['戌', '亥'], '辛未': ['戌', '亥'], '壬申': ['戌', '亥'], '癸酉': ['戌', '亥'],
    '甲戌': ['申', '酉'], '乙亥': ['申', '酉'], '丙子': ['申', '酉'], '丁丑': ['申', '酉'], '戊寅': ['申', '酉'], '己卯': ['申', '酉'], '庚辰': ['申', '酉'], '辛巳': ['申', '酉'], '壬午': ['申', '酉'], '癸未': ['申', '酉'],
    '甲申': ['午', '未'], '乙酉': ['午', '未'], '丙戌': ['午', '未'], '丁亥': ['午', '未'], '戊子': ['午', '未'], '己丑': ['午', '未'], '庚寅': ['午', '未'], '辛卯': ['午', '未'], '壬辰': ['午', '未'], '癸巳': ['午', '未'],
    '甲午': ['辰', '巳'], '乙未': ['辰', '巳'], '丙申': ['辰', '巳'], '丁酉': ['辰', '巳'], '戊戌': ['辰', '巳'], '己亥': ['辰', '巳'], '庚子': ['辰', '巳'], '辛丑': ['辰', '巳'], '壬寅': ['辰', '巳'], '癸卯': ['辰', '巳'],
    '甲辰': ['寅', '卯'], '乙巳': ['寅', '卯'], '丙午': ['寅', '卯'], '丁未': ['寅', '卯'], '戊申': ['寅', '卯'], '己酉': ['寅', '卯'], '庚戌': ['寅', '卯'], '辛亥': ['寅', '卯'], '壬子': ['寅', '卯'], '癸丑': ['寅', '卯'],
    '甲寅': ['子', '丑'], '乙卯': ['子', '丑'], '丙辰': ['子', '丑'], '丁巳': ['子', '丑'], '戊午': ['子', '丑'], '己未': ['子', '丑'], '庚申': ['子', '丑'], '辛酉': ['子', '丑'], '壬戌': ['子', '丑'], '癸亥': ['子', '丑'],
};

/**
 * 获取空亡信息（旬空）
 * 根据日柱确定所在旬及空亡地支
 */
export function getKongWang(dayStem: HeavenlyStem, dayBranch: EarthlyBranch): { xun: string; kongBranches: EarthlyBranch[] } {
    const dayPillar = `${dayStem}${dayBranch}`;
    const kongBranches = XUN_KONG[dayPillar] || [];
    const xunMap: Record<string, string> = {
        '戌亥': '甲子旬', '申酉': '甲戌旬', '午未': '甲申旬',
        '辰巳': '甲午旬', '寅卯': '甲辰旬', '子丑': '甲寅旬',
    };
    const xun = xunMap[kongBranches.join('')] || '';
    return { xun, kongBranches };
}

// 德秀贵人规则：月支 -> 德秀天干
const DE_XIU: Record<EarthlyBranch, HeavenlyStem[]> = {
    '寅': ['丙', '甲'], '卯': ['甲', '乙'], '辰': ['壬', '癸'], '巳': ['丙', '庚'],
    '午': ['丁', '己'], '未': ['甲', '己'], '申': ['庚', '壬'], '酉': ['辛', '庚'],
    '戌': ['丙', '戊'], '亥': ['壬', '甲'], '子': ['癸', '壬'], '丑': ['辛', '己'],
};

// 天月二德合规则
const TIAN_DE_HE: Record<EarthlyBranch, string> = {
    '寅': '壬', '卯': '癸', '辰': '丁', '巳': '丙',
    '午': '寅', '未': '己', '申': '戊', '酉': '丁',
    '戌': '辛', '亥': '庚', '子': '庚', '丑': '乙',
};

const YUE_DE_HE: Record<EarthlyBranch, HeavenlyStem> = {
    '寅': '辛', '午': '辛', '戌': '辛',
    '申': '丁', '子': '丁', '辰': '丁',
    '亥': '己', '卯': '己', '未': '己',
    '巳': '乙', '酉': '乙', '丑': '乙',
};

// ===== 三合局 (San He) 配置 =====

/** 三合局类型 */
export type SanHeJu = '申子辰合水局' | '亥卯未合木局' | '寅午戌合火局' | '巳酉丑合金局';

/** 三合局配置：三个地支组成一个五行局 */
export const SAN_HE_TABLE: { branches: [EarthlyBranch, EarthlyBranch, EarthlyBranch]; result: FiveElement; name: SanHeJu }[] = [
    { branches: ['申', '子', '辰'], result: '水', name: '申子辰合水局' },
    { branches: ['亥', '卯', '未'], result: '木', name: '亥卯未合木局' },
    { branches: ['寅', '午', '戌'], result: '火', name: '寅午戌合火局' },
    { branches: ['巳', '酉', '丑'], result: '金', name: '巳酉丑合金局' },
];

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
export const LIU_HE_TABLE: Record<EarthlyBranch, { partner: EarthlyBranch; result: FiveElement }> = {
    '子': { partner: '丑', result: '土' },
    '丑': { partner: '子', result: '土' },
    '寅': { partner: '亥', result: '木' },
    '亥': { partner: '寅', result: '木' },
    '卯': { partner: '戌', result: '火' },
    '戌': { partner: '卯', result: '火' },
    '辰': { partner: '酉', result: '金' },
    '酉': { partner: '辰', result: '金' },
    '巳': { partner: '申', result: '水' },
    '申': { partner: '巳', result: '水' },
    '午': { partner: '未', result: '土' },
    '未': { partner: '午', result: '土' },
};

/** 六冲表 */
export const LIU_CHONG_TABLE: Record<EarthlyBranch, EarthlyBranch> = {
    '子': '午', '丑': '未', '寅': '申', '卯': '酉', '辰': '戌', '巳': '亥',
    '午': '子', '未': '丑', '申': '寅', '酉': '卯', '戌': '辰', '亥': '巳',
};

// ===== 十二长生 (Twelve Life Stages) 配置 =====

/** 十二长生阶段名称 */
export type ShiErChangSheng =
    | '长生' | '沐浴' | '冠带' | '临官'
    | '帝旺' | '衰' | '病' | '死'
    | '墓' | '绝' | '胎' | '养';

/** 十二长生顺序 */
export const CHANG_SHENG_ORDER: ShiErChangSheng[] = [
    '长生', '沐浴', '冠带', '临官', '帝旺', '衰',
    '病', '死', '墓', '绝', '胎', '养'
];

/** 十二长生标签描述 */
export const CHANG_SHENG_LABELS: Record<ShiErChangSheng, string> = {
    '长生': '如人初生，生机勃勃，有发展潜力',
    '沐浴': '如人沐浴，不稳定，易有波折',
    '冠带': '如人成年，渐入佳境，开始有成就',
    '临官': '如人当官，权力渐盛，事业上升',
    '帝旺': '如帝王之旺，鼎盛之极，最为有力',
    '衰': '盛极而衰，力量开始减弱',
    '病': '如人生病，力量衰弱，需要调养',
    '死': '气息将绝，力量极弱',
    '墓': '入墓收藏，力量被封存',
    '绝': '气息已绝，最为无力',
    '胎': '如人受胎，开始孕育新生',
    '养': '如人养育，等待时机出生'
};

/**
 * 五行十二长生表
 * 
 * 阳干顺行，阴干逆行
 * 木长生在亥、火长生在寅、金长生在巳、水长生在申、土长生在申（或寅，有争议）
 */
export const WUXING_CHANG_SHENG_TABLE: Record<FiveElement, Record<EarthlyBranch, ShiErChangSheng>> = {
    '木': {
        '亥': '长生', '子': '沐浴', '丑': '冠带', '寅': '临官',
        '卯': '帝旺', '辰': '衰', '巳': '病', '午': '死',
        '未': '墓', '申': '绝', '酉': '胎', '戌': '养'
    },
    '火': {
        '寅': '长生', '卯': '沐浴', '辰': '冠带', '巳': '临官',
        '午': '帝旺', '未': '衰', '申': '病', '酉': '死',
        '戌': '墓', '亥': '绝', '子': '胎', '丑': '养'
    },
    '土': {
        // 土寄火，随火论
        '寅': '长生', '卯': '沐浴', '辰': '冠带', '巳': '临官',
        '午': '帝旺', '未': '衰', '申': '病', '酉': '死',
        '戌': '墓', '亥': '绝', '子': '胎', '丑': '养'
    },
    '金': {
        '巳': '长生', '午': '沐浴', '未': '冠带', '申': '临官',
        '酉': '帝旺', '戌': '衰', '亥': '病', '子': '死',
        '丑': '墓', '寅': '绝', '卯': '胎', '辰': '养'
    },
    '水': {
        '申': '长生', '酉': '沐浴', '戌': '冠带', '亥': '临官',
        '子': '帝旺', '丑': '衰', '寅': '病', '卯': '死',
        '辰': '墓', '巳': '绝', '午': '胎', '未': '养'
    }
};

/** 十二长生强弱分类 */
export const CHANG_SHENG_STRENGTH: Record<ShiErChangSheng, 'strong' | 'medium' | 'weak'> = {
    '长生': 'strong',
    '沐浴': 'medium',
    '冠带': 'strong',
    '临官': 'strong',
    '帝旺': 'strong',
    '衰': 'medium',
    '病': 'weak',
    '死': 'weak',
    '墓': 'weak',
    '绝': 'weak',
    '胎': 'medium',
    '养': 'medium'
};

// ===== 三合局与十二长生计算函数 =====

/**
 * 获取五行在某地支的十二长生状态
 */
export function getChangSheng(wuXing: FiveElement, diZhi: EarthlyBranch): ShiErChangSheng {
    return WUXING_CHANG_SHENG_TABLE[wuXing][diZhi];
}

/**
 * 获取十二长生的强弱等级
 */
export function getChangShengStrength(changSheng: ShiErChangSheng): 'strong' | 'medium' | 'weak' {
    return CHANG_SHENG_STRENGTH[changSheng];
}

/**
 * 分析四柱中的三合局
 */
export function analyzeFourPillarsSanHe(
    yearBranch: EarthlyBranch,
    monthBranch: EarthlyBranch,
    dayBranch: EarthlyBranch,
    hourBranch: EarthlyBranch
): { hasFullSanHe: boolean; fullSanHe?: { name: SanHeJu; result: FiveElement }; banHe: { branches: [EarthlyBranch, EarthlyBranch]; result: FiveElement; type: 'sheng' | 'mu' }[] } {
    const branches = [yearBranch, monthBranch, dayBranch, hourBranch];

    // 检查完整三合
    for (const sanHe of SAN_HE_TABLE) {
        const [b1, b2, b3] = sanHe.branches;
        if (branches.includes(b1) && branches.includes(b2) && branches.includes(b3)) {
            return {
                hasFullSanHe: true,
                fullSanHe: { name: sanHe.name, result: sanHe.result },
                banHe: []
            };
        }
    }

    // 检查半合
    const banHeList: { branches: [EarthlyBranch, EarthlyBranch]; result: FiveElement; type: 'sheng' | 'mu' }[] = [];
    for (const banHe of BAN_HE_TABLE) {
        const [b1, b2] = banHe.branches;
        if (branches.includes(b1) && branches.includes(b2)) {
            banHeList.push({
                branches: banHe.branches,
                result: banHe.result,
                type: banHe.type
            });
        }
    }

    return {
        hasFullSanHe: false,
        banHe: banHeList
    };
}

/**
 * 分析四柱中的六合关系
 */
export function analyzeFourPillarsLiuHe(
    yearBranch: EarthlyBranch,
    monthBranch: EarthlyBranch,
    dayBranch: EarthlyBranch,
    hourBranch: EarthlyBranch
): { pairs: { zhi1: EarthlyBranch; zhi2: EarthlyBranch; result: FiveElement }[] } {
    const branches: [string, EarthlyBranch][] = [
        ['年', yearBranch],
        ['月', monthBranch],
        ['日', dayBranch],
        ['时', hourBranch]
    ];

    const pairs: { zhi1: EarthlyBranch; zhi2: EarthlyBranch; result: FiveElement }[] = [];

    for (let i = 0; i < branches.length; i++) {
        for (let j = i + 1; j < branches.length; j++) {
            const [, zhi1] = branches[i];
            const [, zhi2] = branches[j];
            if (LIU_HE_TABLE[zhi1]?.partner === zhi2) {
                pairs.push({
                    zhi1,
                    zhi2,
                    result: LIU_HE_TABLE[zhi1].result
                });
            }
        }
    }

    return { pairs };
}

/**
 * 分析四柱中的六冲关系
 */
export function analyzeFourPillarsLiuChong(
    yearBranch: EarthlyBranch,
    monthBranch: EarthlyBranch,
    dayBranch: EarthlyBranch,
    hourBranch: EarthlyBranch
): { pairs: { zhi1: EarthlyBranch; zhi2: EarthlyBranch; position1: string; position2: string }[] } {
    const branches: [string, EarthlyBranch][] = [
        ['年', yearBranch],
        ['月', monthBranch],
        ['日', dayBranch],
        ['时', hourBranch]
    ];

    const pairs: { zhi1: EarthlyBranch; zhi2: EarthlyBranch; position1: string; position2: string }[] = [];

    for (let i = 0; i < branches.length; i++) {
        for (let j = i + 1; j < branches.length; j++) {
            const [pos1, zhi1] = branches[i];
            const [pos2, zhi2] = branches[j];
            if (LIU_CHONG_TABLE[zhi1] === zhi2) {
                pairs.push({
                    zhi1,
                    zhi2,
                    position1: pos1,
                    position2: pos2
                });
            }
        }
    }

    return { pairs };
}

/**
 * 计算日主在月令的十二长生状态
 */
export function calculateDayMasterChangSheng(
    dayMaster: HeavenlyStem,
    monthBranch: EarthlyBranch
): { stage: ShiErChangSheng; strength: 'strong' | 'medium' | 'weak'; description: string } {
    // 使用 getDiShi 而非 getChangSheng，因为 getDiShi 正确处理了阴干逆行
    const stage = getDiShi(dayMaster, monthBranch) as ShiErChangSheng;
    const strength = getChangShengStrength(stage);
    const description = CHANG_SHENG_LABELS[stage];

    return { stage, strength, description };
}


/**
 * 计算神煞信息（含按柱分类的神煞星）
 */
export function calculateShenSha(formData: BaziFormData): ShenShaInfo {
    const solar = Solar.fromYmdHms(
        formData.birthYear,
        formData.birthMonth,
        formData.birthDay,
        formData.birthHour,
        formData.birthMinute,
        0
    );
    const lunarMonth = formData.isLeapMonth ? -Math.abs(formData.birthMonth) : formData.birthMonth;

    let lunar: Lunar;
    if (formData.calendarType === 'lunar') {
        lunar = Lunar.fromYmdHms(
            formData.birthYear,
            lunarMonth,
            formData.birthDay,
            formData.birthHour,
            formData.birthMinute,
            0
        );
    } else {
        lunar = solar.getLunar();
    }

    // 获取四柱（使用 EightChar 类的方法）
    const eightChar = lunar.getEightChar();

    const yearStem = eightChar.getYearGan() as HeavenlyStem;
    const yearBranch = eightChar.getYearZhi() as EarthlyBranch;
    const monthBranch = eightChar.getMonthZhi() as EarthlyBranch;
    const dayStem = eightChar.getDayGan() as HeavenlyStem;
    const dayBranch = eightChar.getDayZhi() as EarthlyBranch;
    const hourStem = eightChar.getTimeGan() as HeavenlyStem;
    const hourBranch = eightChar.getTimeZhi() as EarthlyBranch;

    // 计算各柱神煞
    const pillarShenSha: PillarShenSha = { year: [], month: [], day: [], hour: [] };

    // 天乙贵人（日干查）
    const guiRenBranches = TIAN_YI_GUI_REN[dayStem] || [];
    if (guiRenBranches.includes(yearBranch)) pillarShenSha.year.push('天乙贵人');
    if (guiRenBranches.includes(monthBranch)) pillarShenSha.month.push('天乙贵人');
    if (guiRenBranches.includes(dayBranch)) pillarShenSha.day.push('天乙贵人');
    if (guiRenBranches.includes(hourBranch)) pillarShenSha.hour.push('天乙贵人');

    // 太极贵人（日干查）
    const taiJiBranches = TAI_JI_GUI_REN[dayStem] || [];
    if (taiJiBranches.includes(yearBranch)) pillarShenSha.year.push('太极贵人');
    if (taiJiBranches.includes(monthBranch)) pillarShenSha.month.push('太极贵人');
    if (taiJiBranches.includes(dayBranch)) pillarShenSha.day.push('太极贵人');
    if (taiJiBranches.includes(hourBranch)) pillarShenSha.hour.push('太极贵人');

    // 禄神（日干查）
    const luShenBranch = LU_SHEN[dayStem];
    if (luShenBranch === yearBranch) pillarShenSha.year.push('禄神');
    if (luShenBranch === monthBranch) pillarShenSha.month.push('禄神');
    if (luShenBranch === dayBranch) pillarShenSha.day.push('禄神');
    if (luShenBranch === hourBranch) pillarShenSha.hour.push('禄神');

    // 羊刃（日干查）
    const yangRenBranch = YANG_REN[dayStem];
    if (yangRenBranch === yearBranch) pillarShenSha.year.push('羊刃');
    if (yangRenBranch === monthBranch) pillarShenSha.month.push('羊刃');
    if (yangRenBranch === dayBranch) pillarShenSha.day.push('羊刃');
    if (yangRenBranch === hourBranch) pillarShenSha.hour.push('羊刃');

    // 文昌（日干查）
    const wenChangBranch = WEN_CHANG[dayStem];
    if (wenChangBranch === yearBranch) pillarShenSha.year.push('文昌');
    if (wenChangBranch === monthBranch) pillarShenSha.month.push('文昌');
    if (wenChangBranch === dayBranch) pillarShenSha.day.push('文昌');
    if (wenChangBranch === hourBranch) pillarShenSha.hour.push('文昌');

    // 金舆（日干查）
    const jinYuBranch = JIN_YU[dayStem];
    if (jinYuBranch === yearBranch) pillarShenSha.year.push('金舆');
    if (jinYuBranch === monthBranch) pillarShenSha.month.push('金舆');
    if (jinYuBranch === dayBranch) pillarShenSha.day.push('金舆');
    if (jinYuBranch === hourBranch) pillarShenSha.hour.push('金舆');

    // 驿马（日支查）
    const yiMaBranch = YI_MA[dayBranch];
    if (yiMaBranch === yearBranch) pillarShenSha.year.push('驿马');
    if (yiMaBranch === monthBranch) pillarShenSha.month.push('驿马');
    if (yiMaBranch === hourBranch) pillarShenSha.hour.push('驿马');

    // 桃花（日支查）
    const taoHuaBranch = TAO_HUA[dayBranch];
    if (taoHuaBranch === yearBranch) pillarShenSha.year.push('桃花');
    if (taoHuaBranch === monthBranch) pillarShenSha.month.push('桃花');
    if (taoHuaBranch === hourBranch) pillarShenSha.hour.push('桃花');

    // 华盖（日支查）
    const huaGaiBranch = HUA_GAI[dayBranch];
    if (huaGaiBranch === yearBranch) pillarShenSha.year.push('华盖');
    if (huaGaiBranch === monthBranch) pillarShenSha.month.push('华盖');
    if (huaGaiBranch === dayBranch) pillarShenSha.day.push('华盖');
    if (huaGaiBranch === hourBranch) pillarShenSha.hour.push('华盖');

    // 劫煞（日支查）
    const jiEShaBranch = JIE_SHA[dayBranch];
    if (jiEShaBranch === yearBranch) pillarShenSha.year.push('劫煞');
    if (jiEShaBranch === monthBranch) pillarShenSha.month.push('劫煞');
    if (jiEShaBranch === hourBranch) pillarShenSha.hour.push('劫煞');

    // 亡神（日支查）
    const wangShenBranch = WANG_SHEN[dayBranch];
    if (wangShenBranch === yearBranch) pillarShenSha.year.push('亡神');
    if (wangShenBranch === monthBranch) pillarShenSha.month.push('亡神');
    if (wangShenBranch === hourBranch) pillarShenSha.hour.push('亡神');

    // 月德贵人（月支查年干、日干、时干）
    const yueDeStem = YUE_DE[monthBranch];
    if (yueDeStem === yearStem) pillarShenSha.year.push('月德贵人');
    if (yueDeStem === dayStem) pillarShenSha.day.push('月德贵人');
    if (yueDeStem === hourStem) pillarShenSha.hour.push('月德贵人');

    // 天德贵人（月支查）
    const tianDeChar = TIAN_DE[monthBranch];
    if (tianDeChar === yearStem || tianDeChar === yearBranch) pillarShenSha.year.push('天德贵人');
    if (tianDeChar === dayStem || tianDeChar === dayBranch) pillarShenSha.day.push('天德贵人');
    if (tianDeChar === hourStem || tianDeChar === hourBranch) pillarShenSha.hour.push('天德贵人');

    // 孤辰（年支查）
    const guChenBranch = GU_CHEN[yearBranch];
    if (guChenBranch === monthBranch) pillarShenSha.month.push('孤辰');
    if (guChenBranch === dayBranch) pillarShenSha.day.push('孤辰');
    if (guChenBranch === hourBranch) pillarShenSha.hour.push('孤辰');

    // 寡宿（年支查）
    const guaSuBranch = GUA_SU[yearBranch];
    if (guaSuBranch === monthBranch) pillarShenSha.month.push('寡宿');
    if (guaSuBranch === dayBranch) pillarShenSha.day.push('寡宿');
    if (guaSuBranch === hourBranch) pillarShenSha.hour.push('寡宿');

    // 将星（年支查）
    const jiangXingBranch = JIANG_XING[yearBranch];
    if (jiangXingBranch === monthBranch) pillarShenSha.month.push('将星');
    if (jiangXingBranch === dayBranch) pillarShenSha.day.push('将星');
    if (jiangXingBranch === hourBranch) pillarShenSha.hour.push('将星');

    // 天厨（日干查）
    const tianChuBranch = TIAN_CHU[dayStem];
    if (tianChuBranch === yearBranch) pillarShenSha.year.push('天厨');
    if (tianChuBranch === monthBranch) pillarShenSha.month.push('天厨');
    if (tianChuBranch === hourBranch) pillarShenSha.hour.push('天厨');

    // 国印贵人（日干查）
    const guoYinBranch = GUO_YIN[dayStem];
    if (guoYinBranch === yearBranch) pillarShenSha.year.push('国印贵人');
    if (guoYinBranch === monthBranch) pillarShenSha.month.push('国印贵人');
    if (guoYinBranch === dayBranch) pillarShenSha.day.push('国印贵人');
    if (guoYinBranch === hourBranch) pillarShenSha.hour.push('国印贵人');

    // 学堂（年干查）
    const xueTangBranch = XUE_TANG[yearStem];
    if (xueTangBranch === monthBranch) pillarShenSha.month.push('学堂');
    if (xueTangBranch === dayBranch) pillarShenSha.day.push('学堂');
    if (xueTangBranch === hourBranch) pillarShenSha.hour.push('学堂');

    // 词馆（日干查）
    const ciGuanBranch = CI_GUAN[dayStem];
    if (ciGuanBranch === yearBranch) pillarShenSha.year.push('词馆');
    if (ciGuanBranch === monthBranch) pillarShenSha.month.push('词馆');
    if (ciGuanBranch === hourBranch) pillarShenSha.hour.push('词馆');

    // 红鸾（年支查）
    const hongLuanBranch = HONG_LUAN[yearBranch];
    if (hongLuanBranch === monthBranch) pillarShenSha.month.push('红鸾');
    if (hongLuanBranch === dayBranch) pillarShenSha.day.push('红鸾');
    if (hongLuanBranch === hourBranch) pillarShenSha.hour.push('红鸾');

    // 天喜（年支查）
    const tianXiBranch = TIAN_XI[yearBranch];
    if (tianXiBranch === monthBranch) pillarShenSha.month.push('天喜');
    if (tianXiBranch === dayBranch) pillarShenSha.day.push('天喜');
    if (tianXiBranch === hourBranch) pillarShenSha.hour.push('天喜');

    // 天医（月支查）
    const tianYiBranch = TIAN_YI[monthBranch];
    if (tianYiBranch === yearBranch) pillarShenSha.year.push('天医');
    if (tianYiBranch === dayBranch) pillarShenSha.day.push('天医');
    if (tianYiBranch === hourBranch) pillarShenSha.hour.push('天医');

    // 吊客（年支查）
    const diaoKeBranch = DIAO_KE[yearBranch];
    if (diaoKeBranch === monthBranch) pillarShenSha.month.push('吊客');
    if (diaoKeBranch === dayBranch) pillarShenSha.day.push('吊客');
    if (diaoKeBranch === hourBranch) pillarShenSha.hour.push('吊客');

    // 丧门（年支查）
    const sangMenBranch = SANG_MEN[yearBranch];
    if (sangMenBranch === monthBranch) pillarShenSha.month.push('丧门');
    if (sangMenBranch === dayBranch) pillarShenSha.day.push('丧门');
    if (sangMenBranch === hourBranch) pillarShenSha.hour.push('丧门');

    // 空亡（日柱查，遇空地支）
    const dayPillar = `${dayStem}${dayBranch}`;
    const kongWangBranches = XUN_KONG[dayPillar] || [];
    if (kongWangBranches.includes(yearBranch)) pillarShenSha.year.push('空亡');
    if (kongWangBranches.includes(monthBranch)) pillarShenSha.month.push('空亡');
    if (kongWangBranches.includes(hourBranch)) pillarShenSha.hour.push('空亡');

    // 魁罡（日柱）
    if (KUI_GANG.includes(dayPillar)) {
        pillarShenSha.day.push('魁罡');
    }

    // 阴差阳错（日柱）
    if (YIN_CHA_YANG_CUO.includes(dayPillar)) {
        pillarShenSha.day.push('阴差阳错');
    }

    // 十恶大败（日柱）
    if (SHI_E_DA_BAI.includes(dayPillar)) {
        pillarShenSha.day.push('十恶大败');
    }

    // 血刃（日支查）
    const xueRenBranch = XUE_REN[dayBranch];
    if (xueRenBranch === yearBranch) pillarShenSha.year.push('血刃');
    if (xueRenBranch === monthBranch) pillarShenSha.month.push('血刃');
    if (xueRenBranch === dayBranch) pillarShenSha.day.push('血刃');
    if (xueRenBranch === hourBranch) pillarShenSha.hour.push('血刃');

    // 披头/披麻（年支查）
    const piTouBranch = PI_TOU[yearBranch];
    if (piTouBranch === monthBranch) pillarShenSha.month.push('披头');
    if (piTouBranch === dayBranch) pillarShenSha.day.push('披头');
    if (piTouBranch === hourBranch) pillarShenSha.hour.push('披头');

    // 福星贵人（日干查）
    const fuXingBranch = FU_XING[dayStem];
    if (fuXingBranch === yearBranch) pillarShenSha.year.push('福星贵人');
    if (fuXingBranch === monthBranch) pillarShenSha.month.push('福星贵人');
    if (fuXingBranch === dayBranch) pillarShenSha.day.push('福星贵人');
    if (fuXingBranch === hourBranch) pillarShenSha.hour.push('福星贵人');

    // 天罗地网（基于地支关系）
    // 辰见巳为天罗
    if (yearBranch === '辰' && (monthBranch === '巳' || dayBranch === '巳' || hourBranch === '巳')) {
        pillarShenSha.year.push('天罗');
    }
    if (monthBranch === '辰' && (yearBranch === '巳' || dayBranch === '巳' || hourBranch === '巳')) {
        pillarShenSha.month.push('天罗');
    }
    // 戌见亥为地网
    if (yearBranch === '戌' && (monthBranch === '亥' || dayBranch === '亥' || hourBranch === '亥')) {
        pillarShenSha.year.push('地网');
    }
    if (monthBranch === '戌' && (yearBranch === '亥' || dayBranch === '亥' || hourBranch === '亥')) {
        pillarShenSha.month.push('地网');
    }

    // 灾煞（年支查）
    const zaiShaBranch = ZAI_SHA[yearBranch];
    if (zaiShaBranch === monthBranch) pillarShenSha.month.push('灾煞');
    if (zaiShaBranch === dayBranch) pillarShenSha.day.push('灾煞');
    if (zaiShaBranch === hourBranch) pillarShenSha.hour.push('灾煞');

    // 流霞（日干查）
    const liuXiaBranch = LIU_XIA[dayStem];
    if (liuXiaBranch === yearBranch) pillarShenSha.year.push('流霞');
    if (liuXiaBranch === monthBranch) pillarShenSha.month.push('流霞');
    if (liuXiaBranch === dayBranch) pillarShenSha.day.push('流霞');
    if (liuXiaBranch === hourBranch) pillarShenSha.hour.push('流霞');

    // 红艳煞（日干查）
    const hongYanBranch = HONG_YAN[dayStem];
    if (hongYanBranch === yearBranch) pillarShenSha.year.push('红艳煞');
    if (hongYanBranch === monthBranch) pillarShenSha.month.push('红艳煞');
    if (hongYanBranch === dayBranch) pillarShenSha.day.push('红艳煞');
    if (hongYanBranch === hourBranch) pillarShenSha.hour.push('红艳煞');

    // 八专日（日柱）
    if (BA_ZHUAN.includes(dayPillar)) {
        pillarShenSha.day.push('八专');
    }

    // 金神（日柱）
    if (JIN_SHEN.includes(dayPillar)) {
        pillarShenSha.day.push('金神');
    }

    // 孤鸾煞（日柱）
    if (GU_LUAN.includes(dayPillar)) {
        pillarShenSha.day.push('孤鸾煞');
    }

    // 德秀贵人（月支查日干）
    const deXiuStems = DE_XIU[monthBranch] || [];
    if (deXiuStems.includes(dayStem)) pillarShenSha.day.push('德秀贵人');
    if (deXiuStems.includes(hourStem)) pillarShenSha.hour.push('德秀贵人');

    // 勾煞（年支查）
    const gouShaBranch = GOU_SHA[yearBranch];
    if (gouShaBranch === monthBranch) pillarShenSha.month.push('勾煞');
    if (gouShaBranch === dayBranch) pillarShenSha.day.push('勾煞');
    if (gouShaBranch === hourBranch) pillarShenSha.hour.push('勾煞');

    // 绞煞（年支查）
    const jiaoShaBranch = JIAO_SHA[yearBranch];
    if (jiaoShaBranch === monthBranch) pillarShenSha.month.push('绞煞');
    if (jiaoShaBranch === dayBranch) pillarShenSha.day.push('绞煞');
    if (jiaoShaBranch === hourBranch) pillarShenSha.hour.push('绞煞');

    // 白虎煞（月支查）
    const baiHuBranch = BAI_HU[monthBranch];
    if (baiHuBranch === yearBranch) pillarShenSha.year.push('白虎');
    if (baiHuBranch === dayBranch) pillarShenSha.day.push('白虎');
    if (baiHuBranch === hourBranch) pillarShenSha.hour.push('白虎');

    // 飞刃（日干查）
    const feiRenBranch = FEI_REN[dayStem];
    if (feiRenBranch === yearBranch) pillarShenSha.year.push('飞刃');
    if (feiRenBranch === monthBranch) pillarShenSha.month.push('飞刃');
    if (feiRenBranch === dayBranch) pillarShenSha.day.push('飞刃');
    if (feiRenBranch === hourBranch) pillarShenSha.hour.push('飞刃');

    // 天德合（月支查）
    const tianDeHeChar = TIAN_DE_HE[monthBranch];
    if (tianDeHeChar === yearStem || tianDeHeChar === yearBranch) pillarShenSha.year.push('天德合');
    if (tianDeHeChar === dayStem || tianDeHeChar === dayBranch) pillarShenSha.day.push('天德合');
    if (tianDeHeChar === hourStem || tianDeHeChar === hourBranch) pillarShenSha.hour.push('天德合');

    // 月德合（月支查）
    const yueDeHeStem = YUE_DE_HE[monthBranch];
    if (yueDeHeStem === yearStem) pillarShenSha.year.push('月德合');
    if (yueDeHeStem === dayStem) pillarShenSha.day.push('月德合');
    if (yueDeHeStem === hourStem) pillarShenSha.hour.push('月德合');

    // 获取日级别神煞数据
    let jiShen: string[] = [];
    let xiongSha: string[] = [];
    let dayYi: string[] = [];
    let dayJi: string[] = [];

    try { jiShen = lunar.getDayJiShen() || []; } catch { /* ignore */ }
    try { xiongSha = lunar.getDayXiongSha() || []; } catch { /* ignore */ }
    try { dayYi = lunar.getDayYi() || []; } catch { /* ignore */ }
    try { dayJi = lunar.getDayJi() || []; } catch { /* ignore */ }

    return {
        jiShen,
        xiongSha,
        dayYi,
        dayJi,
        pillarShenSha,
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
    const solar = Solar.fromYmdHms(
        formData.birthYear,
        formData.birthMonth,
        formData.birthDay,
        formData.birthHour,
        formData.birthMinute,
        0
    );
    const lunarMonth = formData.isLeapMonth ? -Math.abs(formData.birthMonth) : formData.birthMonth;

    let lunar: Lunar;
    if (formData.calendarType === 'lunar') {
        lunar = Lunar.fromYmdHms(
            formData.birthYear,
            lunarMonth,
            formData.birthDay,
            formData.birthHour,
            formData.birthMinute,
            0
        );
    } else {
        lunar = solar.getLunar();
    }

    const eightChar = lunar.getEightChar();
    const gender = formData.gender === 'male' ? 1 : 0;

    const yun = eightChar.getYun(gender);
    const daYunList = yun.getDaYun();

    // 纳音
    const naYin = {
        year: eightChar.getYearNaYin(),
        month: eightChar.getMonthNaYin(),
        day: eightChar.getDayNaYin(),
        hour: eightChar.getTimeNaYin(),
    };

    // 十二长生
    const diShi = {
        year: eightChar.getYearDiShi(),
        month: eightChar.getMonthDiShi(),
        day: eightChar.getDayDiShi(),
        hour: eightChar.getTimeDiShi(),
    };

    // 十神（天干）
    const shiShenGan = {
        year: eightChar.getYearShiShenGan(),
        month: eightChar.getMonthShiShenGan(),
        hour: eightChar.getTimeShiShenGan(),
    };

    // 十神（地支藏干）
    const shiShenZhi = {
        year: eightChar.getYearShiShenZhi() || [],
        month: eightChar.getMonthShiShenZhi() || [],
        day: eightChar.getDayShiShenZhi() || [],
        hour: eightChar.getTimeShiShenZhi() || [],
    };

    // 处理大运数据 - 每个大运包含其流年
    const daYun: DaYunInfo[] = daYunList.slice(0, 10).map((dy: DaYun) => {
        const ganZhi = dy.getGanZhi();
        const liuNianList = dy.getLiuNian();

        return {
            startYear: dy.getStartYear(),
            startAge: dy.getStartAge(),
            ganZhi: ganZhi || '',
            gan: ganZhi ? ganZhi[0] : '',
            zhi: ganZhi ? ganZhi[1] : '',
            liuNian: liuNianList.map((ln: LiuNian) => ({
                year: ln.getYear(),
                age: ln.getAge(),
                ganZhi: ln.getGanZhi(),
                gan: ln.getGanZhi()[0],
                zhi: ln.getGanZhi()[1],
            })),
        };
    }).filter((d: DaYunInfo) => d.ganZhi); // 过滤掉空的大运

    // 找到当前所在大运
    let currentDaYunIndex = daYun.findIndex((dy, index) => {
        const nextDy = daYun[index + 1];
        if (!nextDy) return dy.startYear <= currentYear;
        return dy.startYear <= currentYear && currentYear < nextDy.startYear;
    });
    if (currentDaYunIndex < 0) currentDaYunIndex = 0;

    // 计算精确起运时间
    let startAgeDetail = yun.getStartYear() + '岁起运';
    try {
        const startSolar = yun.getStartSolar();
        if (startSolar) {
            const birthDate = new Date(
                formData.birthYear,
                formData.birthMonth - 1,
                formData.birthDay,
                formData.birthHour,
                formData.birthMinute
            );
            const qiyunDate = new Date(
                startSolar.getYear(),
                startSolar.getMonth() - 1,
                startSolar.getDay(),
                startSolar.getHour(),
                startSolar.getMinute()
            );
            const diffDays = Math.floor((qiyunDate.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24));
            const years = Math.floor(diffDays / 365);
            const remainingDays = diffDays % 365;
            const months = Math.floor(remainingDays / 30);
            const days = remainingDays % 30;
            startAgeDetail = `${years}年${months}月${days}天起运`;
        }
    } catch {
        // 无法获取精确时间，使用默认
    }

    return {
        naYin,
        diShi,
        shiShenGan,
        shiShenZhi,
        daYun,
        currentDaYunIndex,
        startAge: yun.getStartYear(),
        startAgeDetail,
    };
}

/**
 * 计算流月
 * 注意：立春在2月，对应寅月（正月）
 * 节气顺序：立春(寅月)->惊蛰(卯月)->清明(辰月)->立夏(巳月)->芒种(午月)->小暑(未月)
 *          ->立秋(申月)->白露(酉月)->寒露(戌月)->立冬(亥月)->大雪(子月)->小寒(丑月)
 */
export function calculateLiuYue(year: number): LiuYueInfo[] {
    const jieQiConfig = [
        { month: 2, jieQi: '立春' },   // 寅月
        { month: 3, jieQi: '惊蛰' },   // 卯月
        { month: 4, jieQi: '清明' },   // 辰月
        { month: 5, jieQi: '立夏' },   // 巳月
        { month: 6, jieQi: '芒种' },   // 午月
        { month: 7, jieQi: '小暑' },   // 未月
        { month: 8, jieQi: '立秋' },   // 申月
        { month: 9, jieQi: '白露' },   // 酉月
        { month: 10, jieQi: '寒露' },  // 戌月
        { month: 11, jieQi: '立冬' },  // 亥月
        { month: 12, jieQi: '大雪' },  // 子月
        { month: 1, jieQi: '小寒' },   // 丑月（下一年1月）
    ];

    const liuYue: LiuYueInfo[] = [];
    const jieQiTable = Solar.fromYmd(year, 6, 15).getLunar().getJieQiTable();
    const nextYearJieQiTable = Solar.fromYmd(year + 1, 6, 15).getLunar().getJieQiTable();

    const formatYmd = (date: Date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    const toDate = (solar: Solar) => new Date(solar.getYear(), solar.getMonth() - 1, solar.getDay());

    for (let i = 0; i < 12; i++) {
        const config = jieQiConfig[i];
        const segmentYear = config.month === 1 ? year + 1 : year;
        const startTable = segmentYear === year ? jieQiTable : nextYearJieQiTable;
        const startSolar = startTable[config.jieQi] || Solar.fromYmd(segmentYear, config.month, 15);

        const nextConfig = jieQiConfig[(i + 1) % 12];
        const nextSegmentYear = config.month === 1
            ? year + 1
            : (nextConfig.month === 1 ? year + 1 : year);
        const nextTable = nextSegmentYear === year ? jieQiTable : nextYearJieQiTable;
        const nextStartSolar = nextTable[nextConfig.jieQi] || Solar.fromYmd(nextSegmentYear, nextConfig.month, 15);

        const startDate = toDate(startSolar);
        const endDate = new Date(toDate(nextStartSolar).getTime() - 24 * 60 * 60 * 1000);

        const monthLunar = startSolar.getLunar();

        liuYue.push({
            month: i + 1,  // 1-12月（正月到腊月）
            ganZhi: monthLunar.getMonthInGanZhiExact(),
            jieQi: config.jieQi,
            startDate: formatYmd(startDate),
            endDate: formatYmd(endDate),
        });
    }

    return liuYue;
}

export function calculateLiuRi(startDate: string, endDate: string): LiuRiInfo[] {
    const [sy, sm, sd] = startDate.split('-').map(Number);
    const [ey, em, ed] = endDate.split('-').map(Number);
    const start = new Date(sy, sm - 1, sd);
    const end = new Date(ey, em - 1, ed);
    const days: LiuRiInfo[] = [];

    for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
        const year = cursor.getFullYear();
        const month = cursor.getMonth() + 1;
        const day = cursor.getDate();
        const solar = Solar.fromYmd(year, month, day);
        const lunar = solar.getLunar();
        const ganZhi = lunar.getDayInGanZhi();

        days.push({
            date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
            day,
            ganZhi,
            gan: ganZhi[0],
            zhi: ganZhi[1],
        });
    }


    return days;
}

// ==========================================
// 运势柱辅助函数 (NaYin, DiShi, ShenSha)
// ==========================================

// 纳音表
const NA_YIN_MAP: Record<string, string> = {
    '甲子': '海中金', '乙丑': '海中金', '丙寅': '炉中火', '丁卯': '炉中火',
    '戊辰': '大林木', '己巳': '大林木', '庚午': '路旁土', '辛未': '路旁土',
    '壬申': '剑锋金', '癸酉': '剑锋金', '甲戌': '山头火', '乙亥': '山头火',
    '丙子': '涧下水', '丁丑': '涧下水', '戊寅': '城头土', '己卯': '城头土',
    '庚辰': '白蜡金', '辛巳': '白蜡金', '壬午': '杨柳木', '癸未': '杨柳木',
    '甲申': '泉中水', '乙酉': '泉中水', '丙戌': '屋上土', '丁亥': '屋上土',
    '戊子': '霹雳火', '己丑': '霹雳火', '庚寅': '松柏木', '辛卯': '松柏木',
    '壬辰': '长流水', '癸巳': '长流水', '甲午': '沙中金', '乙未': '沙中金',
    '丙申': '山下火', '丁酉': '山下火', '戊戌': '平地木', '己亥': '平地木',
    '庚子': '壁上土', '辛丑': '壁上土', '壬寅': '金箔金', '癸卯': '金箔金',
    '甲辰': '覆灯火', '乙巳': '覆灯火', '丙午': '天河水', '丁未': '天河水',
    '戊申': '大驿土', '己酉': '大驿土', '庚戌': '钗钏金', '辛亥': '钗钏金',
    '壬子': '桑柘木', '癸丑': '桑柘木', '甲寅': '大溪水', '乙卯': '大溪水',
    '丙辰': '沙中土', '丁巳': '沙中土', '戊午': '天上火', '己未': '天上火',
    '庚申': '石榴木', '辛酉': '石榴木', '壬戌': '大海水', '癸亥': '大海水',
};

/**
 * 获取纳音
 */
export function getNaYin(ganZhi: string): string {
    return NA_YIN_MAP[ganZhi] || '';
}

// 十二长生顺序
const DI_SHI_ORDER = ['长生', '沐浴', '冠带', '临官', '帝旺', '衰', '病', '死', '墓', '绝', '胎', '养'];
const BRANCHES_SEQ: EarthlyBranch[] = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

/**
 * 获取十二长生（星运）
 * @param dayStem 日主天干
 * @param branch 地支
 */
export function getDiShi(dayStem: HeavenlyStem, branch: EarthlyBranch): string {
    let startBranchIndex: number = 0;
    let forward: boolean = true;

    switch (dayStem) {
        case '甲': startBranchIndex = 11; break; // 亥
        case '乙': startBranchIndex = 6; forward = false; break; // 午
        case '丙':
        case '戊': startBranchIndex = 2; break; // 寅
        case '丁':
        case '己': startBranchIndex = 9; forward = false; break; // 酉
        case '庚': startBranchIndex = 5; break; // 巳
        case '辛': startBranchIndex = 0; forward = false; break; // 子
        case '壬': startBranchIndex = 8; break; // 申
        case '癸': startBranchIndex = 3; forward = false; break; // 卯
    }

    const targetBranchIndex = BRANCHES_SEQ.indexOf(branch);
    if (targetBranchIndex === -1) return '';

    let diff = 0;
    if (forward) {
        diff = targetBranchIndex - startBranchIndex;
        if (diff < 0) diff += 12;
    } else {
        diff = startBranchIndex - targetBranchIndex;
        if (diff < 0) diff += 12;
    }

    return DI_SHI_ORDER[diff];
}

/**
 * 计算运势柱的神煞
 * @param columnBranch 运势柱地支
 * @param dayStem 日主天干
 * @param dayBranch 日支
 * @param yearBranch 年支
 */
export function calculateFortuneShenSha(
    columnBranch: EarthlyBranch,
    dayStem: HeavenlyStem,
    dayBranch: EarthlyBranch,
    yearBranch: EarthlyBranch
): string[] {
    const shenSha: string[] = [];

    // 日干查
    if ((TIAN_YI_GUI_REN[dayStem] || []).includes(columnBranch)) shenSha.push('天乙贵人');
    if ((TAI_JI_GUI_REN[dayStem] || []).includes(columnBranch)) shenSha.push('太极贵人');
    if (LU_SHEN[dayStem] === columnBranch) shenSha.push('禄神');
    if (YANG_REN[dayStem] === columnBranch) shenSha.push('羊刃');
    if (WEN_CHANG[dayStem] === columnBranch) shenSha.push('文昌');
    if (JIN_YU[dayStem] === columnBranch) shenSha.push('金舆');
    if (TIAN_CHU[dayStem] === columnBranch) shenSha.push('天厨');
    if (GUO_YIN[dayStem] === columnBranch) shenSha.push('国印');
    if (CI_GUAN[dayStem] === columnBranch) shenSha.push('词馆');
    if (LIU_XIA[dayStem] === columnBranch) shenSha.push('流霞');
    if (HONG_YAN[dayStem] === columnBranch) shenSha.push('红艳');
    if (FEI_REN[dayStem] === columnBranch) shenSha.push('飞刃');
    if (FU_XING[dayStem] === columnBranch) shenSha.push('福星');

    // 日支查
    if (YI_MA[dayBranch] === columnBranch) shenSha.push('驿马');
    if (TAO_HUA[dayBranch] === columnBranch) shenSha.push('桃花');
    if (HUA_GAI[dayBranch] === columnBranch) shenSha.push('华盖');
    if (JIE_SHA[dayBranch] === columnBranch) shenSha.push('劫煞');
    if (WANG_SHEN[dayBranch] === columnBranch) shenSha.push('亡神');

    // 年支查
    if (GU_CHEN[yearBranch] === columnBranch) shenSha.push('孤辰');
    if (GUA_SU[yearBranch] === columnBranch) shenSha.push('寡宿');
    if (JIANG_XING[yearBranch] === columnBranch) shenSha.push('将星');
    if (HONG_LUAN[yearBranch] === columnBranch) shenSha.push('红鸾');
    if (TIAN_XI[yearBranch] === columnBranch) shenSha.push('天喜');
    if (DIAO_KE[yearBranch] === columnBranch) shenSha.push('吊客');
    if (SANG_MEN[yearBranch] === columnBranch) shenSha.push('丧门');
    if (ZAI_SHA[yearBranch] === columnBranch) shenSha.push('灾煞');

    return shenSha;
}

/**
 * 生成八字命盘文字版本（用于AI分析和复制）
 * @param chart 八字命盘数据（自动计算大运）
 */
export function generateBaziChartText(
    chart: Omit<BaziChart, 'id' | 'createdAt' | 'userId'>
): string {
    const lines: string[] = [];
    lines.push('【八字命盘】');
    lines.push(`姓名：${chart.name}`);
    lines.push(`性别：${chart.gender === 'male' ? '男' : '女'}`);
    // 只采用四柱八字，不采用出生日期
    // lines.push(`出生日期：${chart.birthDate} ${chart.birthTime}`);
    if (chart.birthPlace) {
        lines.push(`出生地点：${chart.birthPlace}`);
    }
    lines.push('');

    // 四柱信息
    const { fourPillars, dayMaster } = chart;
    lines.push('【四柱八字】');
    lines.push(`四柱：${fourPillars.year.stem}${fourPillars.year.branch}年 ${fourPillars.month.stem}${fourPillars.month.branch}月 ${fourPillars.day.stem}${fourPillars.day.branch}日 ${fourPillars.hour.stem}${fourPillars.hour.branch}时`);
    lines.push(`日主：${dayMaster}`);
    lines.push('');

    // 四柱详解
    lines.push('【四柱详解】');
    const yearTenGod = fourPillars.year.tenGod ? `（${fourPillars.year.tenGod}）` : '';
    const yearHidden = fourPillars.year.hiddenStems.length ? `藏干：${fourPillars.year.hiddenStems.join('、')}` : '';
    lines.push(`年柱：${fourPillars.year.stem}${fourPillars.year.branch}${yearTenGod} ${yearHidden}`);

    const monthTenGod = fourPillars.month.tenGod ? `（${fourPillars.month.tenGod}）` : '';
    const monthHidden = fourPillars.month.hiddenStems.length ? `藏干：${fourPillars.month.hiddenStems.join('、')}` : '';
    lines.push(`月柱：${fourPillars.month.stem}${fourPillars.month.branch}${monthTenGod} ${monthHidden}`);

    const dayHidden = fourPillars.day.hiddenStems.length ? `藏干：${fourPillars.day.hiddenStems.join('、')}` : '';
    lines.push(`日柱：${fourPillars.day.stem}${fourPillars.day.branch}（日主） ${dayHidden}`);

    const hourTenGod = fourPillars.hour.tenGod ? `（${fourPillars.hour.tenGod}）` : '';
    const hourHidden = fourPillars.hour.hiddenStems.length ? `藏干：${fourPillars.hour.hiddenStems.join('、')}` : '';
    lines.push(`时柱：${fourPillars.hour.stem}${fourPillars.hour.branch}${hourTenGod} ${hourHidden}`);
    lines.push('');

    // 停止输入这些状态
    // 日主十二长生状态
    // const dayMasterChangSheng = calculateDayMasterChangSheng(
    //     dayMaster,
    //     fourPillars.month.branch
    // );
    // lines.push('【日主状态】');
    // lines.push(`日主${dayMaster}在月令${fourPillars.month.branch}：${dayMasterChangSheng.stage}（${dayMasterChangSheng.strength === 'strong' ? '旺相' : dayMasterChangSheng.strength === 'weak' ? '衰弱' : '中等'}）`);
    // lines.push(`状态描述：${dayMasterChangSheng.description}`);
    // lines.push('');

    // // 地支关系分析
    // lines.push('【地支关系】');

    // // 三合局
    // const sanHeResult = analyzeFourPillarsSanHe(
    //     fourPillars.year.branch,
    //     fourPillars.month.branch,
    //     fourPillars.day.branch,
    //     fourPillars.hour.branch
    // );
    // if (sanHeResult.hasFullSanHe && sanHeResult.fullSanHe) {
    //     lines.push(`三合局：${sanHeResult.fullSanHe.name}（化${sanHeResult.fullSanHe.result}，力量加强）`);
    // } else if (sanHeResult.banHe.length > 0) {
    //     const banHeStr = sanHeResult.banHe.map(b =>
    //         `${b.branches.join('')}${b.type === 'sheng' ? '生方' : '墓方'}半合${b.result}`
    //     ).join('、');
    //     lines.push(`半合：${banHeStr}`);
    // }

    // // 六合
    // const liuHeResult = analyzeFourPillarsLiuHe(
    //     fourPillars.year.branch,
    //     fourPillars.month.branch,
    //     fourPillars.day.branch,
    //     fourPillars.hour.branch
    // );
    // if (liuHeResult.pairs.length > 0) {
    //     const liuHeStr = liuHeResult.pairs.map(p =>
    //         `${p.zhi1}${p.zhi2}合化${p.result}`
    //     ).join('、');
    //     lines.push(`六合：${liuHeStr}`);
    // }

    // // 六冲
    // const liuChongResult = analyzeFourPillarsLiuChong(
    //     fourPillars.year.branch,
    //     fourPillars.month.branch,
    //     fourPillars.day.branch,
    //     fourPillars.hour.branch
    // );
    // if (liuChongResult.pairs.length > 0) {
    //     const liuChongStr = liuChongResult.pairs.map(p =>
    //         `${p.position1}${p.zhi1}冲${p.position2}${p.zhi2}`
    //     ).join('、');
    //     lines.push(`六冲：${liuChongStr}（冲动，变化）`);
    // }

    // if (!sanHeResult.hasFullSanHe && sanHeResult.banHe.length === 0 && liuHeResult.pairs.length === 0 && liuChongResult.pairs.length === 0) {
    //     lines.push('四柱地支无明显合冲关系');
    // }
    // lines.push('');

    // 自动计算大运
    try {
        const [year, month, day] = chart.birthDate.split('-').map(Number);
        const [hour, minute] = (chart.birthTime || '12:00').split(':').map(Number);
        const proData = calculateProfessionalData({
            name: chart.name,
            gender: chart.gender,
            birthYear: year,
            birthMonth: month,
            birthDay: day,
            birthHour: hour,
            birthMinute: minute,
            calendarType: chart.calendarType || 'solar',
            isLeapMonth: chart.isLeapMonth,
        });

        if (proData.daYun.length > 0) {
            lines.push('【大运排列】');
            lines.push(`起运：${proData.startAgeDetail}`);
            proData.daYun.forEach((dy) => {
                lines.push(`${dy.startAge}岁 ${dy.ganZhi}`);
            });
        }
    } catch {
        // 大运计算失败时忽略
    }

    return lines.join('\n');
}
