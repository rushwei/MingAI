import type { QimenOutput as CoreQimenOutput } from '@mingai/core';
import { renderQimenCanonicalText } from '@mingai/core/text';

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

function toCoreQimenOutput(result: QimenOutput & { question?: string }): CoreQimenOutput {
    return {
        dateInfo: {
            solarDate: result.solarDate,
            lunarDate: result.lunarDate,
            solarTerm: result.solarTerm,
            solarTermRange: result.solarTermRange,
        },
        siZhu: {
            year: result.fourPillars.year,
            month: result.fourPillars.month,
            day: result.fourPillars.day,
            hour: result.fourPillars.hour,
        },
        dunType: result.dunType,
        juNumber: result.juNumber,
        yuan: result.yuan,
        xunShou: result.xunShou,
        zhiFu: { star: result.zhiFu, palace: result.zhiFuPalace },
        zhiShi: { gate: result.zhiShi, palace: result.zhiShiPalace },
        panType: result.panTypeLabel,
        juMethod: result.juMethodLabel,
        palaces: result.palaces.map((palace) => ({
            palaceIndex: palace.palaceNumber,
            palaceName: palace.palaceName,
            direction: palace.direction,
            earthStem: palace.earthStem,
            heavenStem: palace.heavenStem,
            star: palace.star,
            gate: palace.gate,
            deity: palace.god,
            formations: palace.patterns,
            isKongWang: palace.isEmpty,
            isYiMa: palace.isHorseStar,
            isRuMu: palace.isRuMu,
            element: palace.element,
            earthStemElement: palace.earthStemElement,
            heavenStemElement: palace.heavenStemElement,
            starElement: palace.starElement,
            gateElement: palace.gateElement,
            stemWangShuai: palace.stemWangShuai,
            elementState: palace.elementState,
        })),
        kongWang: result.kongWang,
        yiMa: result.yiMa,
        globalFormations: result.globalFormations,
        question: result.question,
        monthPhase: result.monthPhase,
    };
}

export function generateQimenResultText(result: QimenOutput & { question?: string }): string {
    return renderQimenCanonicalText(toCoreQimenOutput(result));
}
