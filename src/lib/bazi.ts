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

// ===== 常量定义 =====

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

    const pillars = [fourPillars.year, fourPillars.month, fourPillars.day, fourPillars.hour];

    for (const pillar of pillars) {
        // 天干五行
        stats[pillar.stemElement]++;
        // 地支五行
        stats[pillar.branchElement]++;
        // 藏干五行（权重较低，这里简单计算）
        for (const hiddenStem of pillar.hiddenStems) {
            stats[STEM_ELEMENTS[hiddenStem]] += 0.3;
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

// 天乙贵人规则：日干 -> 贵人所在地支
const TIAN_YI_GUI_REN: Record<HeavenlyStem, EarthlyBranch[]> = {
    '甲': ['丑', '未'], '乙': ['子', '申'], '丙': ['亥', '酉'], '丁': ['亥', '酉'],
    '戊': ['丑', '未'], '己': ['子', '申'], '庚': ['丑', '未'], '辛': ['寅', '午'],
    '壬': ['卯', '巳'], '癸': ['卯', '巳'],
};

// 羊刃规则：日干 -> 羊刃所在地支
const YANG_REN: Record<HeavenlyStem, EarthlyBranch> = {
    '甲': '卯', '乙': '辰', '丙': '午', '丁': '未',
    '戊': '午', '己': '未', '庚': '酉', '辛': '戌',
    '壬': '子', '癸': '丑',
};

// 文昌规则：日干 -> 文昌所在地支
const WEN_CHANG: Record<HeavenlyStem, EarthlyBranch> = {
    '甲': '巳', '乙': '午', '丙': '申', '丁': '酉',
    '戊': '申', '己': '酉', '庚': '亥', '辛': '子',
    '壬': '寅', '癸': '卯',
};

// 驿马规则：日支 -> 驿马所在地支（三合局长生之冲）
const YI_MA: Record<EarthlyBranch, EarthlyBranch> = {
    '寅': '申', '午': '申', '戌': '申',
    '申': '寅', '子': '寅', '辰': '寅',
    '巳': '亥', '酉': '亥', '丑': '亥',
    '亥': '巳', '卯': '巳', '未': '巳',
};

// 桃花规则：日支 -> 桃花所在地支
const TAO_HUA: Record<EarthlyBranch, EarthlyBranch> = {
    '寅': '卯', '午': '卯', '戌': '卯',
    '申': '酉', '子': '酉', '辰': '酉',
    '巳': '午', '酉': '午', '丑': '午',
    '亥': '子', '卯': '子', '未': '子',
};

// 华盖规则：日支 -> 华盖所在地支
const HUA_GAI: Record<EarthlyBranch, EarthlyBranch> = {
    '寅': '戌', '午': '戌', '戌': '戌',
    '申': '辰', '子': '辰', '辰': '辰',
    '巳': '丑', '酉': '丑', '丑': '丑',
    '亥': '未', '卯': '未', '未': '未',
};

// 禄神规则：日干 -> 禄神所在地支
const LU_SHEN: Record<HeavenlyStem, EarthlyBranch> = {
    '甲': '寅', '乙': '卯', '丙': '巳', '丁': '午',
    '戊': '巳', '己': '午', '庚': '申', '辛': '酉',
    '壬': '亥', '癸': '子',
};

// 太极贵人规则：日干 -> 太极贵人所在地支
const TAI_JI_GUI_REN: Record<HeavenlyStem, EarthlyBranch[]> = {
    '甲': ['子', '午'], '乙': ['子', '午'], '丙': ['卯', '酉'], '丁': ['卯', '酉'],
    '戊': ['辰', '戌', '丑', '未'], '己': ['辰', '戌', '丑', '未'],
    '庚': ['寅', '亥'], '辛': ['寅', '亥'], '壬': ['巳', '申'], '癸': ['巳', '申'],
};

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

// 劫煞规则：日支 -> 劫煞地支
const JIE_SHA: Record<EarthlyBranch, EarthlyBranch> = {
    '寅': '巳', '午': '巳', '戌': '巳',
    '申': '亥', '子': '亥', '辰': '亥',
    '亥': '申', '卯': '申', '未': '申',
    '巳': '寅', '酉': '寅', '丑': '寅',
};

// 亡神规则：日支 -> 亡神地支
const WANG_SHEN: Record<EarthlyBranch, EarthlyBranch> = {
    '寅': '亥', '午': '亥', '戌': '亥',
    '申': '巳', '子': '巳', '辰': '巳',
    '亥': '寅', '卯': '寅', '未': '寅',
    '巳': '申', '酉': '申', '丑': '申',
};

// 孤辰规则：年支 -> 孤辰地支
const GU_CHEN: Record<EarthlyBranch, EarthlyBranch> = {
    '寅': '巳', '卯': '巳', '辰': '巳',
    '巳': '申', '午': '申', '未': '申',
    '申': '亥', '酉': '亥', '戌': '亥',
    '亥': '寅', '子': '寅', '丑': '寅',
};

// 寡宿规则：年支 -> 寡宿地支
const GUA_SU: Record<EarthlyBranch, EarthlyBranch> = {
    '寅': '丑', '卯': '丑', '辰': '丑',
    '巳': '辰', '午': '辰', '未': '辰',
    '申': '未', '酉': '未', '戌': '未',
    '亥': '戌', '子': '戌', '丑': '戌',
};

// 将星规则：年支 -> 将星地支
const JIANG_XING: Record<EarthlyBranch, EarthlyBranch> = {
    '寅': '午', '午': '午', '戌': '午',
    '申': '子', '子': '子', '辰': '子',
    '巳': '酉', '酉': '酉', '丑': '酉',
    '亥': '卯', '卯': '卯', '未': '卯',
};

// 天厨规则：日干 -> 天厨地支
const TIAN_CHU: Record<HeavenlyStem, EarthlyBranch> = {
    '甲': '巳', '乙': '午', '丙': '巳', '丁': '午',
    '戊': '巳', '己': '午', '庚': '亥', '辛': '子',
    '壬': '亥', '癸': '子',
};

// 国印贵人规则：日干 -> 国印地支
const GUO_YIN: Record<HeavenlyStem, EarthlyBranch> = {
    '甲': '戌', '乙': '亥', '丙': '丑', '丁': '寅',
    '戊': '丑', '己': '寅', '庚': '辰', '辛': '巳',
    '壬': '未', '癸': '申',
};

// 学堂规则：年干 -> 学堂地支
const XUE_TANG: Record<HeavenlyStem, EarthlyBranch> = {
    '甲': '亥', '乙': '午', '丙': '寅', '丁': '酉',
    '戊': '寅', '己': '酉', '庚': '巳', '辛': '子',
    '壬': '申', '癸': '卯',
};

// 词馆规则：日干 -> 词馆地支
const CI_GUAN: Record<HeavenlyStem, EarthlyBranch> = {
    '甲': '寅', '乙': '卯', '丙': '巳', '丁': '午',
    '戊': '辰', '己': '未', '庚': '申', '辛': '酉',
    '壬': '亥', '癸': '子',
};

// 红鸾规则：年支 -> 红鸾地支
const HONG_LUAN: Record<EarthlyBranch, EarthlyBranch> = {
    '子': '卯', '丑': '寅', '寅': '丑', '卯': '子',
    '辰': '亥', '巳': '戌', '午': '酉', '未': '申',
    '申': '未', '酉': '午', '戌': '巳', '亥': '辰',
};

// 天喜规则：年支 -> 天喜地支
const TIAN_XI: Record<EarthlyBranch, EarthlyBranch> = {
    '子': '酉', '丑': '申', '寅': '未', '卯': '午',
    '辰': '巳', '巳': '辰', '午': '卯', '未': '寅',
    '申': '丑', '酉': '子', '戌': '亥', '亥': '戌',
};

// 天医规则：月支 -> 天医地支
const TIAN_YI: Record<EarthlyBranch, EarthlyBranch> = {
    '寅': '丑', '卯': '寅', '辰': '卯', '巳': '辰',
    '午': '巳', '未': '午', '申': '未', '酉': '申',
    '戌': '酉', '亥': '戌', '子': '亥', '丑': '子',
};

// 吊客规则：年支 -> 吊客地支
const DIAO_KE: Record<EarthlyBranch, EarthlyBranch> = {
    '子': '酉', '丑': '戌', '寅': '亥', '卯': '子',
    '辰': '丑', '巳': '寅', '午': '卯', '未': '辰',
    '申': '巳', '酉': '午', '戌': '未', '亥': '申',
};

// 丧门规则：年支 -> 丧门地支
const SANG_MEN: Record<EarthlyBranch, EarthlyBranch> = {
    '子': '寅', '丑': '卯', '寅': '辰', '卯': '巳',
    '辰': '午', '巳': '未', '午': '申', '未': '酉',
    '申': '戌', '酉': '亥', '戌': '子', '亥': '丑',
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

// 魁罡：庚辰、庚戌、壬辰、戊戌四日为魁罡
const KUI_GANG = ['庚辰', '庚戌', '壬辰', '戊戌'];

// 天罗地网：辰见巳为天罗，戌见亥为地网
// 简化规则：火命人辰月日时见巳，水土命人戌月日时见亥
const TIAN_LUO_DI_WANG: Partial<Record<EarthlyBranch, EarthlyBranch>> = {
    '辰': '巳', // 天罗
    '戌': '亥', // 地网
};

// 阴差阳错日：丙子、丁丑、戊寅、辛卯、壬辰、癸巳、丙午、丁未、戊申、辛酉、壬戌、癸亥
const YIN_CHA_YANG_CUO = ['丙子', '丁丑', '戊寅', '辛卯', '壬辰', '癸巳', '丙午', '丁未', '戊申', '辛酉', '壬戌', '癸亥'];

// 十恶大败日：甲辰乙巳与壬申、丙申丁亥及庚辰、戊戌癸亥加辛巳、己丑都来十位中
const SHI_E_DA_BAI = ['甲辰', '乙巳', '壬申', '丙申', '丁亥', '庚辰', '戊戌', '癸亥', '辛巳', '己丑'];

// 血刃：日干 -> 血刃地支
const XUE_REN: Record<HeavenlyStem, EarthlyBranch> = {
    '甲': '卯', '乙': '辰', '丙': '午', '丁': '未',
    '戊': '午', '己': '未', '庚': '酉', '辛': '戌',
    '壬': '子', '癸': '丑',
};

// 披头（披麻）：年支 -> 披头地支
const PI_TOU: Record<EarthlyBranch, EarthlyBranch> = {
    '子': '巳', '丑': '午', '寅': '未', '卯': '申',
    '辰': '酉', '巳': '戌', '午': '亥', '未': '子',
    '申': '丑', '酉': '寅', '戌': '卯', '亥': '辰',
};

// 天赦日：春戊寅、夏甲午、秋戊申、冬甲子
const TIAN_SHE = {
    spring: ['戊寅'],
    summer: ['甲午'],
    autumn: ['戊申'],
    winter: ['甲子'],
};

// 福星贵人：日干 -> 福星地支
const FU_XING: Record<HeavenlyStem, EarthlyBranch> = {
    '甲': '寅', '乙': '丑', '丙': '子', '丁': '亥',
    '戊': '申', '己': '未', '庚': '午', '辛': '巳',
    '壬': '辰', '癸': '卯',
};

// 灾煞规则：年支 -> 灾煞地支
const ZAI_SHA: Record<EarthlyBranch, EarthlyBranch> = {
    '寅': '午', '午': '午', '戌': '午',
    '申': '子', '子': '子', '辰': '子',
    '巳': '酉', '酉': '酉', '丑': '酉',
    '亥': '卯', '卯': '卯', '未': '卯',
};

// 流霞规则：日干 -> 流霞地支
const LIU_XIA: Record<HeavenlyStem, EarthlyBranch> = {
    '甲': '酉', '乙': '戌', '丙': '未', '丁': '申',
    '戊': '巳', '己': '午', '庚': '辰', '辛': '卯',
    '壬': '亥', '癸': '寅',
};

// 红艳煞规则：日干 -> 红艳地支
const HONG_YAN: Record<HeavenlyStem, EarthlyBranch> = {
    '甲': '午', '乙': '午', '丙': '寅', '丁': '未',
    '戊': '辰', '己': '辰', '庚': '戌', '辛': '酉',
    '壬': '子', '癸': '申',
};

// 八专日：日柱
const BA_ZHUAN = ['甲寅', '乙卯', '丙午', '丁未', '戊戌', '戊辰', '己未', '己丑', '庚申', '辛酉', '壬子', '癸丑'];

// 金神：日柱含"金"气
const JIN_SHEN = ['己丑', '己巳', '癸酉'];

// 德秀贵人规则：月支 -> 德秀天干
const DE_XIU: Record<EarthlyBranch, HeavenlyStem[]> = {
    '寅': ['丙', '甲'], '卯': ['甲', '乙'], '辰': ['壬', '癸'], '巳': ['丙', '庚'],
    '午': ['丁', '己'], '未': ['甲', '己'], '申': ['庚', '壬'], '酉': ['辛', '庚'],
    '戌': ['丙', '戊'], '亥': ['壬', '甲'], '子': ['癸', '壬'], '丑': ['辛', '己'],
};

// 元辰规则：年支与日支的关系
const YUAN_CHEN_MALE: Record<EarthlyBranch, EarthlyBranch> = {
    '子': '酉', '丑': '申', '寅': '未', '卯': '午',
    '辰': '巳', '巳': '辰', '午': '卯', '未': '寅',
    '申': '丑', '酉': '子', '戌': '亥', '亥': '戌',
};

const YUAN_CHEN_FEMALE: Record<EarthlyBranch, EarthlyBranch> = {
    '子': '卯', '丑': '寅', '寅': '丑', '卯': '子',
    '辰': '亥', '巳': '戌', '午': '酉', '未': '申',
    '申': '未', '酉': '午', '戌': '巳', '亥': '辰',
};

// 孤鸾煞规则：日柱
const GU_LUAN = ['乙巳', '丁巳', '辛亥', '戊申', '甲寅', '丙午', '戊午', '壬子'];

// 勾绞煞规则：年支 -> 勾煞地支、绞煞地支
const GOU_SHA: Record<EarthlyBranch, EarthlyBranch> = {
    '子': '酉', '丑': '戌', '寅': '亥', '卯': '子',
    '辰': '丑', '巳': '寅', '午': '卯', '未': '辰',
    '申': '巳', '酉': '午', '戌': '未', '亥': '申',
};

const JIAO_SHA: Record<EarthlyBranch, EarthlyBranch> = {
    '子': '卯', '丑': '寅', '寅': '丑', '卯': '子',
    '辰': '亥', '巳': '戌', '午': '酉', '未': '申',
    '申': '未', '酉': '午', '戌': '巳', '亥': '辰',
};

// 白虎煞规则：月支 -> 白虎地支
const BAI_HU: Record<EarthlyBranch, EarthlyBranch> = {
    '寅': '午', '卯': '未', '辰': '申', '巳': '酉',
    '午': '戌', '未': '亥', '申': '子', '酉': '丑',
    '戌': '寅', '亥': '卯', '子': '辰', '丑': '巳',
};

// 飞刃规则：日干 -> 飞刃地支（羊刃对冲）
const FEI_REN: Record<HeavenlyStem, EarthlyBranch> = {
    '甲': '酉', '乙': '申', '丙': '子', '丁': '亥',
    '戊': '子', '己': '亥', '庚': '卯', '辛': '寅',
    '壬': '午', '癸': '巳',
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
    const monthStem = eightChar.getMonthGan() as HeavenlyStem;
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

    // 血刃（日干查）
    const xueRenBranch = XUE_REN[dayStem];
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
