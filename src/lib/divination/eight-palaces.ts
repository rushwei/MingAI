/**
 * 八宫系统和纳甲配置
 *
 * 六爻占卜的核心数据结构，用于计算六亲、世应等
 */

import type { YaoType } from './liuyao';

// 五行类型
export type WuXing = '金' | '木' | '水' | '火' | '土';

// 八宫名称
export type PalaceName = '乾宫' | '坎宫' | '艮宫' | '震宫' | '巽宫' | '离宫' | '坤宫' | '兑宫';

// 地支
export const DIZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const;
export type DiZhi = typeof DIZHI[number];

// 地支五行
export const DIZHI_WUXING: Record<DiZhi, WuXing> = {
    '子': '水', '丑': '土', '寅': '木', '卯': '木',
    '辰': '土', '巳': '火', '午': '火', '未': '土',
    '申': '金', '酉': '金', '戌': '土', '亥': '水',
};

// 八宫结构
export interface Palace {
    name: PalaceName;
    element: WuXing;
    trigram: string;           // 八卦代码
    hexagrams: string[];       // 本宫8卦编码（按顺序：本卦→一世→二世→三世→四世→五世→游魂→归魂）
    hexagramNames: string[];   // 本宫8卦名称
    // 纳甲配置：阳爻/阴爻在各爻位的地支
    naJiaYang: DiZhi[];        // 阳爻纳甲 (1-6爻)
    naJiaYin: DiZhi[];         // 阴爻纳甲 (1-6爻)
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
        naJiaYang: ['子', '寅', '辰', '午', '申', '戌'],
        naJiaYin: ['丑', '亥', '酉', '未', '巳', '卯'],
    },
    '坎宫': {
        name: '坎宫',
        element: '水',
        trigram: '010',
        hexagrams: ['010010', '110010', '100010', '101010', '101110', '101100', '101000', '010000'],
        hexagramNames: ['坎为水', '水泽节', '水雷屯', '水火既济', '泽火革', '雷火丰', '地火明夷', '地水师'],
        naJiaYang: ['寅', '辰', '午', '申', '戌', '子'],
        naJiaYin: ['卯', '丑', '亥', '酉', '未', '巳'],
    },
    '艮宫': {
        name: '艮宫',
        element: '土',
        trigram: '001',
        hexagrams: ['001001', '101001', '111001', '110001', '110101', '110111', '110011', '001011'],
        hexagramNames: ['艮为山', '山火贲', '山天大畜', '山泽损', '火泽睽', '天泽履', '风泽中孚', '风山渐'],
        naJiaYang: ['辰', '午', '申', '戌', '子', '寅'],
        naJiaYin: ['巳', '卯', '丑', '亥', '酉', '未'],
    },
    '震宫': {
        name: '震宫',
        element: '木',
        trigram: '100',
        hexagrams: ['100100', '000100', '010100', '011100', '011000', '011010', '011110', '100110'],
        hexagramNames: ['震为雷', '雷地豫', '雷水解', '雷风恒', '地风升', '水风井', '泽风大过', '泽雷随'],
        naJiaYang: ['子', '寅', '辰', '午', '申', '戌'],
        naJiaYin: ['未', '巳', '卯', '丑', '亥', '酉'],
    },
    '巽宫': {
        name: '巽宫',
        element: '木',
        trigram: '011',
        hexagrams: ['011011', '111011', '101011', '100011', '100111', '100101', '100001', '011001'],
        hexagramNames: ['巽为风', '风天小畜', '风火家人', '风雷益', '天雷无妄', '火雷噬嗑', '山雷颐', '山风蛊'],
        naJiaYang: ['丑', '亥', '酉', '未', '巳', '卯'],
        naJiaYin: ['子', '寅', '辰', '午', '申', '戌'],
    },
    '离宫': {
        name: '离宫',
        element: '火',
        trigram: '101',
        hexagrams: ['101101', '001101', '011101', '010101', '010001', '010011', '010111', '101111'],
        hexagramNames: ['离为火', '火山旅', '火风鼎', '火水未济', '山水蒙', '风水涣', '天水讼', '天火同人'],
        naJiaYang: ['卯', '丑', '亥', '酉', '未', '巳'],
        naJiaYin: ['寅', '辰', '午', '申', '戌', '子'],
    },
    '坤宫': {
        name: '坤宫',
        element: '土',
        trigram: '000',
        hexagrams: ['000000', '100000', '110000', '111000', '111100', '111110', '111010', '000010'],
        hexagramNames: ['坤为地', '地雷复', '地泽临', '地天泰', '雷天大壮', '泽天夬', '水天需', '水地比'],
        naJiaYang: ['未', '巳', '卯', '丑', '亥', '酉'],
        naJiaYin: ['辰', '午', '申', '戌', '子', '寅'],
    },
    '兑宫': {
        name: '兑宫',
        element: '金',
        trigram: '110',
        hexagrams: ['110110', '010110', '000110', '001110', '001010', '001000', '001100', '110100'],
        hexagramNames: ['兑为泽', '泽水困', '泽地萃', '泽山咸', '水山蹇', '地山谦', '雷山小过', '雷泽归妹'],
        naJiaYang: ['巳', '卯', '丑', '亥', '酉', '未'],
        naJiaYin: ['午', '申', '戌', '子', '寅', '辰'],
    },
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
 * @param palace 所属宫
 * @param yaoPosition 爻位 (1-6)
 * @param yaoType 爻类型 (1=阳爻, 0=阴爻)
 */
export function getNaJia(palace: Palace, yaoPosition: number, yaoType: YaoType): DiZhi {
    const index = yaoPosition - 1;
    if (index < 0 || index > 5) {
        return '子'; // 默认值
    }
    return yaoType === 1 ? palace.naJiaYang[index] : palace.naJiaYin[index];
}

/**
 * 获取纳甲地支的五行
 */
export function getNaJiaWuXing(palace: Palace, yaoPosition: number, yaoType: YaoType): WuXing {
    const dizhi = getNaJia(palace, yaoPosition, yaoType);
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
