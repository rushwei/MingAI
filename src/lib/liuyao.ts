/**
 * 六爻占卜核心库
 *
 * 包含 64 卦数据
 * 铜钱起卦算法
 * 变爻计算
 * 六亲
 * 六神
 * 世应
 * 用神
 * 干支时间体系
 * 旬空（空亡）体系
 * 月建/日辰作用判定
 * 旺衰判定体系
 * 动爻变化分析
 * 六合/六冲/刑害破关系
 * 伏神系统
 * 原神/忌神/仇神体系
 */

import {
    findPalace,
    getShiYingPosition,
    getNaJia,
    type WuXing,
    type DiZhi,
    type Palace,
    DIZHI_WUXING,
} from '@/lib/eight-palaces';
import { getHexagramText } from '@/lib/hexagram-texts';
import { calculateBranchShenSha, calculateGlobalShenSha } from '@/lib/liuyao-shensha';

// 爻的类型
export type YaoType = 0 | 1;  // 0 = 阴爻, 1 = 阳爻

// 变爻状态
export type YaoChange = 'stable' | 'changing';

// 单个爻的信息
export interface Yao {
    type: YaoType;
    change: YaoChange;  // 是否变爻
    position: number;   // 1-6，从下到上
}

// 卦象
export interface Hexagram {
    name: string;           // 卦名
    code: string;           // 二进制编码 (从下到上)
    upperTrigram: string;   // 上卦
    lowerTrigram: string;   // 下卦
    element: string;        // 五行属性
    nature: string;         // 卦象本质
}

// 单卦（八卦）
export interface Trigram {
    name: string;
    code: string;
    element: string;
    nature: string;
}

// 铜钱抛掷结果
export interface CoinTossResult {
    coins: [boolean, boolean, boolean];  // true = 正面(字), false = 反面(花)
    heads: number;
    yaoType: YaoType;
    isChanging: boolean;
}

// 占卜结果
export interface DivinationResult {
    question: string;
    yongShenTargets: LiuQin[];
    yaos: Yao[];
    hexagram: Hexagram;
    changedHexagram?: Hexagram;
    changedLines: number[];
    createdAt: Date;
}

// 八卦数据
export const TRIGRAMS: Record<string, Trigram> = {
    '111': { name: '乾', code: '111', element: '金', nature: '天' },
    '000': { name: '坤', code: '000', element: '土', nature: '地' },
    '100': { name: '震', code: '100', element: '木', nature: '雷' },
    '001': { name: '艮', code: '001', element: '土', nature: '山' },
    '010': { name: '坎', code: '010', element: '水', nature: '水' },
    '101': { name: '离', code: '101', element: '火', nature: '火' },
    '110': { name: '兑', code: '110', element: '金', nature: '泽' },
    '011': { name: '巽', code: '011', element: '木', nature: '风' },
};

// 64卦数据 (从 hexagram.md 解析)
export const HEXAGRAMS: Hexagram[] = [
    { name: '乾为天', code: '111111', upperTrigram: '乾', lowerTrigram: '乾', element: '金', nature: '刚健' },
    { name: '坤为地', code: '000000', upperTrigram: '坤', lowerTrigram: '坤', element: '土', nature: '柔顺' },
    { name: '水雷屯', code: '100010', upperTrigram: '坎', lowerTrigram: '震', element: '水', nature: '初生' },
    { name: '山水蒙', code: '010001', upperTrigram: '艮', lowerTrigram: '坎', element: '土', nature: '启蒙' },
    { name: '水天需', code: '111010', upperTrigram: '坎', lowerTrigram: '乾', element: '水', nature: '等待' },
    { name: '天水讼', code: '010111', upperTrigram: '乾', lowerTrigram: '坎', element: '金', nature: '争讼' },
    { name: '地水师', code: '010000', upperTrigram: '坤', lowerTrigram: '坎', element: '土', nature: '众军' },
    { name: '水地比', code: '000010', upperTrigram: '坎', lowerTrigram: '坤', element: '水', nature: '亲比' },
    { name: '风天小畜', code: '111011', upperTrigram: '巽', lowerTrigram: '乾', element: '木', nature: '积蓄' },
    { name: '天泽履', code: '110111', upperTrigram: '乾', lowerTrigram: '兑', element: '金', nature: '践履' },
    { name: '地天泰', code: '111000', upperTrigram: '坤', lowerTrigram: '乾', element: '土', nature: '通泰' },
    { name: '天地否', code: '000111', upperTrigram: '乾', lowerTrigram: '坤', element: '金', nature: '闭塞' },
    { name: '天火同人', code: '101111', upperTrigram: '乾', lowerTrigram: '离', element: '金', nature: '和同' },
    { name: '火天大有', code: '111101', upperTrigram: '离', lowerTrigram: '乾', element: '火', nature: '富有' },
    { name: '地山谦', code: '001000', upperTrigram: '坤', lowerTrigram: '艮', element: '土', nature: '谦逊' },
    { name: '雷地豫', code: '000100', upperTrigram: '震', lowerTrigram: '坤', element: '木', nature: '愉乐' },
    { name: '泽雷随', code: '100110', upperTrigram: '兑', lowerTrigram: '震', element: '金', nature: '随从' },
    { name: '山风蛊', code: '011001', upperTrigram: '艮', lowerTrigram: '巽', element: '土', nature: '蛊惑' },
    { name: '地泽临', code: '110000', upperTrigram: '坤', lowerTrigram: '兑', element: '土', nature: '临近' },
    { name: '风地观', code: '000011', upperTrigram: '巽', lowerTrigram: '坤', element: '木', nature: '观察' },
    { name: '火雷噬嗑', code: '100101', upperTrigram: '离', lowerTrigram: '震', element: '火', nature: '咬合' },
    { name: '山火贲', code: '101001', upperTrigram: '艮', lowerTrigram: '离', element: '土', nature: '文饰' },
    { name: '山地剥', code: '000001', upperTrigram: '艮', lowerTrigram: '坤', element: '土', nature: '剥落' },
    { name: '地雷复', code: '100000', upperTrigram: '坤', lowerTrigram: '震', element: '土', nature: '复归' },
    { name: '天雷无妄', code: '100111', upperTrigram: '乾', lowerTrigram: '震', element: '金', nature: '无妄' },
    { name: '山天大畜', code: '111001', upperTrigram: '艮', lowerTrigram: '乾', element: '土', nature: '大蓄' },
    { name: '山雷颐', code: '100001', upperTrigram: '艮', lowerTrigram: '震', element: '土', nature: '养育' },
    { name: '泽风大过', code: '011110', upperTrigram: '兑', lowerTrigram: '巽', element: '金', nature: '过度' },
    { name: '坎为水', code: '010010', upperTrigram: '坎', lowerTrigram: '坎', element: '水', nature: '险陷' },
    { name: '离为火', code: '101101', upperTrigram: '离', lowerTrigram: '离', element: '火', nature: '附丽' },
    { name: '泽山咸', code: '001110', upperTrigram: '兑', lowerTrigram: '艮', element: '金', nature: '感应' },
    { name: '雷风恒', code: '011100', upperTrigram: '震', lowerTrigram: '巽', element: '木', nature: '恒常' },
    { name: '天山遯', code: '001111', upperTrigram: '乾', lowerTrigram: '艮', element: '金', nature: '退避' },
    { name: '雷天大壮', code: '111100', upperTrigram: '震', lowerTrigram: '乾', element: '木', nature: '壮大' },
    { name: '火地晋', code: '000101', upperTrigram: '离', lowerTrigram: '坤', element: '火', nature: '晋升' },
    { name: '地火明夷', code: '101000', upperTrigram: '坤', lowerTrigram: '离', element: '土', nature: '晦暗' },
    { name: '风火家人', code: '101011', upperTrigram: '巽', lowerTrigram: '离', element: '木', nature: '家庭' },
    { name: '火泽睽', code: '110101', upperTrigram: '离', lowerTrigram: '兑', element: '火', nature: '乖离' },
    { name: '水山蹇', code: '001010', upperTrigram: '坎', lowerTrigram: '艮', element: '水', nature: '艰难' },
    { name: '雷水解', code: '010100', upperTrigram: '震', lowerTrigram: '坎', element: '木', nature: '解除' },
    { name: '山泽损', code: '110001', upperTrigram: '艮', lowerTrigram: '兑', element: '土', nature: '损益' },
    { name: '风雷益', code: '100011', upperTrigram: '巽', lowerTrigram: '震', element: '木', nature: '增益' },
    { name: '泽天夬', code: '111110', upperTrigram: '兑', lowerTrigram: '乾', element: '金', nature: '决断' },
    { name: '天风姤', code: '011111', upperTrigram: '乾', lowerTrigram: '巽', element: '金', nature: '遇合' },
    { name: '泽地萃', code: '000110', upperTrigram: '兑', lowerTrigram: '坤', element: '金', nature: '聚集' },
    { name: '地风升', code: '011000', upperTrigram: '坤', lowerTrigram: '巽', element: '土', nature: '上升' },
    { name: '泽水困', code: '010110', upperTrigram: '兑', lowerTrigram: '坎', element: '金', nature: '困穷' },
    { name: '水风井', code: '011010', upperTrigram: '坎', lowerTrigram: '巽', element: '水', nature: '井养' },
    { name: '泽火革', code: '101110', upperTrigram: '兑', lowerTrigram: '离', element: '金', nature: '变革' },
    { name: '火风鼎', code: '011101', upperTrigram: '离', lowerTrigram: '巽', element: '火', nature: '鼎新' },
    { name: '震为雷', code: '100100', upperTrigram: '震', lowerTrigram: '震', element: '木', nature: '震动' },
    { name: '艮为山', code: '001001', upperTrigram: '艮', lowerTrigram: '艮', element: '土', nature: '止息' },
    { name: '风山渐', code: '001011', upperTrigram: '巽', lowerTrigram: '艮', element: '木', nature: '渐进' },
    { name: '雷泽归妹', code: '110100', upperTrigram: '震', lowerTrigram: '兑', element: '木', nature: '归嫁' },
    { name: '雷火丰', code: '101100', upperTrigram: '震', lowerTrigram: '离', element: '木', nature: '丰盛' },
    { name: '火山旅', code: '001101', upperTrigram: '离', lowerTrigram: '艮', element: '火', nature: '旅行' },
    { name: '巽为风', code: '011011', upperTrigram: '巽', lowerTrigram: '巽', element: '木', nature: '顺入' },
    { name: '兑为泽', code: '110110', upperTrigram: '兑', lowerTrigram: '兑', element: '金', nature: '喜悦' },
    { name: '风水涣', code: '010011', upperTrigram: '巽', lowerTrigram: '坎', element: '木', nature: '涣散' },
    { name: '水泽节', code: '110010', upperTrigram: '坎', lowerTrigram: '兑', element: '水', nature: '节制' },
    { name: '风泽中孚', code: '110011', upperTrigram: '巽', lowerTrigram: '兑', element: '木', nature: '诚信' },
    { name: '雷山小过', code: '001100', upperTrigram: '震', lowerTrigram: '艮', element: '木', nature: '小过' },
    { name: '水火既济', code: '101010', upperTrigram: '坎', lowerTrigram: '离', element: '水', nature: '已成' },
    { name: '火水未济', code: '010101', upperTrigram: '离', lowerTrigram: '坎', element: '火', nature: '未成' },
];

// 根据编码查找卦象
export function findHexagram(code: string): Hexagram | undefined {
    return HEXAGRAMS.find(h => h.code === code);
}

// 根据卦名查找卦象
export function findHexagramByName(name: string): Hexagram | undefined {
    return HEXAGRAMS.find(h => h.name === name);
}

/**
 * 模拟抛铜钱
 * 正面(字) = true, 反面(花) = false
 * 
 * 三正 = 老阳(9), 变爻, 记 ○
 * 二正一反 = 少阳(7), 不变, 记 —
 * 一正二反 = 少阴(8), 不变, 记 - -
 * 三反 = 老阴(6), 变爻, 记 ×
 */
export function tossCoin(): boolean {
    return Math.random() < 0.5;
}

export function tossThreeCoins(): CoinTossResult {
    const coins: [boolean, boolean, boolean] = [tossCoin(), tossCoin(), tossCoin()];
    const heads = coins.filter(c => c).length;

    // 三正 = 老阳(9), 变
    // 二正一反 = 少阳(7), 不变
    // 一正二反 = 少阴(8), 不变
    // 三反 = 老阴(6), 变
    let yaoType: YaoType;
    let isChanging: boolean;

    switch (heads) {
        case 3: // 老阳
            yaoType = 1;
            isChanging = true;
            break;
        case 2: // 少阳
            yaoType = 1;
            isChanging = false;
            break;
        case 1: // 少阴
            yaoType = 0;
            isChanging = false;
            break;
        case 0: // 老阴
            yaoType = 0;
            isChanging = true;
            break;
        default:
            yaoType = 1;
            isChanging = false;
    }

    return { coins, heads, yaoType, isChanging };
}

/**
 * 完整起卦流程
 * 抛6次，从初爻(下)到上爻(上)
 */
export function divine(): { yaos: Yao[], results: CoinTossResult[] } {
    const results: CoinTossResult[] = [];
    const yaos: Yao[] = [];

    for (let i = 1; i <= 6; i++) {
        const result = tossThreeCoins();
        results.push(result);
        yaos.push({
            type: result.yaoType,
            change: result.isChanging ? 'changing' : 'stable',
            position: i,
        });
    }

    return { yaos, results };
}

/**
 * 从爻数组生成卦象编码
 */
export function yaosTpCode(yaos: Yao[]): string {
    return yaos.map(y => y.type.toString()).join('');
}

/**
 * 计算变卦
 * 变爻翻转后的卦象
 */
export function calculateChangedHexagram(yaos: Yao[]): { changedCode: string, changedLines: number[] } {
    const changedLines: number[] = [];
    const changedYaos = yaos.map((y, i) => {
        if (y.change === 'changing') {
            changedLines.push(i + 1);
            return y.type === 1 ? 0 : 1;
        }
        return y.type;
    });

    return {
        changedCode: changedYaos.join(''),
        changedLines,
    };
}

/**
 * 执行完整占卜
 */
export function performDivination(question: string): DivinationResult {
    const { yaos } = divine();
    const hexagramCode = yaosTpCode(yaos);
    const hexagram = findHexagram(hexagramCode);

    if (!hexagram) {
        throw new Error(`未找到卦象: ${hexagramCode}`);
    }

    const { changedCode, changedLines } = calculateChangedHexagram(yaos);
    const changedHexagram = changedLines.length > 0 ? findHexagram(changedCode) : undefined;

    return {
        question,
        yongShenTargets: [],
        yaos,
        hexagram,
        changedHexagram,
        changedLines,
        createdAt: new Date(),
    };
}

/**
 * 根据传入的爻数据重建占卜结果
 */
export function reconstructDivination(
    question: string,
    yaoData: { type: YaoType, change: YaoChange }[],
    yongShenTargets: LiuQin[] = []
): DivinationResult {
    const yaos: Yao[] = yaoData.map((y, i) => ({
        ...y,
        position: i + 1,
    }));

    const hexagramCode = yaosTpCode(yaos);
    const hexagram = findHexagram(hexagramCode);

    if (!hexagram) {
        throw new Error(`未找到卦象: ${hexagramCode}`);
    }

    const { changedCode, changedLines } = calculateChangedHexagram(yaos);
    const changedHexagram = changedLines.length > 0 ? findHexagram(changedCode) : undefined;

    return {
        question,
        yongShenTargets,
        yaos,
        hexagram,
        changedHexagram,
        changedLines,
        createdAt: new Date(),
    };
}

// 卦象简要解释
export const HEXAGRAM_BRIEF: Record<string, string> = {
    '乾为天': '元亨利贞，君子自强不息。象征刚健、创造、积极进取。',
    '坤为地': '厚德载物，柔顺利贞。象征包容、承载、宽厚待人。',
    '水雷屯': '万事开头难，需耐心等待时机，草创初期多艰辛。',
    '山水蒙': '蒙昧待启，虚心求教，学无止境。',
    '水天需': '需要等待，养精蓄锐，时机未到不可轻动。',
    '天水讼': '争讼之象，宜和解退让，不宜强争。',
    '地水师': '众军出征，需有明君统帅，师出有名。',
    '水地比': '亲比和睦，辅佐贤能，广结善缘。',
    '风天小畜': '小有积蓄，以柔制刚，量力而行。',
    '天泽履': '如履薄冰，谨慎行事，礼仪规范。',
    '地天泰': '天地交泰，上下和睦，大吉大利。',
    '天地否': '闭塞不通，君子潜藏，等待时机。',
    '天火同人': '同人于野，志同道合，众志成城。',
    '火天大有': '大有收获，光明正大，元亨。',
    '地山谦': '谦虚自牧，谦受益满招损。',
    '雷地豫': '和乐愉悦，但不可过于安逸。',
    '泽雷随': '随顺因时，灵活应变。',
    '山风蛊': '拨乱反正，振作革新。',
    '地泽临': '临近观察，居高临下，以德服人。',
    '风地观': '观察仰望，以身作则。',
    '火雷噬嗑': '明断是非，刑罚分明。',
    '山火贲': '文饰修养，内实外华。',
    '山地剥': '剥落凋零，顺应衰退。',
    '地雷复': '一阳复始，回归本心。',
    '天雷无妄': '无妄而行，顺应自然。',
    '山天大畜': '大有积蓄，厚积薄发。',
    '山雷颐': '养育之道，慎言节食。',
    '泽风大过': '过度之象，独立不惧。',
    '坎为水': '重重险难，诚信待之。',
    '离为火': '附丽光明，柔顺得吉。',
    '泽山咸': '感应相通，真诚相待。',
    '雷风恒': '恒久不变，坚持正道。',
    '天山遯': '避让退隐，保全自身。',
    '雷天大壮': '壮盛强大，宜守正道。',
    '火地晋': '晋升明出，光明上进。',
    '地火明夷': '明入地中，晦暗待时。',
    '风火家人': '家庭和睦，齐家之道。',
    '火泽睽': '乖离异向，求同存异。',
    '水山蹇': '行路艰难，宜守宜退。',
    '雷水解': '解除困难，缓和矛盾。',
    '山泽损': '损下益上，减损得益。',
    '风雷益': '益下利民，增益发展。',
    '泽天夬': '果断决定，刚决柔。',
    '天风姤': '偶然相遇，阴长阳消。',
    '泽地萃': '聚集汇合，众志成城。',
    '地风升': '上升进阶，循序渐进。',
    '泽水困': '困穷受困，困而不失。',
    '水风井': '井养不穷，取之不竭。',
    '泽火革': '变革创新，除旧布新。',
    '火风鼎': '鼎新革故，重器传承。',
    '震为雷': '震惊百里，修省自身。',
    '艮为山': '止息静止，知止不殆。',
    '风山渐': '渐进发展，循序渐进。',
    '雷泽归妹': '归嫁从夫，有终无初。',
    '雷火丰': '丰盛鼎盛，宜大作为。',
    '火山旅': '旅行在外，谨慎客居。',
    '巽为风': '顺入渗透，柔和谦逊。',
    '兑为泽': '喜悦说和，刚中柔外。',
    '风水涣': '涣散离散，重新聚合。',
    '水泽节': '节制适度，有度为吉。',
    '风泽中孚': '诚信孚于中，信及豚鱼。',
    '雷山小过': '小事可过，不可大事。',
    '水火既济': '已经成功，谨守成功。',
    '火水未济': '尚未完成，谨慎前行。',
};

/**
 * 获取卦象简要解释
 */
export function getHexagramBrief(name: string): string {
    return HEXAGRAM_BRIEF[name] || '此卦象征变化与机遇，宜静观其变。';
}

// ============= 六爻传统分析系统 =============

// 六亲类型
export type LiuQin = '父母' | '兄弟' | '子孙' | '妻财' | '官鬼';

// 六神类型
export type LiuShen = '青龙' | '朱雀' | '勾陈' | '螣蛇' | '白虎' | '玄武';

// 完整爻信息（扩展基础 Yao）
export interface FullYaoInfo extends Yao {
    liuQin: LiuQin;              // 六亲
    liuShen: LiuShen;            // 六神
    naJia: DiZhi;                // 纳甲地支
    wuXing: WuXing;              // 五行
    isShiYao: boolean;           // 是否世爻
    isYingYao: boolean;          // 是否应爻
    yaoText?: string;            // 爻辞
    emphasis?: 'low' | 'medium' | 'high';  // 权重
}

// 用神信息
export interface YongShen {
    type: LiuQin;                // 用神类型
    position: number;            // 用神所在爻位
    element: WuXing;             // 用神五行
    strength: 'weak' | 'moderate' | 'strong';  // 强弱
    analysis: string;            // 分析说明
}

export type YongShenSource = 'input';
export type YaoMovementState = 'static' | 'changing' | 'hidden_moving' | 'day_break';

export interface ChangedYaoDetail {
    type: YaoType;
    liuQin: LiuQin;
    naJia: DiZhi;
    wuXing: WuXing;
    liuShen: LiuShen;
    yaoCi?: string;
    relation: string;
}

export interface YongShenCandidate {
    liuQin: LiuQin;
    naJia?: DiZhi;
    element: WuXing;
    position?: number;
    strengthScore: number;
    isStrong: boolean;
    strengthLabel: string;
    movementState: YaoMovementState;
    movementLabel: string;
    isShiYao: boolean;
    isYingYao: boolean;
    kongWangState?: YaoKongWangState;
    factors: string[];
}

type RankedYongShenCandidate = YongShenCandidate & { rankScore: number };

export interface YongShenGroup {
    targetLiuQin: LiuQin;
    source: YongShenSource;
    selected: YongShenCandidate;
    candidates: YongShenCandidate[];
}

export interface ShenSystemByYongShen extends ShenSystem {
    targetLiuQin: LiuQin;
}

// 时间建议
export interface TimeRecommendation {
    targetLiuQin: LiuQin;
    type: 'favorable' | 'unfavorable' | 'critical';
    earthlyBranch?: DiZhi;
    startDate: string;
    endDate: string;
    confidence: number;
    description: string;
}

// 天干
const TIANGAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const;

/**
 * 六神配置（根据日干）
 * 顺序为：初爻→上爻
 */
const LIU_SHEN_CONFIG: Record<string, LiuShen[]> = {
    '甲': ['青龙', '朱雀', '勾陈', '螣蛇', '白虎', '玄武'],
    '乙': ['青龙', '朱雀', '勾陈', '螣蛇', '白虎', '玄武'],
    '丙': ['朱雀', '勾陈', '螣蛇', '白虎', '玄武', '青龙'],
    '丁': ['朱雀', '勾陈', '螣蛇', '白虎', '玄武', '青龙'],
    '戊': ['勾陈', '螣蛇', '白虎', '玄武', '青龙', '朱雀'],
    '己': ['螣蛇', '白虎', '玄武', '青龙', '朱雀', '勾陈'],
    '庚': ['白虎', '玄武', '青龙', '朱雀', '勾陈', '螣蛇'],
    '辛': ['白虎', '玄武', '青龙', '朱雀', '勾陈', '螣蛇'],
    '壬': ['玄武', '青龙', '朱雀', '勾陈', '螣蛇', '白虎'],
    '癸': ['玄武', '青龙', '朱雀', '勾陈', '螣蛇', '白虎'],
};

/**
 * 五行生克关系
 */
const WUXING_SHENG: Record<WuXing, WuXing> = {
    '木': '火', '火': '土', '土': '金', '金': '水', '水': '木',
};

const WUXING_KE: Record<WuXing, WuXing> = {
    '木': '土', '土': '水', '水': '火', '火': '金', '金': '木',
};

// 被生
const WUXING_BEI_SHENG: Record<WuXing, WuXing> = {
    '火': '木', '土': '火', '金': '土', '水': '金', '木': '水',
};

// 被克
const WUXING_BEI_KE: Record<WuXing, WuXing> = {
    '土': '木', '水': '土', '火': '水', '金': '火', '木': '金',
};

/**
 * 计算六神（根据日干）
 */
export function calculateLiuShen(dayStem: string): LiuShen[] {
    return LIU_SHEN_CONFIG[dayStem] || LIU_SHEN_CONFIG['甲'];
}

/**
 * 计算六亲
 * 根据爻的五行与卦宫五行的生克关系确定
 * 注：卦宫为"我"，爻为"彼"
 *
 * 兄弟：与卦宫同五行
 * 父母：生我者（爻生宫）
 * 子孙：我生者（宫生爻）
 * 妻财：我克者（宫克爻）
 * 官鬼：克我者（爻克宫）
 */
export function calculateLiuQin(yaoElement: WuXing, gongElement: WuXing): LiuQin {
    if (yaoElement === gongElement) {
        return '兄弟';
    }
    // 生我者为父母（爻生宫：yaoElement → gongElement）
    if (WUXING_SHENG[yaoElement] === gongElement) {
        return '父母';
    }
    // 我生者为子孙（宫生爻：gongElement → yaoElement）
    if (WUXING_SHENG[gongElement] === yaoElement) {
        return '子孙';
    }
    // 我克者为妻财（宫克爻：gongElement 克 yaoElement）
    if (WUXING_KE[gongElement] === yaoElement) {
        return '妻财';
    }
    // 克我者为官鬼（爻克宫：yaoElement 克 gongElement）
    if (WUXING_KE[yaoElement] === gongElement) {
        return '官鬼';
    }
    return '兄弟'; // 默认
}

export const LIU_QIN_TARGETS: LiuQin[] = ['父母', '兄弟', '子孙', '妻财', '官鬼'];

export function normalizeYongShenTargets(targets?: readonly unknown[]): LiuQin[] {
    if (!targets || targets.length === 0) return [];
    const uniqueTargets = new Set<LiuQin>();
    for (const target of targets) {
        if (typeof target === 'string' && LIU_QIN_TARGETS.includes(target as LiuQin)) {
            uniqueTargets.add(target as LiuQin);
        }
    }
    return Array.from(uniqueTargets);
}

export function hasInvalidYongShenTargets(targets?: readonly unknown[]): boolean {
    if (!targets || targets.length === 0) return false;
    return targets.some((target) => typeof target !== 'string' || !LIU_QIN_TARGETS.includes(target as LiuQin));
}

function resolveYongShenTargets(targets: readonly unknown[] | undefined, question?: string): LiuQin[] {
    const normalizedTargets = normalizeYongShenTargets(targets);
    const requiresTargets = typeof question === 'string' && question.trim().length > 0;
    if (requiresTargets && normalizedTargets.length === 0) {
        throw new Error('请至少选择一个分析目标');
    }
    return normalizedTargets;
}

function getYaoMovementState(yao: FullYaoInfoExtended): YaoMovementState {
    if (yao.change === 'changing') {
        return 'changing';
    }
    if (yao.strength.specialStatus === 'anDong') {
        return 'hidden_moving';
    }
    if (yao.strength.specialStatus === 'riPo') {
        return 'day_break';
    }
    return 'static';
}

function scoreYongShenCandidate(params: {
    strengthScore: number;
    movementState: YaoMovementState;
    isShiYao: boolean;
    isYingYao: boolean;
    kongWangState: YaoKongWangState;
}): number {
    const { strengthScore, movementState, isShiYao, isYingYao, kongWangState } = params;
    let score = strengthScore;

    if (movementState === 'changing') score += 12;
    if (movementState === 'hidden_moving') score += 10;
    if (movementState === 'day_break') score -= 25;

    if (isShiYao) score += 8;
    if (isYingYao) score += 4;

    if (kongWangState === 'kong_static') score -= 15;
    if (kongWangState === 'kong_changing') score -= 8;
    if (kongWangState === 'kong_ri_chong') score += 5;

    return Math.max(0, Math.min(100, score));
}

function stripCandidateScore(candidate: RankedYongShenCandidate): YongShenCandidate {
    const { rankScore, ...rest } = candidate;
    void rankScore;
    return rest;
}

function buildYongShenGroups(
    fullYaos: FullYaoInfoExtended[],
    explicitTargets: LiuQin[]
): YongShenGroup[] {
    const targetSpecs = explicitTargets.map(target => ({ target, source: 'input' as const }));

    return targetSpecs.map((spec) => {
        const rankedCandidates: RankedYongShenCandidate[] = fullYaos
            .filter(y => y.liuQin === spec.target)
            .map((y) => {
                const movementState = getYaoMovementState(y);
                const rankScore = scoreYongShenCandidate({
                    strengthScore: y.strength.score,
                    movementState,
                    isShiYao: y.isShiYao,
                    isYingYao: y.isYingYao,
                    kongWangState: y.kongWangState,
                });
                const factors: string[] = [];
                if (y.strength.isStrong) factors.push('月令生扶');
                if (movementState !== 'static') factors.push(MOVEMENT_LABELS[movementState]);
                if (y.kongWangState !== 'not_kong') factors.push(KONG_WANG_LABELS[y.kongWangState]);
                if (y.isShiYao) factors.push('世爻');
                if (y.isYingYao) factors.push('应爻');
                return {
                    liuQin: y.liuQin,
                    naJia: y.naJia,
                    element: y.wuXing,
                    position: y.position,
                    strengthScore: y.strength.score,
                    isStrong: y.strength.isStrong,
                    strengthLabel: y.strength.isStrong ? '旺相' : '休囚',
                    movementState,
                    movementLabel: MOVEMENT_LABELS[movementState],
                    isShiYao: y.isShiYao,
                    isYingYao: y.isYingYao,
                    kongWangState: y.kongWangState,
                    rankScore,
                    factors,
                } satisfies RankedYongShenCandidate;
            })
            .sort((a, b) => b.rankScore - a.rankScore);

        const selected = rankedCandidates[0] ?? {
            liuQin: spec.target,
            element: '土' as WuXing,
            strengthScore: 0,
            isStrong: false,
            strengthLabel: '未取到',
            movementState: 'static' as YaoMovementState,
            movementLabel: MOVEMENT_LABELS.static,
            isShiYao: false,
            isYingYao: false,
            kongWangState: 'not_kong' as YaoKongWangState,
            rankScore: 0,
            factors: ['目标六亲不上卦'],
        } satisfies RankedYongShenCandidate;

        return {
            targetLiuQin: spec.target,
            source: spec.source,
            selected: stripCandidateScore(selected),
            candidates: rankedCandidates.slice(1).map(stripCandidateScore),
        };
    });
}

function buildFuShenFallbackCandidate(params: {
    target: LiuQin;
    fuShenList?: FuShen[];
    fullYaos: FullYaoInfoExtended[];
    kongWang: KongWang;
}): RankedYongShenCandidate | undefined {
    const { target, fuShenList, fullYaos, kongWang } = params;
    if (!fuShenList || fuShenList.length === 0) {
        return undefined;
    }

    const sorted = [...fuShenList].sort((a, b) => {
        if (a.isAvailable === b.isAvailable) {
            return a.feiShenPosition - b.feiShenPosition;
        }
        return a.isAvailable ? -1 : 1;
    });
    const selectedFuShen = sorted[0];
    const attachedYao = fullYaos.find(yao => yao.position === selectedFuShen.feiShenPosition);
    const kongWangState: YaoKongWangState = kongWang.kongDizhi.includes(selectedFuShen.naJia)
        ? 'kong_static'
        : 'not_kong';
    const strengthScore = selectedFuShen.isAvailable ? 58 : 38;
    const rankScore = scoreYongShenCandidate({
        strengthScore,
        movementState: 'static',
        isShiYao: attachedYao?.isShiYao ?? false,
        isYingYao: attachedYao?.isYingYao ?? false,
        kongWangState,
    });

    return {
        liuQin: target,
        naJia: selectedFuShen.naJia,
        element: selectedFuShen.wuXing,
        position: selectedFuShen.feiShenPosition,
        strengthScore,
        isStrong: strengthScore >= 50,
        strengthLabel: selectedFuShen.isAvailable ? '伏神可取' : '伏神待用',
        movementState: 'static',
        movementLabel: selectedFuShen.isAvailable ? '伏藏可用' : '伏藏受制',
        isShiYao: attachedYao?.isShiYao ?? false,
        isYingYao: attachedYao?.isYingYao ?? false,
        kongWangState,
        rankScore,
        factors: [
            `用神${target}不上卦，转取伏神`,
            selectedFuShen.availabilityReason,
        ],
    } satisfies RankedYongShenCandidate;
}

function toDateString(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function addDaysToDateString(dateString: string, days: number): string {
    const date = new Date(`${dateString}T00:00:00`);
    date.setDate(date.getDate() + days);
    return toDateString(date);
}

function minDateString(a: string, b: string): string {
    return a <= b ? a : b;
}

function calculateTimeWindowByBranch(
    baseDate: Date,
    baseDayZhi: DiZhi,
    targetBranch?: DiZhi,
    horizonDays = 90
): { startDate: string; endDate: string } {
    if (!targetBranch) {
        const start = new Date(baseDate);
        start.setDate(start.getDate() + 1);
        const end = new Date(baseDate);
        end.setDate(end.getDate() + Math.min(horizonDays, 30));
        return { startDate: toDateString(start), endDate: toDateString(end) };
    }

    const baseIdx = DIZHI_INDEX[baseDayZhi];
    const targetIdx = DIZHI_INDEX[targetBranch];
    const offset = (targetIdx - baseIdx + 12) % 12;

    const first = new Date(baseDate);
    first.setDate(first.getDate() + offset);

    const second = new Date(first);
    second.setDate(second.getDate() + 12);
    const horizonEnd = new Date(baseDate);
    horizonEnd.setDate(horizonEnd.getDate() + horizonDays);

    return {
        startDate: toDateString(first),
        endDate: toDateString(second <= horizonEnd ? second : first),
    };
}

function getTimeRecommendationConfidence(params: {
    isStrong: boolean;
    movementState: YaoMovementState;
    kongWangState?: YaoKongWangState;
    type: 'favorable' | 'unfavorable' | 'critical';
}): number {
    const { isStrong, movementState, kongWangState, type } = params;
    let score = 0.5;
    if (isStrong) score += 0.2;
    if (movementState === 'changing' || movementState === 'hidden_moving') score += 0.15;
    if (movementState === 'day_break') score -= 0.25;
    if (kongWangState === 'kong_static') score -= 0.15;
    if (type === 'critical') score += 0.05;
    if (type === 'unfavorable') score -= 0.05;
    return Number(Math.max(0, Math.min(1, score)).toFixed(2));
}

function calculateTimeRecommendations(
    yongShenGroups: YongShenGroup[],
    baseDate: Date,
    dayZhi: DiZhi
): TimeRecommendation[] {
    const recommendations: TimeRecommendation[] = [];

    for (const group of yongShenGroups) {
        const selected = group.selected;
        const timeWindow = calculateTimeWindowByBranch(baseDate, dayZhi, selected.naJia);
        const criticalStart = selected.movementState === 'day_break'
            ? timeWindow.startDate
            : minDateString(addDaysToDateString(timeWindow.startDate, 1), timeWindow.endDate);
        const criticalEnd = minDateString(
            addDaysToDateString(
                criticalStart,
                selected.movementState === 'changing' || selected.movementState === 'hidden_moving' ? 5 : 3
            ),
            timeWindow.endDate
        );

        recommendations.push({
            targetLiuQin: group.targetLiuQin,
            type: 'favorable',
            earthlyBranch: selected.naJia,
            startDate: timeWindow.startDate,
            endDate: timeWindow.endDate,
            confidence: getTimeRecommendationConfidence({
                isStrong: selected.isStrong,
                movementState: selected.movementState,
                kongWangState: selected.kongWangState,
                type: 'favorable',
            }),
            description: selected.naJia
                ? `用神${group.targetLiuQin}逢${selected.naJia}日/月较易推进，宜主动布局`
                : `用神${group.targetLiuQin}在窗口内偏顺势，宜按节奏推进`,
        });

        recommendations.push({
            targetLiuQin: group.targetLiuQin,
            type: 'critical',
            earthlyBranch: selected.naJia,
            startDate: criticalStart,
            endDate: criticalEnd,
            confidence: getTimeRecommendationConfidence({
                isStrong: selected.isStrong,
                movementState: selected.movementState,
                kongWangState: selected.kongWangState,
                type: 'critical',
            }),
            description: selected.movementState === 'day_break'
                ? `用神${group.targetLiuQin}日破，此段先看破中能否得救与转机`
                : `用神${group.targetLiuQin}关键观察节点，重点看应验与转折`,
        });
    }

    return recommendations;
}

/**
 * 计算完整爻信息
 */
export function calculateFullYaoInfo(
    yaos: Yao[],
    hexagramCode: string,
    dayStem: string
): FullYaoInfo[] {
    const palace = findPalace(hexagramCode);
    const gongElement = palace?.element || '土';
    const { shi, ying } = getShiYingPosition(hexagramCode);
    const liuShenList = calculateLiuShen(dayStem);
    const hexagram = findHexagram(hexagramCode);
    const hexagramText = hexagram ? getHexagramText(hexagram.name) : undefined;

    return yaos.map((yao, index) => {
        const position = yao.position;
        const naJia = palace ? getNaJia(palace, position, yao.type) : '子';
        const wuXing = DIZHI_WUXING[naJia];
        const liuQin = calculateLiuQin(wuXing, gongElement);
        const liuShen = liuShenList[index];

        // 获取爻辞
        let yaoTextContent: string | undefined;
        let emphasis: 'low' | 'medium' | 'high' | undefined;

        if (hexagramText) {
            const yaoData = hexagramText.yao.find(y => y.position === position);
            if (yaoData) {
                yaoTextContent = yaoData.text;
                emphasis = yaoData.emphasis;
            }
        }

        return {
            ...yao,
            liuQin,
            liuShen,
            naJia,
            wuXing,
            isShiYao: position === shi,
            isYingYao: position === ying,
            yaoText: yaoTextContent,
            emphasis,
        };
    });
}

/**
 * 获取指定日期的天干
 * @param date 日期对象
 */
export function getDayStemForDate(date: Date): string {
    const baseDate = new Date(1900, 0, 1);
    const diffDays = Math.floor((date.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
    const ganIndex = (diffDays + 10) % 10;
    return TIANGAN[ganIndex];
}

/**
 * 获取今日天干
 */
export function getTodayDayStem(): string {
    return getDayStemForDate(new Date());
}

/**
 * 获取六神含义
 */
export function getLiuShenMeaning(liuShen: LiuShen): string {
    const meanings: Record<LiuShen, string> = {
        '青龙': '吉庆、喜事、贵人',
        '朱雀': '口舌、文书、信息',
        '勾陈': '田土、争斗、迟滞',
        '螣蛇': '虚惊、怪异、变化',
        '白虎': '凶险、疾病、丧事',
        '玄武': '暗昧、盗贼、私情',
    };
    return meanings[liuShen];
}

/**
 * 获取六亲含义
 */
export function getLiuQinMeaning(liuQin: LiuQin): string {
    const meanings: Record<LiuQin, string> = {
        '父母': '长辈、文书、房屋、车辆',
        '兄弟': '同辈、朋友、竞争、破财',
        '子孙': '晚辈、福神、解忧、医药',
        '妻财': '妻子、钱财、物品、仆人',
        '官鬼': '官职、丈夫、疾病、鬼神',
    };
    return meanings[liuQin];
}

// 导出五行类型供其他模块使用
export type { WuXing, DiZhi, Palace };

// ============= 六爻扩展分析系统 (P0/P1/P2) =============

import { Solar } from 'lunar-javascript';

// ============= 新增类型定义 =============

/** 天干类型 */
export type TianGan = '甲' | '乙' | '丙' | '丁' | '戊' | '己' | '庚' | '辛' | '壬' | '癸';

/** 干支对 */
export interface GanZhi {
    gan: TianGan;
    zhi: DiZhi;
}

/** 完整干支时间（四柱） */
export interface GanZhiTime {
    year: GanZhi;
    month: GanZhi;
    day: GanZhi;
    hour: GanZhi;
    xun: string;  // 日柱所属旬
}

/** 旬空信息 */
export interface KongWang {
    xun: string;
    kongDizhi: [DiZhi, DiZhi];
}

/** 四柱旬空信息 */
export interface KongWangByPillar {
    year: KongWang;
    month: KongWang;
    day: KongWang;
    hour: KongWang;
}

/** 爻的空亡状态 */
export type YaoKongWangState =
    | 'not_kong'        // 不空亡
    | 'kong_static'     // 真空（静爻空亡）
    | 'kong_changing'   // 动不为空
    | 'kong_ri_chong'   // 冲空不空
    | 'kong_yue_jian';  // 临月建不空

/** 月建日辰作用类型 */
export type YaoAction = 'sheng' | 'ke' | 'fu' | 'chong' | 'he' | 'po' | 'none';

/** 月建日辰影响 */
export interface YaoInfluence {
    monthAction: YaoAction;
    dayAction: YaoAction;
    description: string;
}

/** 旺衰五态 */
export type WangShuai = 'wang' | 'xiang' | 'xiu' | 'qiu' | 'si';

/** 旺衰标签 */
export const WANG_SHUAI_LABELS: Record<WangShuai, string> = {
    wang: '旺', xiang: '相', xiu: '休', qiu: '囚', si: '死',
};

/** 空亡状态标签 */
export const KONG_WANG_LABELS: Record<YaoKongWangState, string> = {
    'not_kong': '',
    'kong_static': '空',
    'kong_changing': '动空',
    'kong_ri_chong': '冲空',
    'kong_yue_jian': '临建',
};

/** 爻的特殊状态（暗动/日破） */
export type YaoSpecialStatus = 'none' | 'anDong' | 'riPo';

/** 爻特殊状态标签 */
export const SPECIAL_STATUS_LABELS: Record<YaoSpecialStatus, string> = {
    'none': '',
    'anDong': '暗动',
    'riPo': '日破',
};

export const MOVEMENT_LABELS: Record<YaoMovementState, string> = {
    static: '静',
    changing: '明动',
    hidden_moving: '暗动',
    day_break: '日破',
};

/** 爻的综合强度 */
export interface YaoStrength {
    wangShuai: WangShuai;
    score: number;       // 0-100
    factors: string[];
    isStrong: boolean;
    specialStatus: YaoSpecialStatus;  // 暗动/日破状态
}

/** 动爻变化类型 */
export type HuaType =
    | 'huaJin'       // 化进（变爻地支序数增加）
    | 'huaTui'       // 化退（变爻地支序数减少）
    | 'huiTouSheng'  // 回头生（变爻五行生本爻）
    | 'huiTouKe'     // 回头克（变爻五行克本爻）
    | 'huaKong'      // 化空（变爻落入空亡）
    | 'huaMu'        // 化墓（变爻为本爻的墓库）
    | 'fuYin'        // 伏吟（变爻与本爻相同）
    | 'fanYin'       // 反吟（变爻与本爻六冲）
    | 'none';        // 无特殊变化

/** 动爻变化分析结果 */
export interface YaoChangeAnalysis {
    huaType: HuaType;
    originalZhi: DiZhi;
    changedZhi: DiZhi;
    description: string;
}

/** 地支关系 */
export interface DiZhiRelation {
    liuHe: boolean;
    liuChong: boolean;
    xing: boolean;
    hai: boolean;
    po: boolean;
    heResult?: WuXing;  // 合化结果
}

/** 伏神信息 */
export interface FuShen {
    liuQin: LiuQin;
    wuXing: WuXing;
    naJia: DiZhi;
    feiShenPosition: number;    // 飞神（伏神所伏之爻）位置
    feiShenLiuQin: LiuQin;
    isAvailable: boolean;       // 是否可用
    availabilityReason: string;
}

/** 神系成员 */
export interface ShenMember {
    liuQin: LiuQin;
    wuXing: WuXing;
    positions: number[];
}

/** 原神/忌神/仇神体系 */
export interface ShenSystem {
    yuanShen?: ShenMember;  // 原神：生用神者
    jiShen?: ShenMember;    // 忌神：克用神者
    chouShen?: ShenMember;  // 仇神：克原神者
}

/** 扩展爻信息 */
export interface FullYaoInfoExtended extends FullYaoInfo {
    isChanging: boolean;
    movementState: YaoMovementState;
    movementLabel: string;
    kongWangState: YaoKongWangState;
    influence: YaoInfluence;
    strength: YaoStrength;
    changeAnalysis?: YaoChangeAnalysis;
    changedYao: ChangedYaoDetail | null;
    shenSha: string[];
    changSheng?: {                    // 十二长生状态
        stage: ShiErChangSheng;
        strength: 'strong' | 'medium' | 'weak';
    };
}

/** 六冲卦信息 */
export interface LiuChongGuaInfo {
    isLiuChongGua: boolean;
    description?: string;
}

/** 完整六爻分析结果 */
export interface LiuYaoFullAnalysis {
    ganZhiTime: GanZhiTime;
    kongWang: KongWang;
    kongWangByPillar: KongWangByPillar;
    fullYaos: FullYaoInfoExtended[];
    yongShen: YongShenGroup[];
    fuShen?: FuShen[];
    shenSystemByYongShen: ShenSystemByYongShen[];
    globalShenSha: string[];
    timeRecommendations: TimeRecommendation[];
    liuChongGuaInfo: LiuChongGuaInfo;  // 六冲卦判定
    sanHeAnalysis: SanHeAnalysis;       // 三合局分析
    warnings?: string[];
}

// ============= 数据表定义 =============

/** 天干五行对照表 */
export const TIANGAN_WUXING: Record<TianGan, WuXing> = {
    '甲': '木', '乙': '木',
    '丙': '火', '丁': '火',
    '戊': '土', '己': '土',
    '庚': '金', '辛': '金',
    '壬': '水', '癸': '水',
};

/** 地支序数（用于计算旬空和进退） */
const DIZHI_INDEX: Record<DiZhi, number> = {
    '子': 0, '丑': 1, '寅': 2, '卯': 3, '辰': 4, '巳': 5,
    '午': 6, '未': 7, '申': 8, '酉': 9, '戌': 10, '亥': 11,
};

/** 天干序数 */
const TIANGAN_INDEX: Record<TianGan, number> = {
    '甲': 0, '乙': 1, '丙': 2, '丁': 3, '戊': 4,
    '己': 5, '庚': 6, '辛': 7, '壬': 8, '癸': 9,
};

/** 旬空表（六甲旬对应的空亡地支） */
export const XUN_KONG_TABLE: Record<string, [DiZhi, DiZhi]> = {
    '甲子旬': ['戌', '亥'],
    '甲戌旬': ['申', '酉'],
    '甲申旬': ['午', '未'],
    '甲午旬': ['辰', '巳'],
    '甲辰旬': ['寅', '卯'],
    '甲寅旬': ['子', '丑'],
};

/** 月令旺衰表：月支 → 五行 → 旺衰状态 */
export const WANG_SHUAI_TABLE: Record<DiZhi, Record<WuXing, WangShuai>> = {
    // 春季：木旺火相水休金囚土死
    '寅': { '木': 'wang', '火': 'xiang', '水': 'xiu', '金': 'qiu', '土': 'si' },
    '卯': { '木': 'wang', '火': 'xiang', '水': 'xiu', '金': 'qiu', '土': 'si' },
    '辰': { '土': 'wang', '金': 'xiang', '火': 'xiu', '木': 'qiu', '水': 'si' },  // 辰为土旺
    // 夏季：火旺土相木休水囚金死
    '巳': { '火': 'wang', '土': 'xiang', '木': 'xiu', '水': 'qiu', '金': 'si' },
    '午': { '火': 'wang', '土': 'xiang', '木': 'xiu', '水': 'qiu', '金': 'si' },
    '未': { '土': 'wang', '金': 'xiang', '火': 'xiu', '木': 'qiu', '水': 'si' },  // 未为土旺
    // 秋季：金旺水相土休火囚木死
    '申': { '金': 'wang', '水': 'xiang', '土': 'xiu', '火': 'qiu', '木': 'si' },
    '酉': { '金': 'wang', '水': 'xiang', '土': 'xiu', '火': 'qiu', '木': 'si' },
    '戌': { '土': 'wang', '金': 'xiang', '火': 'xiu', '木': 'qiu', '水': 'si' },  // 戌为土旺
    // 冬季：水旺木相金休土囚火死
    '亥': { '水': 'wang', '木': 'xiang', '金': 'xiu', '土': 'qiu', '火': 'si' },
    '子': { '水': 'wang', '木': 'xiang', '金': 'xiu', '土': 'qiu', '火': 'si' },
    '丑': { '土': 'wang', '金': 'xiang', '火': 'xiu', '木': 'qiu', '水': 'si' },  // 丑为土旺
};

/** 六冲表 */
export const LIU_CHONG: Record<DiZhi, DiZhi> = {
    '子': '午', '丑': '未', '寅': '申', '卯': '酉', '辰': '戌', '巳': '亥',
    '午': '子', '未': '丑', '申': '寅', '酉': '卯', '戌': '辰', '亥': '巳',
};

/** 六合表及合化结果 */
export const LIU_HE: Record<DiZhi, { partner: DiZhi; result: WuXing }> = {
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
    '午': { partner: '未', result: '火' },  // 午未合火（或土）
    '未': { partner: '午', result: '火' },
};

/** 六害表 */
export const LIU_HAI: Record<DiZhi, DiZhi> = {
    '子': '未', '丑': '午', '寅': '巳', '卯': '辰',
    '辰': '卯', '巳': '寅', '午': '丑', '未': '子',
    '申': '亥', '酉': '戌', '戌': '酉', '亥': '申',
};

/** 相刑表（简化版：只记录主要刑关系） */
export const XIANG_XING: Record<DiZhi, DiZhi[]> = {
    '寅': ['巳', '申'],  // 寅巳申三刑
    '巳': ['寅', '申'],
    '申': ['寅', '巳'],
    '丑': ['戌', '未'],  // 丑戌未三刑
    '戌': ['丑', '未'],
    '未': ['丑', '戌'],
    '子': ['卯'],        // 子卯相刑
    '卯': ['子'],
    '辰': ['辰'],        // 自刑
    '午': ['午'],
    '酉': ['酉'],
    '亥': ['亥'],
};

/** 相破表 */
export const XIANG_PO: Record<DiZhi, DiZhi> = {
    '子': '酉', '酉': '子',
    '丑': '辰', '辰': '丑',
    '寅': '亥', '亥': '寅',
    '卯': '午', '午': '卯',
    '巳': '申', '申': '巳',
    '未': '戌', '戌': '未',
};

/** 五行墓库表 */
export const WUXING_MU: Record<WuXing, DiZhi> = {
    '木': '未',  // 木墓在未
    '火': '戌',  // 火墓在戌
    '土': '戌',  // 土墓在戌
    '金': '丑',  // 金墓在丑
    '水': '辰',  // 水墓在辰
};

// ============= 三合局 (San He) 数据表 =============

/** 三合局类型 */
export type SanHeJu = '申子辰合水局' | '亥卯未合木局' | '寅午戌合火局' | '巳酉丑合金局';

/** 三合局配置：三个地支组成一个五行局 */
export const SAN_HE_TABLE: { branches: [DiZhi, DiZhi, DiZhi]; result: WuXing; name: SanHeJu }[] = [
    { branches: ['申', '子', '辰'], result: '水', name: '申子辰合水局' },
    { branches: ['亥', '卯', '未'], result: '木', name: '亥卯未合木局' },
    { branches: ['寅', '午', '戌'], result: '火', name: '寅午戌合火局' },
    { branches: ['巳', '酉', '丑'], result: '金', name: '巳酉丑合金局' },
];

/** 半合表：两个地支可以形成半合 */
export const BAN_HE_TABLE: { branches: [DiZhi, DiZhi]; result: WuXing; type: 'sheng' | 'mu' }[] = [
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

/** 三合局分析结果 */
export interface SanHeAnalysis {
    hasFullSanHe: boolean;           // 是否有完整三合
    fullSanHe?: {
        name: SanHeJu;
        result: WuXing;
        positions: number[];         // 参与三合的爻位
    };
    hasBanHe: boolean;               // 是否有半合
    banHe?: {
        branches: [DiZhi, DiZhi];
        result: WuXing;
        type: 'sheng' | 'mu';
        positions: number[];
    }[];
}

// ============= 十二长生 (Twelve Life Stages) 数据表 =============

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
 * 说明：
 * - 阳干（甲丙戊庚壬）顺行
 * - 阴干（乙丁己辛癸）逆行
 * - 这里采用五行通用的长生位
 * 
 * 木长生在亥、火长生在寅、金长生在巳、水长生在申、土长生在申（或寅，有争议）
 */
export const WUXING_CHANG_SHENG_TABLE: Record<WuXing, Record<DiZhi, ShiErChangSheng>> = {
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

// ============= P0: 干支时间计算函数 =============

/**
 * 根据干支计算所属旬（通用）
 */
export function getXunFromGanZhi(gan: TianGan, zhi: DiZhi): string {
    const ganIndex = TIANGAN_INDEX[gan];
    const zhiIndex = DIZHI_INDEX[zhi];
    // 计算旬首的地支索引：日支索引 - 日干索引（取模12）
    const xunStartZhiIndex = (zhiIndex - ganIndex + 12) % 12;
    const xunNames: Record<number, string> = {
        0: '甲子旬', 2: '甲寅旬', 4: '甲辰旬',
        6: '甲午旬', 8: '甲申旬', 10: '甲戌旬',
    };
    return xunNames[xunStartZhiIndex] || '甲子旬';
}

/**
 * 根据日干支计算所属旬（兼容旧接口）
 */
export function getXunFromDayGanZhi(dayGan: TianGan, dayZhi: DiZhi): string {
    return getXunFromGanZhi(dayGan, dayZhi);
}

/**
 * 使用 lunar-javascript 计算完整干支时间
 * 采用子初换日规则（23:00开始算新日）
 */
export function calculateGanZhiTime(date: Date): GanZhiTime {
    const solar = Solar.fromYmdHms(
        date.getFullYear(),
        date.getMonth() + 1,
        date.getDate(),
        date.getHours(),
        date.getMinutes(),
        0
    );
    const lunar = solar.getLunar();
    const eightChar = lunar.getEightChar();

    // 设置子初换日规则：23:00开始算新日
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (eightChar as any).setSect(1);

    const dayGan = eightChar.getDayGan() as TianGan;
    const dayZhi = eightChar.getDayZhi() as DiZhi;

    return {
        year: {
            gan: eightChar.getYearGan() as TianGan,
            zhi: eightChar.getYearZhi() as DiZhi,
        },
        month: {
            gan: eightChar.getMonthGan() as TianGan,
            zhi: eightChar.getMonthZhi() as DiZhi,
        },
        day: {
            gan: dayGan,
            zhi: dayZhi,
        },
        hour: {
            gan: eightChar.getTimeGan() as TianGan,
            zhi: eightChar.getTimeZhi() as DiZhi,
        },
        xun: getXunFromDayGanZhi(dayGan, dayZhi),
    };
}

// ============= P0: 旬空计算函数 =============

/**
 * 根据日柱获取旬空信息
 */
export function getKongWang(dayGan: TianGan, dayZhi: DiZhi): KongWang {
    const xun = getXunFromDayGanZhi(dayGan, dayZhi);
    return {
        xun,
        kongDizhi: XUN_KONG_TABLE[xun],
    };
}

/**
 * 计算四柱旬空（年/月/日/时）
 * 注：六爻断卦判空亡仍以“日旬空”为主，其他柱旬空供参考
 */
export function calculateKongWangByPillar(ganZhiTime: GanZhiTime): KongWangByPillar {
    return {
        year: getKongWang(ganZhiTime.year.gan, ganZhiTime.year.zhi),
        month: getKongWang(ganZhiTime.month.gan, ganZhiTime.month.zhi),
        day: getKongWang(ganZhiTime.day.gan, ganZhiTime.day.zhi),
        hour: getKongWang(ganZhiTime.hour.gan, ganZhiTime.hour.zhi),
    };
}

/**
 * 检查爻的空亡状态
 */
export function checkYaoKongWang(
    yaoZhi: DiZhi,
    kongWang: KongWang,
    monthZhi: DiZhi,
    dayZhi: DiZhi,
    isChanging: boolean
): YaoKongWangState {
    // 不在空亡地支中，不空
    if (!kongWang.kongDizhi.includes(yaoZhi)) {
        return 'not_kong';
    }
    // 动爻不为空（动不为空）
    if (isChanging) {
        return 'kong_changing';
    }
    // 日辰冲空则不空
    if (LIU_CHONG[yaoZhi] === dayZhi) {
        return 'kong_ri_chong';
    }
    // 临月建不空
    if (yaoZhi === monthZhi) {
        return 'kong_yue_jian';
    }
    // 真空
    return 'kong_static';
}

// ============= P0: 月建日辰作用判定 =============

/**
 * 获取地支对爻的作用（月建或日辰对爻）
 */
export function getZhiAction(sourceZhi: DiZhi, targetZhi: DiZhi): YaoAction {
    // 六冲
    if (LIU_CHONG[sourceZhi] === targetZhi) {
        return 'chong';
    }
    // 六合
    if (LIU_HE[sourceZhi]?.partner === targetZhi) {
        return 'he';
    }
    // 相破
    if (XIANG_PO[sourceZhi] === targetZhi) {
        return 'po';
    }

    const sourceWuXing = DIZHI_WUXING[sourceZhi];
    const targetWuXing = DIZHI_WUXING[targetZhi];

    // 比和（扶）
    if (sourceWuXing === targetWuXing) {
        return 'fu';
    }
    // 生
    if (WUXING_SHENG[sourceWuXing] === targetWuXing) {
        return 'sheng';
    }
    // 克
    if (WUXING_KE[sourceWuXing] === targetWuXing) {
        return 'ke';
    }

    return 'none';
}

/** 作用类型标签 */
const ACTION_LABELS: Record<YaoAction, string> = {
    sheng: '生', ke: '克', fu: '扶', chong: '冲', he: '合', po: '破', none: '',
};

/**
 * 获取月建日辰对爻的综合影响
 */
export function getYaoInfluence(yaoZhi: DiZhi, monthZhi: DiZhi, dayZhi: DiZhi): YaoInfluence {
    const monthAction = getZhiAction(monthZhi, yaoZhi);
    const dayAction = getZhiAction(dayZhi, yaoZhi);

    // 构建描述
    const parts: string[] = [];
    if (monthAction !== 'none') {
        parts.push(`月${ACTION_LABELS[monthAction]}`);
    }
    if (dayAction !== 'none') {
        parts.push(`日${ACTION_LABELS[dayAction]}`);
    }

    return {
        monthAction,
        dayAction,
        description: parts.length > 0 ? parts.join('、') : '无特殊作用',
    };
}

/**
 * 计算爻的综合强度
 * 
 * 关键逻辑优化：
 * - 暗动（静爻旺相逢日冲）：力量大增
 * - 日破（静爻休囚逢日冲）：完全无力
 */
export function calculateYaoStrength(
    yaoWuXing: WuXing,
    monthZhi: DiZhi,
    _dayZhi: DiZhi,  // 保留参数以保持API一致性，实际使用influence中的dayAction
    isChanging: boolean,
    kongWangState: YaoKongWangState,
    influence: YaoInfluence
): YaoStrength {
    const factors: string[] = [];
    let score = 50; // 基础分
    let specialStatus: YaoSpecialStatus = 'none';

    // 1. 月令旺衰（权重最大，±40分）
    const wangShuai = WANG_SHUAI_TABLE[monthZhi][yaoWuXing];
    const wangShuaiScores: Record<WangShuai, number> = {
        wang: 40, xiang: 25, xiu: 0, qiu: -15, si: -25,
    };
    score += wangShuaiScores[wangShuai];
    factors.push(`月令${WANG_SHUAI_LABELS[wangShuai]}`);

    // 判断是否旺相（用于暗动/日破判断）
    const isWangXiang = wangShuai === 'wang' || wangShuai === 'xiang';

    // 2. 日辰作用（关键：区分暗动与日破）
    if (influence.dayAction === 'sheng') {
        score += 15;
        factors.push('日生');
    } else if (influence.dayAction === 'fu') {
        score += 12;
        factors.push('日扶');
    } else if (influence.dayAction === 'ke') {
        score -= 15;
        factors.push('日克');
    } else if (influence.dayAction === 'chong') {
        // ========== 核心修改：暗动与日破的区分 ==========
        if (isChanging) {
            // 动爻逢冲：冲散，减分
            score -= 20;
            factors.push('冲散');
        } else {
            // 静爻逢冲：需判断旺衰
            if (isWangXiang) {
                // 旺相逢冲 = 暗动（大吉/有力，力量甚至超过动爻）
                specialStatus = 'anDong';
                score += 30;
                factors.push('暗动');
            } else {
                // 休囚逢冲 = 日破（大凶/无力，直接归零）
                specialStatus = 'riPo';
                score = 0;
                factors.push('日破');
            }
        }
    }

    // 3. 月建作用（±10分）- 只有非日破时才计算
    if (specialStatus !== 'riPo') {
        if (influence.monthAction === 'sheng') {
            score += 10;
            factors.push('月生');
        } else if (influence.monthAction === 'fu') {
            score += 8;
            factors.push('月扶');
        } else if (influence.monthAction === 'ke') {
            score -= 10;
            factors.push('月克');
        } else if (influence.monthAction === 'chong') {
            score -= 8;
            factors.push('月冲');
        }
    }

    // 4. 空亡影响 - 只有非日破和非暗动时才计算
    if (specialStatus === 'none' && kongWangState === 'kong_static') {
        score -= 25;
        factors.push('空亡');
    }

    // 5. 动静状态 - 只有非暗动时才加分（暗动已经加过分了）
    if (isChanging && specialStatus === 'none') {
        score += 5;
        factors.push('动爻');
    }

    // 确保分数在0-100范围内
    score = Math.max(0, Math.min(100, score));

    return {
        wangShuai,
        score,
        factors,
        isStrong: score >= 50,
        specialStatus,
    };
}

// ============= P1: 动爻变化分析 =============

/** 化爻类型标签 */
export const HUA_TYPE_LABELS: Record<HuaType, string> = {
    huaJin: '化进',
    huaTui: '化退',
    huiTouSheng: '回头生',
    huiTouKe: '回头克',
    huaKong: '化空',
    huaMu: '化墓',
    fuYin: '伏吟',
    fanYin: '反吟',
    none: '',
};

/**
 * 分析动爻变化
 */
export function analyzeYaoChange(
    originalZhi: DiZhi,
    changedZhi: DiZhi,
    originalWuXing: WuXing,
    changedWuXing: WuXing,
    kongWang: KongWang
): YaoChangeAnalysis {
    // 伏吟：变爻地支与本爻相同
    if (originalZhi === changedZhi) {
        return {
            huaType: 'fuYin',
            originalZhi,
            changedZhi,
            description: '伏吟：变爻与本爻相同，事多反复',
        };
    }

    // 反吟：变爻与本爻六冲
    if (LIU_CHONG[originalZhi] === changedZhi) {
        return {
            huaType: 'fanYin',
            originalZhi,
            changedZhi,
            description: '反吟：变爻与本爻相冲，事情反复无常',
        };
    }

    // 化空：变爻落入空亡
    if (kongWang.kongDizhi.includes(changedZhi)) {
        return {
            huaType: 'huaKong',
            originalZhi,
            changedZhi,
            description: '化空：变爻落空，事难成就',
        };
    }

    // 化墓：变爻为本爻五行的墓库
    if (WUXING_MU[originalWuXing] === changedZhi) {
        return {
            huaType: 'huaMu',
            originalZhi,
            changedZhi,
            description: '化墓：变爻入墓，事情受阻',
        };
    }

    // 回头生：变爻五行生本爻五行
    if (WUXING_SHENG[changedWuXing] === originalWuXing) {
        return {
            huaType: 'huiTouSheng',
            originalZhi,
            changedZhi,
            description: '回头生：变爻生本爻，吉利',
        };
    }

    // 回头克：变爻五行克本爻五行
    if (WUXING_KE[changedWuXing] === originalWuXing) {
        return {
            huaType: 'huiTouKe',
            originalZhi,
            changedZhi,
            description: '回头克：变爻克本爻，不利',
        };
    }

    // 化进/化退：根据地支序数判断
    const originalIndex = DIZHI_INDEX[originalZhi];
    const changedIndex = DIZHI_INDEX[changedZhi];
    const diff = (changedIndex - originalIndex + 12) % 12;

    if (diff > 0 && diff <= 6) {
        return {
            huaType: 'huaJin',
            originalZhi,
            changedZhi,
            description: '化进：变爻进神，事情向好发展',
        };
    } else if (diff > 6) {
        return {
            huaType: 'huaTui',
            originalZhi,
            changedZhi,
            description: '化退：变爻退神，事情退步',
        };
    }

    return {
        huaType: 'none',
        originalZhi,
        changedZhi,
        description: '',
    };
}

// ============= P1: 地支关系判定 =============

/**
 * 获取两个地支之间的关系
 */
export function getDiZhiRelation(zhi1: DiZhi, zhi2: DiZhi): DiZhiRelation {
    const liuHe = LIU_HE[zhi1]?.partner === zhi2;
    const heResult = liuHe ? LIU_HE[zhi1].result : undefined;

    return {
        liuHe,
        liuChong: LIU_CHONG[zhi1] === zhi2,
        xing: XIANG_XING[zhi1]?.includes(zhi2) ?? false,
        hai: LIU_HAI[zhi1] === zhi2,
        po: XIANG_PO[zhi1] === zhi2,
        heResult,
    };
}

/**
 * 获取地支关系的描述
 */
export function getDiZhiRelationDescription(relation: DiZhiRelation): string {
    const parts: string[] = [];
    if (relation.liuHe) parts.push(`六合${relation.heResult ? `化${relation.heResult}` : ''}`);
    if (relation.liuChong) parts.push('六冲');
    if (relation.xing) parts.push('相刑');
    if (relation.hai) parts.push('相害');
    if (relation.po) parts.push('相破');
    return parts.join('、') || '无特殊关系';
}

// ============= 三合局分析 =============

/**
 * 分析卦中的三合局
 * 
 * 检查动爻、变爻以及月日支是否能形成三合局
 * 三合局能解冲、解空，并改变五行属性
 */
export function analyzeSanHe(
    fullYaos: FullYaoInfo[],
    changedYaos?: FullYaoInfo[],
    monthZhi?: DiZhi,
    dayZhi?: DiZhi
): SanHeAnalysis {
    // 收集所有参与的地支及其来源
    const dizhiSources: { zhi: DiZhi; position: number; source: 'dong' | 'bian' | 'yue' | 'ri' }[] = [];

    // 动爻的地支
    fullYaos.forEach(yao => {
        if (yao.change === 'changing') {
            dizhiSources.push({ zhi: yao.naJia, position: yao.position, source: 'dong' });
        }
    });

    // 变爻的地支
    if (changedYaos) {
        changedYaos.forEach((yao, index) => {
            if (fullYaos[index]?.change === 'changing') {
                dizhiSources.push({ zhi: yao.naJia, position: yao.position, source: 'bian' });
            }
        });
    }

    // 月日支也参与合局判断
    if (monthZhi) {
        dizhiSources.push({ zhi: monthZhi, position: 0, source: 'yue' });
    }
    if (dayZhi) {
        dizhiSources.push({ zhi: dayZhi, position: 0, source: 'ri' });
    }

    // 提取所有地支
    const allZhi = dizhiSources.map(s => s.zhi);

    // 检查完整三合
    let fullSanHe: SanHeAnalysis['fullSanHe'] = undefined;
    for (const sanHe of SAN_HE_TABLE) {
        const [b1, b2, b3] = sanHe.branches;
        if (allZhi.includes(b1) && allZhi.includes(b2) && allZhi.includes(b3)) {
            // 找到参与的爻位
            const positions = dizhiSources
                .filter(s => sanHe.branches.includes(s.zhi) && s.source !== 'yue' && s.source !== 'ri')
                .map(s => s.position)
                .filter((p, i, arr) => arr.indexOf(p) === i && p > 0);

            fullSanHe = {
                name: sanHe.name,
                result: sanHe.result,
                positions
            };
            break;
        }
    }

    // 检查半合
    const banHeList: SanHeAnalysis['banHe'] = [];
    for (const banHe of BAN_HE_TABLE) {
        const [b1, b2] = banHe.branches;
        if (allZhi.includes(b1) && allZhi.includes(b2)) {
            const positions = dizhiSources
                .filter(s => s.zhi === b1 || s.zhi === b2)
                .filter(s => s.source !== 'yue' && s.source !== 'ri')
                .map(s => s.position)
                .filter((p, i, arr) => arr.indexOf(p) === i && p > 0);

            if (positions.length > 0) {
                banHeList.push({
                    branches: banHe.branches,
                    result: banHe.result,
                    type: banHe.type,
                    positions
                });
            }
        }
    }

    return {
        hasFullSanHe: !!fullSanHe,
        fullSanHe,
        hasBanHe: banHeList.length > 0,
        banHe: banHeList.length > 0 ? banHeList : undefined
    };
}

// ============= 十二长生计算 =============

/**
 * 获取五行在某地支的十二长生状态
 */
export function getChangSheng(wuXing: WuXing, diZhi: DiZhi): ShiErChangSheng {
    return WUXING_CHANG_SHENG_TABLE[wuXing][diZhi];
}

/**
 * 获取十二长生的强弱等级
 */
export function getChangShengStrength(changSheng: ShiErChangSheng): 'strong' | 'medium' | 'weak' {
    return CHANG_SHENG_STRENGTH[changSheng];
}

/**
 * 计算爻在月令的十二长生状态
 */
export function calculateYaoChangSheng(
    yaoWuXing: WuXing,
    monthZhi: DiZhi
): { stage: ShiErChangSheng; strength: 'strong' | 'medium' | 'weak'; description: string } {
    const stage = getChangSheng(yaoWuXing, monthZhi);
    const strength = getChangShengStrength(stage);
    const description = CHANG_SHENG_LABELS[stage];

    return { stage, strength, description };
}

/**
 * 检查爻是否处于"绝处逢生"的状态
 * 
 * 绝处逢生：爻处于"绝"位，但得日月生扶或动爻生助
 */
export function checkJueChuFengSheng(
    yaoWuXing: WuXing,
    monthZhi: DiZhi,
    dayZhi: DiZhi,
    _isChanging: boolean,  // 保留参数以备将来扩展
    fullYaos: FullYaoInfo[]
): { isJueChuFengSheng: boolean; reason?: string } {
    const stage = getChangSheng(yaoWuXing, monthZhi);

    if (stage !== '绝') {
        return { isJueChuFengSheng: false };
    }

    // 检查日支是否生扶
    const dayWuXing = DIZHI_WUXING[dayZhi];
    if (WUXING_SHENG[dayWuXing] === yaoWuXing || dayWuXing === yaoWuXing) {
        return {
            isJueChuFengSheng: true,
            reason: '爻处绝地但得日辰生扶，绝处逢生'
        };
    }

    // 检查是否有动爻生助
    const changingYaos = fullYaos.filter(y => y.change === 'changing' && y.wuXing !== yaoWuXing);
    for (const changingYao of changingYaos) {
        if (WUXING_SHENG[changingYao.wuXing] === yaoWuXing) {
            return {
                isJueChuFengSheng: true,
                reason: `爻处绝地但得动爻${changingYao.wuXing}生助，绝处逢生`
            };
        }
    }

    return { isJueChuFengSheng: false };
}

// ============= P1: 伏神系统 =============

/**
 * 计算伏神
 * 当用神不上卦时，从本宫首卦找伏神
 */
export function calculateFuShen(
    hexagramCode: string,
    fullYaos: FullYaoInfo[],
    yongShenLiuQin: LiuQin,
    gongElement: WuXing,
    monthZhi: DiZhi,
    dayZhi: DiZhi,
    kongWang: KongWang
): FuShen[] {
    // 检查用神是否上卦
    const yongShenOnGua = fullYaos.some(y => y.liuQin === yongShenLiuQin);
    if (yongShenOnGua) {
        return []; // 用神上卦，不需要伏神
    }

    // 找到本宫
    const palace = findPalace(hexagramCode);
    if (!palace) {
        return [];
    }

    const fuShenList: FuShen[] = [];

    // 遍历六爻，找到伏神
    for (let position = 1; position <= 6; position++) {
        // 本宫首卦的阳爻纳甲
        const fuShenNaJia = palace.naJiaYang[position - 1];
        const fuShenWuXing = DIZHI_WUXING[fuShenNaJia];
        const fuShenLiuQin = calculateLiuQin(fuShenWuXing, gongElement);

        // 如果是用神的六亲
        if (fuShenLiuQin === yongShenLiuQin) {
            // 飞神是当前卦该爻位的爻
            const feiShenYao = fullYaos.find(y => y.position === position);
            if (!feiShenYao) continue;

            // 判断伏神可用性
            let isAvailable = true;
            let availabilityReason = '伏神可用';

            // 飞神克伏神则不可用
            if (WUXING_KE[feiShenYao.wuXing] === fuShenWuXing) {
                isAvailable = false;
                availabilityReason = '飞神克伏神，伏神不可用';
            }
            // 伏神空亡则不可用
            else if (kongWang.kongDizhi.includes(fuShenNaJia)) {
                isAvailable = false;
                availabilityReason = '伏神空亡，暂不可用';
            }
            // 飞神生伏神则可用
            else if (WUXING_SHENG[feiShenYao.wuXing] === fuShenWuXing) {
                isAvailable = true;
                availabilityReason = '飞神生伏神，伏神可用';
            }
            // 月日生扶伏神也可用
            else if (WUXING_SHENG[DIZHI_WUXING[monthZhi]] === fuShenWuXing ||
                WUXING_SHENG[DIZHI_WUXING[dayZhi]] === fuShenWuXing) {
                isAvailable = true;
                availabilityReason = '月日生扶伏神，伏神可用';
            }

            fuShenList.push({
                liuQin: fuShenLiuQin,
                wuXing: fuShenWuXing,
                naJia: fuShenNaJia,
                feiShenPosition: position,
                feiShenLiuQin: feiShenYao.liuQin,
                isAvailable,
                availabilityReason,
            });
        }
    }

    return fuShenList;
}

// ============= P2: 原神/忌神/仇神体系 =============

/**
 * 根据五行找六亲
 */
function getWuXingLiuQin(wuXing: WuXing, gongElement: WuXing): LiuQin {
    if (wuXing === gongElement) return '兄弟';
    if (WUXING_SHENG[wuXing] === gongElement) return '父母';
    if (WUXING_SHENG[gongElement] === wuXing) return '子孙';
    if (WUXING_KE[gongElement] === wuXing) return '妻财';
    if (WUXING_KE[wuXing] === gongElement) return '官鬼';
    return '兄弟';
}

/**
 * 计算原神、忌神、仇神体系
 */
export function calculateShenSystem(
    yongShen: YongShen,
    fullYaos: FullYaoInfo[],
    gongElement: WuXing
): ShenSystem {
    const yongShenWuXing = yongShen.element;

    // 原神：生用神者的五行
    const yuanShenWuXing = WUXING_BEI_SHENG[yongShenWuXing];
    const yuanShenLiuQin = getWuXingLiuQin(yuanShenWuXing, gongElement);

    // 忌神：克用神者的五行
    const jiShenWuXing = WUXING_BEI_KE[yongShenWuXing];
    const jiShenLiuQin = getWuXingLiuQin(jiShenWuXing, gongElement);

    // 仇神：克原神者的五行（也是生忌神者）
    const chouShenWuXing = WUXING_BEI_KE[yuanShenWuXing];
    const chouShenLiuQin = getWuXingLiuQin(chouShenWuXing, gongElement);

    // 在卦中找对应爻位
    const findPositions = (liuQin: LiuQin): number[] => {
        return fullYaos.filter(y => y.liuQin === liuQin).map(y => y.position);
    };

    return {
        yuanShen: {
            liuQin: yuanShenLiuQin,
            wuXing: yuanShenWuXing,
            positions: findPositions(yuanShenLiuQin),
        },
        jiShen: {
            liuQin: jiShenLiuQin,
            wuXing: jiShenWuXing,
            positions: findPositions(jiShenLiuQin),
        },
        chouShen: {
            liuQin: chouShenLiuQin,
            wuXing: chouShenWuXing,
            positions: findPositions(chouShenLiuQin),
        },
    };
}

// ============= 六冲卦判定 =============

/**
 * 判断是否为六冲卦
 * 
 * 六冲卦的判定规则：
 * - 初爻与四爻相冲
 * - 二爻与五爻相冲  
 * - 三爻与六爻相冲
 * 
 * 典型的六冲卦包括：
 * - 八纯卦（乾为天、坤为地、坎为水、离为火、震为雷、艮为山、巽为风、兑为泽）
 * - 天雷无妄、雷天大壮等
 */
export function checkLiuChongGua(fullYaos: FullYaoInfo[]): LiuChongGuaInfo {
    if (fullYaos.length !== 6) {
        return { isLiuChongGua: false };
    }

    // 获取各爻位的纳甲地支
    const getYaoZhi = (position: number): DiZhi | undefined => {
        return fullYaos.find(y => y.position === position)?.naJia;
    };

    const y1 = getYaoZhi(1);
    const y2 = getYaoZhi(2);
    const y3 = getYaoZhi(3);
    const y4 = getYaoZhi(4);
    const y5 = getYaoZhi(5);
    const y6 = getYaoZhi(6);

    if (!y1 || !y2 || !y3 || !y4 || !y5 || !y6) {
        return { isLiuChongGua: false };
    }

    // 检查三对是否都相冲
    const pair1Chong = LIU_CHONG[y1] === y4;  // 初爻与四爻
    const pair2Chong = LIU_CHONG[y2] === y5;  // 二爻与五爻
    const pair3Chong = LIU_CHONG[y3] === y6;  // 三爻与六爻

    if (pair1Chong && pair2Chong && pair3Chong) {
        return {
            isLiuChongGua: true,
            description: '六冲卦：主事散、应期急、变动大',
        };
    }

    // 检查部分相冲（提供提示但不算完全六冲卦）
    const chongCount = [pair1Chong, pair2Chong, pair3Chong].filter(Boolean).length;
    if (chongCount >= 2) {
        return {
            isLiuChongGua: false,
            description: `卦中有${chongCount}对爻相冲，事有变动`,
        };
    }

    return { isLiuChongGua: false };
}

// ============= 完整六爻分析主函数 =============

/**
 * 执行完整的六爻分析
 */
export function performFullAnalysis(
    yaos: Yao[],
    hexagramCode: string,
    changedCode: string | undefined,
    question: string,
    date: Date,
    options?: { yongShenTargets?: LiuQin[] }
): LiuYaoFullAnalysis {
    // 1. 计算干支时间
    const ganZhiTime = calculateGanZhiTime(date);
    const monthZhi = ganZhiTime.month.zhi;
    const dayZhi = ganZhiTime.day.zhi;

    // 2. 计算旬空（四柱）
    const kongWangByPillar = calculateKongWangByPillar(ganZhiTime);
    const kongWang = kongWangByPillar.day; // 六爻断卦判空亡以日旬空为主

    // 3. 获取宫位信息
    const palace = findPalace(hexagramCode);
    const gongElement = palace?.element || '土';
    const dayStem = ganZhiTime.day.gan;

    // 4. 计算基础爻信息
    const baseYaos = calculateFullYaoInfo(yaos, hexagramCode, dayStem);

    // 5. 计算扩展爻信息
    const fullYaos: FullYaoInfoExtended[] = baseYaos.map(yao => {
        const kongWangState = checkYaoKongWang(
            yao.naJia,
            kongWang,
            monthZhi,
            dayZhi,
            yao.change === 'changing'
        );
        const influence = getYaoInfluence(yao.naJia, monthZhi, dayZhi);
        const strength = calculateYaoStrength(
            yao.wuXing,
            monthZhi,
            dayZhi,
            yao.change === 'changing',
            kongWangState,
            influence
        );

        // 计算十二长生状态
        const changShengInfo = calculateYaoChangSheng(yao.wuXing, monthZhi);

        return {
            ...yao,
            isChanging: yao.change === 'changing',
            movementState: 'static',
            movementLabel: MOVEMENT_LABELS.static,
            kongWangState,
            influence,
            strength,
            changedYao: null,
            shenSha: [],
            changSheng: {
                stage: changShengInfo.stage,
                strength: changShengInfo.strength,
            },
        };
    });

    const shenShaContext = {
        yearStem: ganZhiTime.year.gan,
        yearBranch: ganZhiTime.year.zhi,
        monthStem: ganZhiTime.month.gan,
        monthBranch: ganZhiTime.month.zhi,
        dayStem: ganZhiTime.day.gan,
        dayBranch: ganZhiTime.day.zhi,
        hourStem: ganZhiTime.hour.gan,
        hourBranch: ganZhiTime.hour.zhi,
        kongWang: {
            xun: kongWang.xun,
            kongZhi: [kongWang.kongDizhi[0], kongWang.kongDizhi[1]] as [string, string],
        },
    };

    const changedYaoByPosition = new Map<number, ChangedYaoDetail>();

    // 6. 计算变爻信息（如果有变卦）
    let changedYaos: FullYaoInfoExtended[] | undefined;
    if (changedCode) {
        const changedBaseYaos = calculateFullYaoInfo(
            yaos.map((y) => ({
                ...y,
                change: 'stable',
                type: y.change === 'changing' ? (y.type === 1 ? 0 : 1) as YaoType : y.type,
            })),
            changedCode,
            dayStem
        );

        changedYaos = changedBaseYaos.map((yao, index) => {
            const originalYao = fullYaos[index];
            const kongWangState = checkYaoKongWang(
                yao.naJia,
                kongWang,
                monthZhi,
                dayZhi,
                false // 变卦的爻不再是动爻
            );
            const influence = getYaoInfluence(yao.naJia, monthZhi, dayZhi);
            const strength = calculateYaoStrength(
                yao.wuXing,
                monthZhi,
                dayZhi,
                false,
                kongWangState,
                influence
            );

            // 如果是动爻，计算变化分析
            let changeAnalysis: YaoChangeAnalysis | undefined;
            if (originalYao.change === 'changing') {
                changeAnalysis = analyzeYaoChange(
                    originalYao.naJia,
                    yao.naJia,
                    originalYao.wuXing,
                    yao.wuXing,
                    kongWang
                );
                // 将变化分析添加到原爻
                fullYaos[index] = {
                    ...fullYaos[index],
                    changeAnalysis,
                };
                changedYaoByPosition.set(originalYao.position, {
                    type: yao.type,
                    liuQin: yao.liuQin,
                    naJia: yao.naJia,
                    wuXing: yao.wuXing,
                    liuShen: originalYao.liuShen,
                    yaoCi: originalYao.yaoText,
                    relation: HUA_TYPE_LABELS[changeAnalysis.huaType] || '平',
                });
            }

            return {
                ...yao,
                isChanging: false,
                movementState: 'static',
                movementLabel: MOVEMENT_LABELS.static,
                kongWangState,
                influence,
                strength,
                changeAnalysis,
                changedYao: null,
                shenSha: [],
            };
        });
    }

    // 7. 分析三合局（需要在确定用神之前，以便后处理分数）
    const sanHeAnalysis = analyzeSanHe(baseYaos, changedYaos, monthZhi, dayZhi);

    // 7.5 三合局后处理：如果成局，给同五行的爻加分
    if (sanHeAnalysis.hasFullSanHe && sanHeAnalysis.fullSanHe) {
        const sanHeElement = sanHeAnalysis.fullSanHe.result;
        fullYaos.forEach(yao => {
            if (yao.wuXing === sanHeElement) {
                // 三合局成局，同五行爻大幅加分（+50），可超越月令限制
                const boostedScore = Math.min(100, yao.strength.score + 50);
                yao.strength.score = boostedScore;
                yao.strength.isStrong = boostedScore >= 50;
                yao.strength.factors.push(`三合${sanHeElement}局加持`);
            }
        });
    }

    for (const yao of fullYaos) {
        const movementState = getYaoMovementState(yao);
        const changedYao = yao.change === 'changing'
            ? (changedYaoByPosition.get(yao.position) || null)
            : null;
        yao.isChanging = yao.change === 'changing';
        yao.movementState = movementState;
        yao.movementLabel = MOVEMENT_LABELS[movementState];
        yao.changedYao = changedYao;
        yao.shenSha = calculateBranchShenSha(shenShaContext, yao.naJia);
    }

    const globalShenSha = calculateGlobalShenSha(shenShaContext);
    const selectedTargets = resolveYongShenTargets(options?.yongShenTargets, question);
    const rawYongShen = buildYongShenGroups(fullYaos, selectedTargets);

    const fuShenMap = new Map<string, FuShen>();
    const fuShenByTarget = new Map<LiuQin, FuShen[]>();
    for (const target of rawYongShen.map(group => group.targetLiuQin)) {
        const list = calculateFuShen(
            hexagramCode,
            baseYaos,
            target,
            gongElement,
            monthZhi,
            dayZhi,
            kongWang
        );
        fuShenByTarget.set(target, list);
        for (const item of list) {
            fuShenMap.set(`${item.liuQin}-${item.feiShenPosition}-${item.naJia}`, item);
        }
    }
    const fuShen = Array.from(fuShenMap.values());

    const yongShen = rawYongShen.map((group) => {
        if (group.selected.position) {
            return group;
        }
        const fallback = buildFuShenFallbackCandidate({
            target: group.targetLiuQin,
            fuShenList: fuShenByTarget.get(group.targetLiuQin),
            fullYaos,
            kongWang,
        });
        if (!fallback) {
            return group;
        }
        return {
            ...group,
            selected: stripCandidateScore(fallback),
        };
    });

    const shenSystemByYongShen = yongShen.map((group) => {
        if (!group.selected.position) {
            return {
                targetLiuQin: group.targetLiuQin,
                yuanShen: undefined,
                jiShen: undefined,
                chouShen: undefined,
            } satisfies ShenSystemByYongShen;
        }
        const legacyYongShen: YongShen = {
            type: group.targetLiuQin,
            position: group.selected.position,
            element: group.selected.element,
            strength: group.selected.strengthScore >= 70
                ? 'strong'
                : group.selected.strengthScore >= 40
                    ? 'moderate'
                    : 'weak',
            analysis: group.selected.factors.join('、'),
        };
        const system = calculateShenSystem(legacyYongShen, baseYaos, gongElement);
        return {
            targetLiuQin: group.targetLiuQin,
            ...system,
        } satisfies ShenSystemByYongShen;
    });

    const timeRecommendations = calculateTimeRecommendations(yongShen, date, dayZhi);

    const warnings: string[] = [];
    if (sanHeAnalysis.hasBanHe && sanHeAnalysis.banHe) {
        for (const banHe of sanHeAnalysis.banHe) {
            warnings.push(`${banHe.branches.join('')}${banHe.type === 'sheng' ? '生方' : '墓方'}半合${banHe.result}`);
        }
    }
    for (const group of yongShen) {
        if (!group.selected.isStrong) {
            warnings.push(`用神${group.targetLiuQin}力弱`);
        }
        if (group.selected.kongWangState === 'kong_static') {
            warnings.push(`用神${group.targetLiuQin}空亡`);
        }
    }

    // 12. 判断六冲卦
    const liuChongGuaInfo = checkLiuChongGua(baseYaos);

    return {
        ganZhiTime,
        kongWang,
        kongWangByPillar,
        fullYaos,
        yongShen,
        fuShen: fuShen.length > 0 ? fuShen : undefined,
        shenSystemByYongShen,
        globalShenSha,
        timeRecommendations,
        liuChongGuaInfo,
        sanHeAnalysis,
        warnings,
    };
}
