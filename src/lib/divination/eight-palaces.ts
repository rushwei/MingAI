/**
 * 八宫系统和纳甲配置
 *
 * 六爻占卜的核心数据结构，用于计算六亲、世应等
 */

import { TRIGRAM_NA_JIA, type WuXing } from '@mingai/mcp-core/liuyao-core';
import { BRANCH_ELEMENTS } from '@/lib/divination/bazi';

// 八宫名称
export type PalaceName = '乾宫' | '坎宫' | '艮宫' | '震宫' | '巽宫' | '离宫' | '坤宫' | '兑宫';

// 地支
export const DIZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const;
export type DiZhi = typeof DIZHI[number];

// 地支五行（复用 bazi.ts 的 BRANCH_ELEMENTS）
export const DIZHI_WUXING: Record<DiZhi, WuXing> = BRANCH_ELEMENTS;

// 八宫结构
export interface Palace {
    name: PalaceName;
    element: WuXing;
    trigram: string;           // 八卦代码
    hexagrams: string[];       // 本宫8卦编码（按顺序：本卦→一世→二世→三世→四世→五世→游魂→归魂）
    hexagramNames: string[];   // 本宫8卦名称
}

/**
 * 八宫数据
 * 每宫包含8个卦，按照：本卦→一世→二世→三世→四世→五世→游魂→归魂 顺序
 *
 * 变化规则：
 * - 一世：变初爻（从本卦）
 * - 二世：变二爻（从一世）
 * - 三世：变三爻（从二世）
 * - 四世：变四爻（从三世）
 * - 五世：变五爻（从四世）
 * - 游魂：变四爻（从五世，即恢复四爻）
 * - 归魂：恢复下卦（内卦）为本宫八卦
 *
 * 卦码格式：line1-line2-line3-line4-line5-line6（从下到上）
 * 即：[下卦三位][上卦三位]
 */
export const EIGHT_PALACES: Record<PalaceName, Palace> = {
    '乾宫': {
        name: '乾宫',
        element: '金',
        trigram: '111',
        hexagrams: ['111111', '011111', '001111', '000111', '000011', '000001', '000101', '111101'],
        hexagramNames: ['乾为天', '天风姤', '天山遯', '天地否', '风地观', '山地剥', '火地晋', '火天大有'],
    },
    '坎宫': {
        name: '坎宫',
        element: '水',
        trigram: '010',
        hexagrams: ['010010', '110010', '100010', '101010', '101110', '101100', '101000', '010000'],
        hexagramNames: ['坎为水', '水泽节', '水雷屯', '水火既济', '泽火革', '雷火丰', '地火明夷', '地水师'],
    },
    '艮宫': {
        name: '艮宫',
        element: '土',
        trigram: '001',
        hexagrams: ['001001', '101001', '111001', '110001', '110101', '110111', '110011', '001011'],
        hexagramNames: ['艮为山', '山火贲', '山天大畜', '山泽损', '火泽睽', '天泽履', '风泽中孚', '风山渐'],
    },
    '震宫': {
        name: '震宫',
        element: '木',
        trigram: '100',
        hexagrams: ['100100', '000100', '010100', '011100', '011000', '011010', '011110', '100110'],
        hexagramNames: ['震为雷', '雷地豫', '雷水解', '雷风恒', '地风升', '水风井', '泽风大过', '泽雷随'],
    },
    '巽宫': {
        name: '巽宫',
        element: '木',
        trigram: '011',
        hexagrams: ['011011', '111011', '101011', '100011', '100111', '100101', '100001', '011001'],
        hexagramNames: ['巽为风', '风天小畜', '风火家人', '风雷益', '天雷无妄', '火雷噬嗑', '山雷颐', '山风蛊'],
    },
    '离宫': {
        name: '离宫',
        element: '火',
        trigram: '101',
        hexagrams: ['101101', '001101', '011101', '010101', '010001', '010011', '010111', '101111'],
        hexagramNames: ['离为火', '火山旅', '火风鼎', '火水未济', '山水蒙', '风水涣', '天水讼', '天火同人'],
    },
    '坤宫': {
        name: '坤宫',
        element: '土',
        trigram: '000',
        hexagrams: ['000000', '100000', '110000', '111000', '111100', '111110', '111010', '000010'],
        hexagramNames: ['坤为地', '地雷复', '地泽临', '地天泰', '雷天大壮', '泽天夬', '水天需', '水地比'],
    },
    '兑宫': {
        name: '兑宫',
        element: '金',
        trigram: '110',
        hexagrams: ['110110', '010110', '000110', '001110', '001010', '001000', '001100', '110100'],
        hexagramNames: ['兑为泽', '泽水困', '泽地萃', '泽山咸', '水山蹇', '地山谦', '雷山小过', '雷泽归妹'],
    },
};

const TRIGRAM_CODE_TO_NAME: Record<string, string> = {
    '111': '乾', '010': '坎', '001': '艮', '100': '震',
    '011': '巽', '101': '离', '000': '坤', '110': '兑',
};

/**
 * 世应位置表
 * 索引0-7对应：本卦(0)→一世(1)→二世(2)→三世(3)→四世(4)→五世(5)→游魂(6)→归魂(7)
 * 值为 [世爻位置, 应爻位置]
 */
export const SHI_YING_POSITIONS: [number, number][] = [
    [6, 3], // 本卦：世在六爻，应在三爻
    [1, 4], // 一世：世在初爻，应在四爻
    [2, 5], // 二世：世在二爻，应在五爻
    [3, 6], // 三世：世在三爻，应在六爻
    [4, 1], // 四世：世在四爻，应在初爻
    [5, 2], // 五世：世在五爻，应在二爻
    [4, 1], // 游魂：世在四爻，应在初爻
    [3, 6], // 归魂：世在三爻，应在六爻
];

/**
 * 查找卦所属宫
 */
export function findPalace(hexagramCode: string): Palace | undefined {
    for (const palace of Object.values(EIGHT_PALACES)) {
        if (palace.hexagrams.includes(hexagramCode)) {
            return palace;
        }
    }
    return undefined;
}

/**
 * 获取卦在本宫的位置（0-7）
 */
export function getHexagramPositionInPalace(hexagramCode: string): number {
    const palace = findPalace(hexagramCode);
    if (!palace) return -1;
    return palace.hexagrams.indexOf(hexagramCode);
}

/**
 * 获取世应位置
 */
export function getShiYingPosition(hexagramCode: string): { shi: number; ying: number } {
    const position = getHexagramPositionInPalace(hexagramCode);
    if (position === -1) {
        // 默认返回本卦的世应位置
        return { shi: 6, ying: 3 };
    }
    const [shi, ying] = SHI_YING_POSITIONS[position];
    return { shi, ying };
}

/**
 * 获取纳甲地支
 * 说明：
 * - 六爻纳甲按上下卦固定取值，不按单爻阴阳切换。
 * - 1-3 爻取下卦纳甲，4-6 爻取上卦纳甲。
 */
export function getNaJia(hexagramCode: string, yaoPosition: number): DiZhi {
    if (hexagramCode.length !== 6 || yaoPosition < 1 || yaoPosition > 6) {
        return '子';
    }
    const isLower = yaoPosition <= 3;
    const trigramCode = isLower ? hexagramCode.slice(0, 3) : hexagramCode.slice(3, 6);
    const trigramName = TRIGRAM_CODE_TO_NAME[trigramCode];
    const trigram = trigramName ? TRIGRAM_NA_JIA[trigramName] : undefined;
    if (!trigram) {
        return '子';
    }
    const index = isLower ? yaoPosition - 1 : yaoPosition - 4;
    return trigram[isLower ? 'lower' : 'upper'][index];
}

/**
 * 获取纳甲地支的五行
 */
export function getNaJiaWuXing(hexagramCode: string, yaoPosition: number): WuXing {
    const dizhi = getNaJia(hexagramCode, yaoPosition);
    return DIZHI_WUXING[dizhi];
}

/**
 * 获取宫的五行
 */
export function getPalaceElement(hexagramCode: string): WuXing {
    const palace = findPalace(hexagramCode);
    return palace?.element || '土';
}

/**
 * 判断卦的类型（本卦/一世/二世等）
 */
export function getHexagramType(hexagramCode: string): string {
    const position = getHexagramPositionInPalace(hexagramCode);
    const types = ['本卦', '一世卦', '二世卦', '三世卦', '四世卦', '五世卦', '游魂卦', '归魂卦'];
    return types[position] || '未知';
}
