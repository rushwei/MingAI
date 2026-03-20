/**
 * Web 侧六爻兼容层
 *
 * 页面与交互只保留起卦辅助；
 * 核心排盘与断卦规则统一复用 core 的编译产物。
 */

import { XUN_KONG_TABLE as CORE_XUN_KONG_TABLE } from '@mingai/core/data/shensha-data';
import { HEXAGRAMS as CORE_HEXAGRAMS, type Hexagram as CoreHexagram } from '@mingai/core/data/hexagram-data';
import {
    calculateFullYaoInfo as calculateFullYaoInfoCore,
    calculateGanZhiTime as calculateGanZhiTimeCore,
    calculateKongWangByPillar as calculateKongWangByPillarCore,
    findHexagram as findHexagramCore,
    getNaJiaByHexagram,
    getShiYingPosition,
    hasInvalidYongShenTargets as hasInvalidYongShenTargetsCore,
    normalizeYongShenTargets as normalizeYongShenTargetsCore,
    performFullAnalysis as performFullAnalysisCore,
    KONG_WANG_LABELS,
    MOVEMENT_LABELS,
    WANG_SHUAI_LABELS,
    type ChangedYaoDetail,
    type DiZhi,
    type FullYaoInfo,
    type FullYaoInfoExtended,
    type FuShen,
    type GanZhiTime,
    type KongWang,
    type KongWangByPillar,
    type LiuQinType,
    type LiuYaoFullAnalysis,
    type ShenSystemByYongShen,
    type TianGan,
    type TimeRecommendation,
    type WuXing,
    type YaoChange,
    type YaoInput as CoreYao,
    type YaoStrength,
    type YaoType,
    type YongShenCandidate,
    type YongShenGroup,
} from '@mingai/core/liuyao-core';
import { getHexagramText } from '@/lib/divination/hexagram-texts';

export type {
    ChangedYaoDetail,
    DiZhi,
    FullYaoInfo,
    FullYaoInfoExtended,
    FuShen,
    GanZhiTime,
    KongWang,
    KongWangByPillar,
    LiuYaoFullAnalysis,
    ShenSystemByYongShen,
    TianGan,
    TimeRecommendation,
    WuXing,
    YaoChange,
    YaoStrength,
    YaoType,
    YongShenCandidate,
    YongShenGroup,
};
export type LiuQin = LiuQinType;
export type Hexagram = CoreHexagram;

export type Yao = CoreYao;

export interface Trigram {
    name: string;
    code: string;
    element: WuXing;
    nature: string;
}

export interface CoinTossResult {
    coins: [boolean, boolean, boolean];
    heads: number;
    sum: number;
    yaoType: YaoType;
    isChanging: boolean;
}

export interface DerivedHexagramInfo {
    name: string;
    guaCi?: string;
    xiangCi?: string;
}

export interface GuaShenInfo {
    branch: string;
    linePosition?: number;
    absent?: boolean;
}

const DERIVED_EARTHLY_BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

function buildDerivedHexagramInfo(code: string): DerivedHexagramInfo | undefined {
    const hexagram = findHexagramCore(code);
    if (!hexagram) return undefined;
    const text = getHexagramText(hexagram.name);
    return {
        name: hexagram.name,
        guaCi: text?.gua,
        xiangCi: text?.xiang,
    };
}

export function calculateDerivedHexagrams(hexagramCode: string): {
    nuclearHexagram?: DerivedHexagramInfo;
    oppositeHexagram?: DerivedHexagramInfo;
    reversedHexagram?: DerivedHexagramInfo;
} {
    if (!hexagramCode || hexagramCode.length !== 6) {
        return {};
    }

    const lowerTrigram = hexagramCode[1] + hexagramCode[2] + hexagramCode[3];
    const upperTrigram = hexagramCode[2] + hexagramCode[3] + hexagramCode[4];
    const nuclearCode = lowerTrigram + upperTrigram;
    const oppositeCode = hexagramCode.split('').map(c => (c === '1' ? '0' : '1')).join('');
    const reversedCode = hexagramCode.split('').reverse().join('');

    return {
        nuclearHexagram: buildDerivedHexagramInfo(nuclearCode),
        oppositeHexagram: buildDerivedHexagramInfo(oppositeCode),
        reversedHexagram: buildDerivedHexagramInfo(reversedCode),
    };
}

export function calculateGuaShen(hexagramCode: string): GuaShenInfo {
    const { shi } = getShiYingPosition(hexagramCode);
    const shiLineType = parseInt(hexagramCode[shi - 1], 10);
    const startIndex = shiLineType === 1 ? 0 : 6;
    const targetBranchIndex = (startIndex + (shi - 1)) % 12;
    const targetBranch = DERIVED_EARTHLY_BRANCHES[targetBranchIndex];

    for (let pos = 1; pos <= 6; pos += 1) {
        const naJia = getNaJiaByHexagram(hexagramCode, pos);
        if (naJia === targetBranch) {
            return { branch: targetBranch, linePosition: pos };
        }
    }

    return { branch: targetBranch, absent: true };
}

export interface DivinationResult {
    question: string;
    yongShenTargets: LiuQin[];
    yaos: Yao[];
    hexagram: Hexagram;
    changedHexagram?: Hexagram;
    changedLines: number[];
    createdAt: Date;
}

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

export const HEXAGRAMS: Hexagram[] = CORE_HEXAGRAMS;
export const XUN_KONG_TABLE: Record<string, [DiZhi, DiZhi]> = CORE_XUN_KONG_TABLE as Record<string, [DiZhi, DiZhi]>;
export { WANG_SHUAI_LABELS, KONG_WANG_LABELS, MOVEMENT_LABELS };

let _hexagramBrief: Record<string, string> | null = null;
function getHexagramBriefMap(): Record<string, string> {
    if (!_hexagramBrief) {
        _hexagramBrief = Object.fromEntries(
            CORE_HEXAGRAMS.map((item) => [item.name, `${item.upperTrigram}/${item.lowerTrigram}之象，主${item.nature}。`]),
        );
    }
    return _hexagramBrief;
}

export function findHexagram(input: string): Hexagram | undefined {
    return findHexagramCore(input);
}

export function tossCoin(): boolean {
    return Math.random() < 0.5;
}

export function resolveCoinTossResult(coins: [boolean, boolean, boolean]): CoinTossResult {
    const heads = coins.filter(Boolean).length;
    const sum = heads + 6;
    let yaoType: YaoType = 0;
    let isChanging = false;

    if (heads === 3) {
        yaoType = 1;
        isChanging = true;
    } else if (heads === 2) {
        yaoType = 0;
    } else if (heads === 1) {
        yaoType = 1;
    } else {
        yaoType = 0;
        isChanging = true;
    }

    return { coins, heads, sum, yaoType, isChanging };
}

export function tossThreeCoins(): CoinTossResult {
    const coins: [boolean, boolean, boolean] = [tossCoin(), tossCoin(), tossCoin()];
    return resolveCoinTossResult(coins);
}

export function divine(): { yaos: Yao[]; results: CoinTossResult[] } {
    const results: CoinTossResult[] = [];
    const yaos: Yao[] = [];
    for (let position = 1; position <= 6; position += 1) {
        const result = tossThreeCoins();
        results.push(result);
        yaos.push({
            type: result.yaoType,
            change: result.isChanging ? 'changing' : 'stable',
            position,
        });
    }
    return { yaos, results };
}

export function yaosTpCode(yaos: Yao[]): string {
    return yaos.map((item) => item.type.toString()).join('');
}

export function calculateChangedHexagram(yaos: Yao[]): { changedCode: string; changedLines: number[] } {
    const changedLines: number[] = [];
    const changedCode = yaos.map((item, index) => {
        if (item.change !== 'changing') return item.type.toString();
        changedLines.push(index + 1);
        return item.type === 1 ? '0' : '1';
    }).join('');
    return { changedCode, changedLines };
}

export function normalizeYongShenTargets(targets?: readonly unknown[]): LiuQin[] {
    if (!targets) return [];
    return normalizeYongShenTargetsCore(targets);
}

export function hasInvalidYongShenTargets(targets?: readonly unknown[]): boolean {
    return hasInvalidYongShenTargetsCore(targets);
}

export function calculateGanZhiTime(date: Date): GanZhiTime {
    return calculateGanZhiTimeCore(date);
}

export function calculateKongWangByPillar(ganZhiTime: GanZhiTime): KongWangByPillar {
    return calculateKongWangByPillarCore(ganZhiTime);
}

export function calculateFullYaoInfo(
    yaos: Yao[],
    hexagramCode: string,
    dayStem: TianGan,
): FullYaoInfo[] {
    return calculateFullYaoInfoCore(yaos, hexagramCode, dayStem);
}

export function performFullAnalysis(
    yaos: Yao[],
    hexagramCode: string,
    changedCode: string | undefined,
    question: string,
    date: Date,
    options?: { yongShenTargets?: LiuQin[] },
): LiuYaoFullAnalysis {
    return performFullAnalysisCore(
        yaos,
        hexagramCode,
        changedCode,
        question,
        date,
        { yongShenTargets: options?.yongShenTargets ?? [] },
    );
}

export function getHexagramBrief(name: string): string {
    return getHexagramBriefMap()[name] || '此卦宜结合问题、用神与动变条件综合判断。';
}

export function getLiuShenMeaning(liuShen: string): string {
    const meanings: Record<string, string> = {
        青龙: '主喜庆、贵人、顺势之助。',
        朱雀: '主言语、文书、消息与争辩。',
        勾陈: '主迟滞、牵连、田土与反复。',
        螣蛇: '主虚惊、疑虑、反复与牵绊。',
        白虎: '主压力、伤病、是非与急事。',
        玄武: '主隐情、暗事、拖延与虚实难辨。',
    };
    return meanings[liuShen] || '需结合六亲、旺衰与动变判断。';
}

export function getLiuQinMeaning(liuQin: LiuQin): string {
    const meanings: Record<LiuQin, string> = {
        父母: '文书、证件、长辈、学业、房屋车辆',
        兄弟: '同辈、合作、竞争、分财',
        子孙: '子女后辈、成果、医药、解忧',
        妻财: '钱财、资源、交易、经营、男测感情线索',
        官鬼: '事业、规则、压力、风险、疾病、女测感情线索',
    };
    return meanings[liuQin];
}
