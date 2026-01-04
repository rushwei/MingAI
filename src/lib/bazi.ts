/**
 * 八字排盘核心逻辑
 * 
 * 使用 lunar-javascript 库进行农历和八字计算
 * 
 * 服务端组件说明：
 * - 这些函数主要在服务端运行（Server Actions）
 * - 也可以在客户端使用，lunar-javascript 支持浏览器环境
 */

import { Solar, Lunar, EightChar } from 'lunar-javascript';
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
const STEM_ELEMENTS: Record<HeavenlyStem, FiveElement> = {
    '甲': '木', '乙': '木',
    '丙': '火', '丁': '火',
    '戊': '土', '己': '土',
    '庚': '金', '辛': '金',
    '壬': '水', '癸': '水',
};

/** 地支五行对应表 */
const BRANCH_ELEMENTS: Record<EarthlyBranch, FiveElement> = {
    '寅': '木', '卯': '木',
    '巳': '火', '午': '火',
    '辰': '土', '戌': '土', '丑': '土', '未': '土',
    '申': '金', '酉': '金',
    '亥': '水', '子': '水',
};

/** 地支藏干表 */
const HIDDEN_STEMS: Record<EarthlyBranch, HeavenlyStem[]> = {
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

/** 十神计算规则 - 基于日主与其他天干的关系 */
const TEN_GOD_RULES: Record<string, TenGod> = {
    '同阳': '比肩', '同阴': '比肩',
    '异阳': '劫财', '异阴': '劫财',
    '生阳': '食神', '生阴': '伤官',
    '克阳': '偏财', '克阴': '正财',
    '被克阳': '七杀', '被克阴': '正官',
    '被生阳': '偏印', '被生阴': '正印',
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
function calculateTenGod(dayStem: HeavenlyStem, targetStem: HeavenlyStem): TenGod {
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

    // 如果输入的是农历，需要先转换
    let lunar: Lunar;
    if (formData.calendarType === 'lunar') {
        lunar = Lunar.fromYmd(formData.birthYear, formData.birthMonth, formData.birthDay);
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
