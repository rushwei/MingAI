/**
 * 奇门遁甲薄封装层
 *
 * 从 @mingai/core 导入核心排盘逻辑，
 * 将 core 输出转换为前端所需的数据结构。
 */

import {
    handleQimenCalculate as coreCalculate,
    type QimenOutput as CoreOutput,
    type QimenInput as CoreInput,
} from '@mingai/core/qimen';

// ── 前端类型定义 ──

export interface QimenInput {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    timezone?: string;
    question?: string;
    panType: 'zhuan';
    juMethod: 'chaibu' | 'maoshan';
    zhiFuJiGong: 'jiLiuYi' | 'jiWuGong';
}

export interface QimenPalaceInfo {
    palaceNumber: number;
    palaceName: string;
    direction: string;
    element: string;
    earthStem: string;
    heavenStem: string;
    star: string;
    gate: string;
    god: string;
    patterns: string[];
    isEmpty: boolean;
    isHorseStar: boolean;
    isRuMu: boolean;
    earthStemElement: string;
    heavenStemElement: string;
    starElement: string;
    gateElement: string;
    stemWangShuai?: string;
    elementState?: string;
}

export interface QimenOutput {
    solarDate: string;
    lunarDate: string;
    fourPillars: { year: string; month: string; day: string; hour: string };
    xunShou: string;
    dunType: 'yang' | 'yin';
    juNumber: number;
    yuan: string;
    zhiFu: string;
    zhiFuPalace: number;
    zhiShi: string;
    zhiShiPalace: number;
    solarTerm: string;
    solarTermRange: string;
    panTypeLabel: string;
    juMethodLabel: string;
    palaces: QimenPalaceInfo[];
    monthPhase: Record<string, string>;
    kongWang: {
        dayKong: { branches: string[]; palaces: number[] };
        hourKong: { branches: string[]; palaces: number[] };
    };
    yiMa: { branch: string; palace: number };
    globalFormations: string[];
}

// ── 天干五行 ──

const STEM_ELEMENT: Record<string, string> = {
    '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土',
    '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水',
};

// ── 月令旺衰 ──

const SEASON_WANG_SHUAI: Record<string, Record<string, string>> = {
    '春': { '木': '旺', '火': '相', '水': '休', '金': '囚', '土': '死' },
    '夏': { '火': '旺', '土': '相', '木': '休', '水': '囚', '金': '死' },
    '四季土': { '土': '旺', '金': '相', '火': '休', '木': '囚', '水': '死' },
    '秋': { '金': '旺', '水': '相', '土': '休', '火': '囚', '木': '死' },
    '冬': { '水': '旺', '木': '相', '金': '休', '土': '囚', '火': '死' },
};

function getSeason(monthBranch: string): string {
    if (['寅', '卯'].includes(monthBranch)) return '春';
    if (['巳', '午'].includes(monthBranch)) return '夏';
    if (['辰', '戌', '丑', '未'].includes(monthBranch)) return '四季土';
    if (['申', '酉'].includes(monthBranch)) return '秋';
    return '冬';
}

function computeMonthPhase(monthPillar: string): Record<string, string> {
    const monthBranch = monthPillar[1];
    const season = getSeason(monthBranch);
    const phaseMap = SEASON_WANG_SHUAI[season] || {};
    const result: Record<string, string> = {};
    for (const [stem, element] of Object.entries(STEM_ELEMENT)) {
        result[stem] = phaseMap[element] || '';
    }
    return result;
}

// ── 核心排盘 + 转换 ──

export async function handleQimenCalculate(input: QimenInput): Promise<QimenOutput> {
    const coreInput: CoreInput = {
        year: input.year,
        month: input.month,
        day: input.day,
        hour: input.hour,
        minute: input.minute,
        timezone: input.timezone,
        question: input.question,
        juMethod: input.juMethod,
        zhiFuJiGong: input.zhiFuJiGong === 'jiWuGong' ? 'ji_wugong' : 'ji_liuyi',
    };

    const core: CoreOutput = await coreCalculate(coreInput);

    const monthPhase = computeMonthPhase(core.siZhu.month);

    const palaces: QimenPalaceInfo[] = core.palaces.map((p) => ({
        palaceNumber: p.palaceIndex,
        palaceName: p.palaceName,
        direction: p.direction,
        element: p.element,
        earthStem: p.earthStem,
        heavenStem: p.heavenStem,
        star: p.star,
        gate: p.gate,
        god: p.deity,
        patterns: p.formations,
        isEmpty: p.isKongWang ?? false,
        isHorseStar: p.isYiMa ?? false,
        isRuMu: p.isRuMu ?? false,
        earthStemElement: STEM_ELEMENT[p.earthStem] || '',
        heavenStemElement: STEM_ELEMENT[p.heavenStem] || '',
        starElement: p.starElement,
        gateElement: p.gateElement,
        stemWangShuai: p.stemWangShuai,
        elementState: p.elementState,
    }));

    return {
        solarDate: core.dateInfo.solarDate,
        lunarDate: core.dateInfo.lunarDate,
        fourPillars: core.siZhu,
        xunShou: core.xunShou,
        dunType: core.dunType,
        juNumber: core.juNumber,
        yuan: core.yuan,
        zhiFu: core.zhiFu.star,
        zhiFuPalace: core.zhiFu.palace,
        zhiShi: core.zhiShi.gate,
        zhiShiPalace: core.zhiShi.palace,
        solarTerm: core.dateInfo.solarTerm,
        solarTermRange: core.dateInfo.solarTermRange || '',
        panTypeLabel: core.panType,
        juMethodLabel: core.juMethod,
        palaces,
        monthPhase,
        kongWang: core.kongWang,
        yiMa: core.yiMa,
        globalFormations: core.globalFormations,
    };
}
